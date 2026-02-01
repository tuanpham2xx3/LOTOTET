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
            await pipeline.exec();
        } catch (error) {
            this.logger.error(`Failed to delete room ${roomId}:`, error);
            throw error;
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
}
