import { Controller, Get, Post, Body, HttpException, HttpStatus, Req } from '@nestjs/common';
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
}
