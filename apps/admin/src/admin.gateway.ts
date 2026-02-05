import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { StatsService } from './stats.service';
import { AuthService } from './auth.service';

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
})
export class AdminGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(AdminGateway.name);
    private statsIntervals = new Map<string, NodeJS.Timeout>();

    constructor(
        private statsService: StatsService,
        private authService: AuthService,
    ) { }

    handleConnection(client: Socket) {
        this.logger.log(`📡 Admin client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`📡 Admin client disconnected: ${client.id}`);
        this.authService.removeAuthenticatedSocket(client.id);
        this.stopStatsStream(client.id);
    }

    /**
     * Login with password
     */
    @SubscribeMessage('admin:login')
    async handleLogin(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { password: string },
    ) {
        const clientIp = client.handshake.headers['x-forwarded-for'] as string ||
            client.handshake.address ||
            'unknown';

        const result = this.authService.validatePassword(clientIp, payload.password);

        if (result.success) {
            this.authService.addAuthenticatedSocket(client.id);

            // Send initial stats immediately
            const stats = await this.statsService.getDashboardStats();

            return {
                success: true,
                stats,
            };
        }

        return {
            success: false,
            error: result.error,
        };
    }

    /**
     * Start realtime stats stream
     */
    @SubscribeMessage('admin:subscribe')
    async handleSubscribe(@ConnectedSocket() client: Socket) {
        if (!this.authService.isAuthenticated(client.id)) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        // Clear any existing interval
        this.stopStatsStream(client.id);

        // Start sending stats every 2 seconds
        const interval = setInterval(async () => {
            try {
                const stats = await this.statsService.getDashboardStats();
                client.emit('admin:stats', stats);
            } catch (error) {
                this.logger.error('Failed to send stats:', error);
            }
        }, 2000);

        this.statsIntervals.set(client.id, interval);
        this.logger.log(`📊 Started stats stream for ${client.id}`);

        return { success: true };
    }

    /**
     * Stop realtime stats stream
     */
    @SubscribeMessage('admin:unsubscribe')
    handleUnsubscribe(@ConnectedSocket() client: Socket) {
        this.stopStatsStream(client.id);
        return { success: true };
    }

    /**
     * Get stats on-demand
     */
    @SubscribeMessage('admin:getStats')
    async handleGetStats(@ConnectedSocket() client: Socket) {
        if (!this.authService.isAuthenticated(client.id)) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        const stats = await this.statsService.getDashboardStats();
        return { success: true, stats };
    }

    /**
     * Get stats by period
     */
    @SubscribeMessage('admin:getStatsByPeriod')
    async handleGetStatsByPeriod(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { period: 'day' | 'week' | 'month' | 'all' },
    ) {
        if (!this.authService.isAuthenticated(client.id)) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        const stats = await this.statsService.getStatsByPeriod(payload.period);
        return { success: true, stats };
    }

    /**
     * Logout
     */
    @SubscribeMessage('admin:logout')
    handleLogout(@ConnectedSocket() client: Socket) {
        this.authService.removeAuthenticatedSocket(client.id);
        this.stopStatsStream(client.id);
        this.logger.log(`🚪 Admin ${client.id} logged out`);
        return { success: true };
    }

    private stopStatsStream(socketId: string) {
        const interval = this.statsIntervals.get(socketId);
        if (interval) {
            clearInterval(interval);
            this.statsIntervals.delete(socketId);
            this.logger.log(`📊 Stopped stats stream for ${socketId}`);
        }
    }
}
