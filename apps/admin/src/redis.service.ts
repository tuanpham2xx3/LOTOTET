import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Redis Service for Admin Dashboard (Read-only access to game stats)
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

    private async connect(): Promise<void> {
        const sentinels = process.env.REDIS_SENTINELS;

        if (sentinels) {
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
            });

            this.logger.log(`🔗 Connecting to Redis Sentinel: ${sentinels}`);
        } else {
            this.client = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB || '0'),
                lazyConnect: true,
            });

            this.logger.log(`🔗 Connecting to Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
        }

        this.client.on('connect', () => this.logger.log('✅ Redis connected'));
        this.client.on('error', (err) => this.logger.error('❌ Redis error:', err.message));

        try {
            await this.client.connect();
        } catch (error) {
            this.logger.error('❌ Failed to connect to Redis:', error);
        }
    }

    private async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.logger.log('🔌 Redis disconnected');
        }
    }

    isConnected(): boolean {
        return this.client?.status === 'ready';
    }

    // ==========================================
    // Stats Reading
    // ==========================================

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
                const isOnline = Date.now() - lastHeartbeat < 60000;

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

    async getActiveRooms(): Promise<Array<{
        roomId: string;
        hostName: string;
        playerCount: number;
        status: string;
        betAmount: number;
    }>> {
        try {
            const roomIds = await this.client.smembers(`${this.keyPrefix}rooms:active`);
            const rooms: Array<{
                roomId: string;
                hostName: string;
                playerCount: number;
                status: string;
                betAmount: number;
            }> = [];

            for (const roomId of roomIds) {
                const roomData = await this.client.get(`${this.keyPrefix}room:${roomId}`);
                if (roomData) {
                    try {
                        const room = JSON.parse(roomData);
                        const host = room.players?.find((p: any) => p.id === room.hostId);
                        rooms.push({
                            roomId,
                            hostName: host?.name || 'Unknown',
                            playerCount: room.players?.length || 0,
                            status: room.phase || 'LOBBY',
                            betAmount: room.betAmount || 0,
                        });
                    } catch {
                        // Skip invalid room data
                    }
                }
            }

            return rooms;
        } catch (error) {
            this.logger.error('Failed to get active rooms:', error);
            return [];
        }
    }

    async getLast7DaysStats(): Promise<Array<{
        date: string;
        connections: number;
        roomsCreated: number;
        gamesPlayed: number;
    }>> {
        const stats: Array<{
            date: string;
            connections: number;
            roomsCreated: number;
            gamesPlayed: number;
        }> = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            const dayStats = await this.getDailyStats(dateKey);
            stats.push({
                date: dateKey,
                ...dayStats,
            });
        }
        return stats;
    }
}
