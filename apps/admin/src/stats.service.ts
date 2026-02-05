import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from './redis.service';
import { AlertService } from './alert.service';
import { SystemService, SystemStats } from './system.service';

export interface OverviewStats {
    totalConnections: number;
    totalRoomsCreated: number;
    totalGamesPlayed: number;
    activeRooms: number;
    activeServers: number;
    totalCurrentConnections: number;
}

export interface ServerInfo {
    serverId: string;
    connections: number;
    lastHeartbeat: number;
    isOnline: boolean;
}

export interface RoomInfo {
    roomId: string;
    hostName: string;
    playerCount: number;
    status: string;
    betAmount: number;
}

export interface DailyStats {
    date: string;
    connections: number;
    roomsCreated: number;
    gamesPlayed: number;
}

@Injectable()
export class StatsService {
    private readonly logger = new Logger(StatsService.name);
    private previousServerStates = new Map<string, boolean>();

    constructor(
        private redis: RedisService,
        private alertService: AlertService,
        private systemService: SystemService,
    ) { }

    /**
     * Get full dashboard stats
     */
    async getDashboardStats(): Promise<{
        overview: OverviewStats;
        servers: ServerInfo[];
        rooms: RoomInfo[];
        last7Days: DailyStats[];
        systemStats: SystemStats;
    }> {
        const [overview, servers, rooms, last7Days, systemStats] = await Promise.all([
            this.getOverviewStats(),
            this.redis.getActiveServers(),
            this.redis.getActiveRooms(),
            this.redis.getLast7DaysStats(),
            this.systemService.getSystemStats(),
        ]);

        return { overview, servers, rooms, last7Days, systemStats };
    }

    /**
     * Get stats by period: day, week, month, all
     */
    async getStatsByPeriod(period: 'day' | 'week' | 'month' | 'all') {
        return this.redis.getStatsByPeriod(period);
    }

    async getOverviewStats(): Promise<OverviewStats> {
        const [baseStats, servers] = await Promise.all([
            this.redis.getOverviewStats(),
            this.redis.getActiveServers(),
        ]);

        const activeServers = servers.filter(s => s.isOnline).length;
        const totalCurrentConnections = servers.reduce((sum, s) => sum + s.connections, 0);

        return {
            ...baseStats,
            activeServers,
            totalCurrentConnections,
        };
    }

    /**
     * Check server health every 30 seconds
     */
    @Cron(CronExpression.EVERY_30_SECONDS)
    async checkServerHealth() {
        const servers = await this.redis.getActiveServers();

        for (const server of servers) {
            const wasOnline = this.previousServerStates.get(server.serverId) ?? true;

            if (wasOnline && !server.isOnline) {
                // Server went offline
                this.logger.warn(`🔴 Server ${server.serverId} went OFFLINE`);
                await this.alertService.sendServerDownAlert(server.serverId);
            } else if (!wasOnline && server.isOnline) {
                // Server came back online
                this.logger.log(`🟢 Server ${server.serverId} is back ONLINE`);
                await this.alertService.sendServerUpAlert(server.serverId);
            }

            this.previousServerStates.set(server.serverId, server.isOnline);
        }
    }

    /**
     * Publish broadcast message to game servers
     */
    async publishBroadcast(message: string): Promise<boolean> {
        return this.redis.publishBroadcast(message);
    }
}
