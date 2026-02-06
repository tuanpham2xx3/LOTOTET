import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { RoomState } from '@lototet/shared';

/**
 * Redis Service for managing game state across multiple server instances.
 * Uses Redis Sentinel for high availability.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client!: Redis;
    private readonly keyPrefix = 'lototet:';

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        await this.disconnect();
    }

    /**
     * Connect to Redis (Sentinel or Standalone)
     */
    private async connect(): Promise<void> {
        const sentinels = process.env.REDIS_SENTINELS;

        if (sentinels) {
            // Sentinel mode
            const sentinelList = sentinels.split(',').map(s => {
                const [host, port] = s.trim().split(':');
                return { host, port: parseInt(port) || 26379 };
            });

            this.client = new Redis({
                sentinels: sentinelList,
                name: process.env.REDIS_MASTER_NAME || 'mymaster',
                password: process.env.REDIS_PASSWORD,
                sentinelPassword: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB || '0'),
                lazyConnect: true,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 100, 3000);
                    return delay;
                },
            });

            this.logger.log(`🔗 Connecting to Redis Sentinel: ${sentinels}`);
        } else {
            // Standalone mode for development
            this.client = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB || '0'),
                lazyConnect: true,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 100, 3000);
                    return delay;
                },
            });

            this.logger.log(`🔗 Connecting to Redis Standalone: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
        }

        // Event handlers
        this.client.on('connect', () => {
            this.logger.log('✅ Redis connected');
        });

        this.client.on('error', (err) => {
            this.logger.error('❌ Redis error:', err.message);
        });

        this.client.on('close', () => {
            this.logger.warn('⚠️ Redis connection closed');
        });

        this.client.on('reconnecting', () => {
            this.logger.log('🔄 Redis reconnecting...');
        });

        try {
            await this.client.connect();
        } catch (error) {
            this.logger.error('❌ Failed to connect to Redis:', error);
            // Don't throw - allow app to start without Redis for development
        }
    }

    /**
     * Disconnect from Redis
     */
    private async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.logger.log('🔌 Redis disconnected');
        }
    }

    /**
     * Check if Redis is connected
     */
    isConnected(): boolean {
        return this.client?.status === 'ready';
    }

    // ==========================================
    // Rate Limiter Operations
    // ==========================================

    /**
     * Check and increment rate limit counter
     * Uses sliding window counter pattern with Redis INCR + EXPIRE
     * 
     * @param identifier - Unique identifier (e.g., IP address, player ID)
     * @param eventType - Type of event being rate limited
     * @param limit - Maximum requests allowed in window
     * @param windowSeconds - Time window in seconds
     * @returns Object with allowed status, current count, and retry time if blocked
     */
    async checkRateLimit(
        identifier: string,
        eventType: string,
        limit: number,
        windowSeconds: number,
    ): Promise<{ allowed: boolean; count: number; retryAfter?: number }> {
        if (!this.isConnected()) {
            // Redis not available, allow request (fallback)
            this.logger.warn(`Redis not connected, skipping rate limit for ${eventType}`);
            return { allowed: true, count: 0 };
        }

        try {
            // Create time-based window key for sliding window
            const windowKey = Math.floor(Date.now() / (windowSeconds * 1000));
            const key = `${this.keyPrefix}ratelimit:${identifier}:${eventType}:${windowKey}`;

            // Increment counter and get new value
            const count = await this.client.incr(key);

            // Set expiry on first request (when count is 1)
            if (count === 1) {
                // Add extra second to ensure key doesn't expire mid-window
                await this.client.expire(key, windowSeconds + 1);
            }

            if (count > limit) {
                // Calculate approximate retry time
                const retryAfter = windowSeconds;
                return { allowed: false, count, retryAfter };
            }

            return { allowed: true, count };
        } catch (error) {
            this.logger.error(`Rate limit check failed for ${eventType}:`, error);
            // On error, allow request to prevent blocking legitimate users
            return { allowed: true, count: 0 };
        }
    }

    // ==========================================
    // Room Operations
    // ==========================================

    /**
     * Get room by ID
     */
    async getRoom(roomId: string): Promise<RoomState | null> {
        try {
            const data = await this.client.get(`${this.keyPrefix}room:${roomId}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            this.logger.error(`Failed to get room ${roomId}:`, error);
            return null;
        }
    }

    /**
     * Save room state
     */
    async setRoom(roomId: string, room: RoomState): Promise<void> {
        try {
            const pipeline = this.client.pipeline();
            pipeline.set(`${this.keyPrefix}room:${roomId}`, JSON.stringify(room));
            pipeline.sadd(`${this.keyPrefix}rooms:active`, roomId);
            await pipeline.exec();
        } catch (error) {
            this.logger.error(`Failed to set room ${roomId}:`, error);
            throw error;
        }
    }

    /**
     * Delete room
     */
    async deleteRoom(roomId: string): Promise<void> {
        try {
            const pipeline = this.client.pipeline();
            pipeline.del(`${this.keyPrefix}room:${roomId}`);
            pipeline.srem(`${this.keyPrefix}rooms:active`, roomId);
            pipeline.del(`${this.keyPrefix}room:${roomId}:server`); // Also remove server mapping
            await pipeline.exec();
        } catch (error) {
            this.logger.error(`Failed to delete room ${roomId}:`, error);
            throw error;
        }
    }

    // ==========================================
    // Room-to-Server Registry (for Load Balancing)
    // ==========================================

    /**
     * Register which server hosts a room (for load balancing)
     * @param roomId - Room ID
     * @param serverUrl - Public URL of the server hosting this room
     */
    async registerRoomServer(roomId: string, serverUrl: string): Promise<void> {
        try {
            await this.client.set(
                `${this.keyPrefix}room:${roomId}:server`,
                serverUrl,
                'EX',
                86400 // 24 hours TTL (room should be closed before this)
            );
            this.logger.debug(`Registered room ${roomId} on server ${serverUrl}`);
        } catch (error) {
            this.logger.error(`Failed to register room server for ${roomId}:`, error);
        }
    }

    /**
     * Unregister room from server (when room is deleted)
     * @param roomId - Room ID
     */
    async unregisterRoomServer(roomId: string): Promise<void> {
        try {
            await this.client.del(`${this.keyPrefix}room:${roomId}:server`);
            this.logger.debug(`Unregistered room ${roomId} from server`);
        } catch (error) {
            this.logger.error(`Failed to unregister room server for ${roomId}:`, error);
        }
    }

    /**
     * Get which server hosts a specific room
     * @param roomId - Room ID
     * @returns Server URL or null if room not found
     */
    async getRoomServer(roomId: string): Promise<string | null> {
        try {
            return await this.client.get(`${this.keyPrefix}room:${roomId}:server`);
        } catch (error) {
            this.logger.error(`Failed to get room server for ${roomId}:`, error);
            return null;
        }
    }

    /**
     * Get all active room IDs
     */
    async getAllActiveRoomIds(): Promise<string[]> {
        try {
            return await this.client.smembers(`${this.keyPrefix}rooms:active`);
        } catch (error) {
            this.logger.error('Failed to get active room IDs:', error);
            return [];
        }
    }

    /**
     * Get all rooms (for cleanup service)
     */
    async getAllRooms(): Promise<Map<string, RoomState>> {
        const rooms = new Map<string, RoomState>();
        try {
            const roomIds = await this.getAllActiveRoomIds();
            for (const roomId of roomIds) {
                const room = await this.getRoom(roomId);
                if (room) {
                    rooms.set(roomId, room);
                }
            }
        } catch (error) {
            this.logger.error('Failed to get all rooms:', error);
        }
        return rooms;
    }

    // ==========================================
    // Socket Mapping Operations
    // ==========================================

    /**
     * Map socket ID to room ID
     */
    async setSocketRoom(socketId: string, roomId: string): Promise<void> {
        try {
            // Set with 1 hour TTL (auto-cleanup for disconnected sockets)
            await this.client.set(
                `${this.keyPrefix}socket:${socketId}`,
                roomId,
                'EX',
                3600
            );
        } catch (error) {
            this.logger.error(`Failed to set socket mapping ${socketId}:`, error);
        }
    }

    /**
     * Get room ID by socket ID
     */
    async getSocketRoom(socketId: string): Promise<string | null> {
        try {
            return await this.client.get(`${this.keyPrefix}socket:${socketId}`);
        } catch (error) {
            this.logger.error(`Failed to get socket room ${socketId}:`, error);
            return null;
        }
    }

    /**
     * Remove socket mapping
     */
    async deleteSocket(socketId: string): Promise<void> {
        try {
            await this.client.del(`${this.keyPrefix}socket:${socketId}`);
        } catch (error) {
            this.logger.error(`Failed to delete socket ${socketId}:`, error);
        }
    }

    // ==========================================
    // Room Activity Tracking
    // ==========================================

    /**
     * Update room's last activity timestamp
     */
    async updateActivity(roomId: string): Promise<void> {
        const room = await this.getRoom(roomId);
        if (room) {
            room.lastActivityAt = Date.now();
            await this.setRoom(roomId, room);
        }
    }

    /**
     * Set host disconnected timestamp
     */
    async setHostDisconnected(roomId: string): Promise<void> {
        const room = await this.getRoom(roomId);
        if (room) {
            room.hostDisconnectedAt = Date.now();
            await this.setRoom(roomId, room);
        }
    }

    /**
     * Clear host disconnected timestamp
     */
    async clearHostDisconnected(roomId: string): Promise<void> {
        const room = await this.getRoom(roomId);
        if (room) {
            room.hostDisconnectedAt = undefined;
            await this.setRoom(roomId, room);
        }
    }

    // ==========================================
    // Pub/Sub for Socket.IO Adapter
    // ==========================================

    /**
     * Get the Redis client for Socket.IO adapter
     */
    getClient(): Redis {
        return this.client;
    }

    /**
     * Create a duplicate client for pub/sub
     */
    createDuplicateClient(): Redis {
        return this.client.duplicate();
    }

    // ==========================================
    // Utility Methods
    // ==========================================

    /**
     * Check if room exists
     */
    async roomExists(roomId: string): Promise<boolean> {
        try {
            const exists = await this.client.exists(`${this.keyPrefix}room:${roomId}`);
            return exists === 1;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get room count
     */
    async getRoomCount(): Promise<number> {
        try {
            return await this.client.scard(`${this.keyPrefix}rooms:active`);
        } catch (error) {
            return 0;
        }
    }

    // ==========================================
    // Distributed Lock Operations
    // ==========================================

    /**
     * Acquire a lock for a room (using Redis SETNX pattern)
     * @param roomId - Room ID to lock
     * @param lockId - Unique identifier for this lock holder
     * @param ttlMs - Lock expiration time in milliseconds (default 5000ms)
     * @returns true if lock acquired, false otherwise
     */
    async acquireLock(roomId: string, lockId: string, ttlMs: number = 5000): Promise<boolean> {
        try {
            const lockKey = `${this.keyPrefix}lock:room:${roomId}`;
            // SET NX PX - set if not exists with expiration
            const result = await this.client.set(lockKey, lockId, 'PX', ttlMs, 'NX');
            return result === 'OK';
        } catch (error) {
            this.logger.error(`Failed to acquire lock for room ${roomId}:`, error);
            return false;
        }
    }

    /**
     * Release a lock (only if we own it)
     * @param roomId - Room ID to unlock
     * @param lockId - Lock holder ID (must match the one used to acquire)
     * @returns true if lock released, false if we didn't own it
     */
    async releaseLock(roomId: string, lockId: string): Promise<boolean> {
        try {
            const lockKey = `${this.keyPrefix}lock:room:${roomId}`;
            // Use Lua script to ensure atomic check-and-delete
            const script = `
                if redis.call("get", KEYS[1]) == ARGV[1] then
                    return redis.call("del", KEYS[1])
                else
                    return 0
                end
            `;
            const result = await this.client.eval(script, 1, lockKey, lockId);
            return result === 1;
        } catch (error) {
            this.logger.error(`Failed to release lock for room ${roomId}:`, error);
            return false;
        }
    }

    /**
     * Execute a function with room lock
     * Automatically acquires and releases lock, with retry logic
     * @param roomId - Room ID to lock
     * @param fn - Function to execute while holding the lock
     * @param maxRetries - Maximum retry attempts (default 10)
     * @param retryDelayMs - Delay between retries in ms (default 50)
     */
    async withLock<T>(
        roomId: string,
        fn: () => Promise<T>,
        maxRetries: number = 10,
        retryDelayMs: number = 50,
    ): Promise<T> {
        const lockId = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        let acquired = false;
        let attempts = 0;

        // Try to acquire lock with retries
        while (!acquired && attempts < maxRetries) {
            acquired = await this.acquireLock(roomId, lockId);
            if (!acquired) {
                attempts++;
                await this.delay(retryDelayMs);
            }
        }

        if (!acquired) {
            throw new Error(`Failed to acquire lock for room ${roomId} after ${maxRetries} attempts`);
        }

        try {
            // Execute the function while holding the lock
            return await fn();
        } finally {
            // Always release the lock
            await this.releaseLock(roomId, lockId);
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==========================================
    // Stats Tracking (Admin Dashboard)
    // ==========================================

    private getDateKey(): string {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    }

    private getMonthKey(): string {
        return new Date().toISOString().slice(0, 7); // YYYY-MM
    }

    /**
     * Increment total connections counter
     */
    async incrementTotalConnections(): Promise<void> {
        try {
            const pipeline = this.client.pipeline();
            pipeline.incr(`${this.keyPrefix}stats:total_connections`);
            pipeline.hincrby(`${this.keyPrefix}stats:daily:${this.getDateKey()}`, 'connections', 1);
            pipeline.hincrby(`${this.keyPrefix}stats:monthly:${this.getMonthKey()}`, 'connections', 1);
            await pipeline.exec();
        } catch (error) {
            this.logger.error('Failed to increment connections:', error);
        }
    }

    /**
     * Increment total rooms created counter
     */
    async incrementTotalRoomsCreated(): Promise<void> {
        try {
            const pipeline = this.client.pipeline();
            pipeline.incr(`${this.keyPrefix}stats:total_rooms_created`);
            pipeline.hincrby(`${this.keyPrefix}stats:daily:${this.getDateKey()}`, 'rooms_created', 1);
            pipeline.hincrby(`${this.keyPrefix}stats:monthly:${this.getMonthKey()}`, 'rooms_created', 1);
            await pipeline.exec();
        } catch (error) {
            this.logger.error('Failed to increment rooms created:', error);
        }
    }

    /**
     * Increment total games played counter
     */
    async incrementTotalGamesPlayed(): Promise<void> {
        try {
            const pipeline = this.client.pipeline();
            pipeline.incr(`${this.keyPrefix}stats:total_games_played`);
            pipeline.hincrby(`${this.keyPrefix}stats:daily:${this.getDateKey()}`, 'games_played', 1);
            pipeline.hincrby(`${this.keyPrefix}stats:monthly:${this.getMonthKey()}`, 'games_played', 1);
            await pipeline.exec();
        } catch (error) {
            this.logger.error('Failed to increment games played:', error);
        }
    }

    // ==========================================
    // Server Health Tracking
    // ==========================================

    /**
     * Update server heartbeat (call every 30s)
     */
    async updateServerHeartbeat(serverId: string): Promise<void> {
        try {
            await this.client.set(
                `${this.keyPrefix}server:${serverId}:heartbeat`,
                Date.now().toString(),
                'EX',
                60 // Expires in 60 seconds if not updated
            );
            await this.client.sadd(`${this.keyPrefix}servers:active`, serverId);
        } catch (error) {
            this.logger.error(`Failed to update heartbeat for ${serverId}:`, error);
        }
    }

    /**
     * Report server system stats (CPU, RAM, Disk) to Redis
     * Called alongside heartbeat
     */
    async reportSystemStats(serverId: string, stats: {
        cpu: { usage: number; cores: number };
        memory: { total: number; used: number; usagePercent: number };
        disk: { total: number; used: number; usagePercent: number };
        uptime: number;
    }): Promise<void> {
        try {
            await this.client.set(
                `${this.keyPrefix}server:${serverId}:system_stats`,
                JSON.stringify(stats),
                'EX',
                60 // Expires if not updated
            );
        } catch (error) {
            this.logger.error(`Failed to report system stats for ${serverId}:`, error);
        }
    }

    /**
     * Set server info (including URL for load balancing)
     */
    async setServerInfo(serverId: string, info: { port: number; version: string; url?: string }): Promise<void> {
        try {
            const data: Record<string, string> = {
                port: info.port.toString(),
                version: info.version,
                startedAt: Date.now().toString(),
            };
            if (info.url) {
                data.url = info.url;
            }
            await this.client.hset(`${this.keyPrefix}server:${serverId}:info`, data);
        } catch (error) {
            this.logger.error(`Failed to set server info for ${serverId}:`, error);
        }
    }

    /**
     * Set current connections for a server
     */
    async setServerConnections(serverId: string, count: number): Promise<void> {
        try {
            await this.client.set(`${this.keyPrefix}server:${serverId}:connections`, count.toString());
        } catch (error) {
            this.logger.error(`Failed to set connections for ${serverId}:`, error);
        }
    }

    /**
     * Remove server from active list (on shutdown)
     */
    async removeServer(serverId: string): Promise<void> {
        try {
            const pipeline = this.client.pipeline();
            pipeline.srem(`${this.keyPrefix}servers:active`, serverId);
            pipeline.del(`${this.keyPrefix}server:${serverId}:heartbeat`);
            pipeline.del(`${this.keyPrefix}server:${serverId}:connections`);
            await pipeline.exec();
        } catch (error) {
            this.logger.error(`Failed to remove server ${serverId}:`, error);
        }
    }

    // ==========================================
    // Stats Reading (for Admin Service)
    // ==========================================

    /**
     * Get overview stats
     */
    async getOverviewStats(): Promise<{
        totalConnections: number;
        totalRoomsCreated: number;
        totalGamesPlayed: number;
        activeRooms: number;
    }> {
        try {
            const [totalConnections, totalRoomsCreated, totalGamesPlayed, activeRooms] = await Promise.all([
                this.client.get(`${this.keyPrefix}stats:total_connections`),
                this.client.get(`${this.keyPrefix}stats:total_rooms_created`),
                this.client.get(`${this.keyPrefix}stats:total_games_played`),
                this.client.scard(`${this.keyPrefix}rooms:active`),
            ]);

            return {
                totalConnections: parseInt(totalConnections || '0'),
                totalRoomsCreated: parseInt(totalRoomsCreated || '0'),
                totalGamesPlayed: parseInt(totalGamesPlayed || '0'),
                activeRooms,
            };
        } catch (error) {
            this.logger.error('Failed to get overview stats:', error);
            return { totalConnections: 0, totalRoomsCreated: 0, totalGamesPlayed: 0, activeRooms: 0 };
        }
    }

    /**
     * Get daily stats for a specific date
     */
    async getDailyStats(date: string): Promise<{ connections: number; roomsCreated: number; gamesPlayed: number }> {
        try {
            const stats = await this.client.hgetall(`${this.keyPrefix}stats:daily:${date}`);
            return {
                connections: parseInt(stats.connections || '0'),
                roomsCreated: parseInt(stats.rooms_created || '0'),
                gamesPlayed: parseInt(stats.games_played || '0'),
            };
        } catch (error) {
            return { connections: 0, roomsCreated: 0, gamesPlayed: 0 };
        }
    }

    /**
     * Get all active servers info
     */
    async getActiveServers(): Promise<Array<{
        serverId: string;
        connections: number;
        lastHeartbeat: number;
        isOnline: boolean;
    }>> {
        try {
            const serverIds = await this.client.smembers(`${this.keyPrefix}servers:active`);
            const servers: Array<{
                serverId: string;
                connections: number;
                lastHeartbeat: number;
                isOnline: boolean;
            }> = [];

            for (const serverId of serverIds) {
                const [connections, heartbeat] = await Promise.all([
                    this.client.get(`${this.keyPrefix}server:${serverId}:connections`),
                    this.client.get(`${this.keyPrefix}server:${serverId}:heartbeat`),
                ]);

                const lastHeartbeat = parseInt(heartbeat || '0');
                const isOnline = Date.now() - lastHeartbeat < 60000; // Online if heartbeat within 60s

                servers.push({
                    serverId,
                    connections: parseInt(connections || '0'),
                    lastHeartbeat,
                    isOnline,
                });
            }

            return servers;
        } catch (error) {
            this.logger.error('Failed to get active servers:', error);
            return [];
        }
    }

    // ==========================================
    // Broadcast Subscription (from Admin)
    // ==========================================

    /**
     * Subscribe to broadcast messages from admin
     * @param callback - Function to call when broadcast message is received
     */
    subscribeBroadcast(callback: (message: string) => void): void {
        this.logger.log('📢 Setting up broadcast subscription...');

        // Create a separate client for subscription (pub/sub requires dedicated connection)
        const subscriber = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
        });

        const channel = `${this.keyPrefix}broadcast`;

        subscriber.on('error', (err) => {
            this.logger.error('Broadcast subscriber error:', err);
        });

        subscriber.subscribe(channel, (err) => {
            if (err) {
                this.logger.error('Failed to subscribe to broadcast channel:', err);
            } else {
                this.logger.log(`📢 Subscribed to broadcast channel: ${channel}`);
            }
        });

        subscriber.on('message', (ch, data) => {
            if (ch === channel) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.message) {
                        this.logger.log(`📢 Received broadcast: ${parsed.message}`);
                        callback(parsed.message);
                    }
                } catch (error) {
                    this.logger.error('Failed to parse broadcast message:', error);
                }
            }
        });
    }
}
