import { Controller, Get, Post, Body, HttpException, HttpStatus, Req, Param } from '@nestjs/common';
import { StatsService } from './stats.service';
import { AuthService } from './auth.service';
import { RedisService } from './redis.service';

@Controller()
export class AdminController {
    constructor(
        private statsService: StatsService,
        private authService: AuthService,
        private redis: RedisService,
    ) { }

    /**
     * Health check endpoint
     */
    @Get('health')
    getHealth() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            redis: this.redis.isConnected() ? 'connected' : 'disconnected',
        };
    }

    /**
     * REST login (alternative to WebSocket)
     */
    @Post('auth/login')
    login(@Req() req: any, @Body() body: { password: string }) {
        const clientIp = req.headers['x-forwarded-for'] as string ||
            req.socket?.remoteAddress ||
            'unknown';

        const result = this.authService.validatePassword(clientIp, body.password);

        if (!result.success) {
            throw new HttpException(result.error || 'Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        return { success: true, message: 'Đăng nhập thành công' };
    }

    /**
     * Get stats via REST (requires prior login via WebSocket for real auth)
     * This is for debugging/testing purposes
     */
    @Get('stats')
    async getStats() {
        return await this.statsService.getDashboardStats();
    }

    /**
     * Get overview stats only
     */
    @Get('stats/overview')
    async getOverview() {
        return await this.statsService.getOverviewStats();
    }

    /**
     * Get active servers
     */
    @Get('stats/servers')
    async getServers() {
        return await this.redis.getActiveServers();
    }

    /**
     * Get active rooms
     */
    @Get('stats/rooms')
    async getRooms() {
        return await this.redis.getActiveRooms();
    }

    // ==========================================
    // Load Balancer Endpoints
    // ==========================================

    /**
     * Get best server for creating a new room (least connections)
     * Frontend calls this before creating a room
     */
    @Get('loadbalancer/server')
    async getBestServer() {
        const result = await this.redis.getBestServerForNewRoom();

        if (!result) {
            throw new HttpException('No servers available', HttpStatus.SERVICE_UNAVAILABLE);
        }

        return {
            success: true,
            serverId: result.serverId,
            serverUrl: result.serverUrl,
        };
    }

    /**
     * Get server URL for an existing room
     * Frontend calls this before joining a room
     */
    @Get('loadbalancer/room/:roomId')
    async getServerForRoom(@Param('roomId') roomId: string) {
        const serverUrl = await this.redis.getRoomServer(roomId);

        if (!serverUrl) {
            throw new HttpException('Room not found or server offline', HttpStatus.NOT_FOUND);
        }

        return {
            success: true,
            roomId,
            serverUrl,
        };
    }
}
