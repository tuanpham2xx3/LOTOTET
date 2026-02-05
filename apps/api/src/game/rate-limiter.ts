import { Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * WebSocket Rate Limiter with Redis Backend
 * Falls back to in-memory Map if Redis unavailable
 */
export class WsRateLimiter {
    private readonly logger = new Logger(WsRateLimiter.name);
    // In-memory fallback when Redis is unavailable
    private readonly memoryRequests = new Map<string, number[]>();

    constructor(private readonly redis: RedisService) { }

    /**
     * Check if request is allowed and track it
     * @param ip - Client IP address
     * @param eventName - Socket event name
     * @param limit - Max requests allowed
     * @param windowMs - Time window in milliseconds
     * @returns true if allowed, false if rate limited
     */
    async isAllowed(ip: string, eventName: string, limit: number, windowMs: number): Promise<boolean> {
        // Try Redis first
        if (this.redis.isConnected()) {
            const windowSeconds = Math.ceil(windowMs / 1000);
            const result = await this.redis.checkRateLimit(ip, eventName, limit, windowSeconds);

            if (!result.allowed) {
                this.logger.warn(`BLOCKED ${ip}:${eventName}: ${result.count}/${limit} (Redis)`);
            }

            return result.allowed;
        }

        // Fallback to in-memory
        return this.isAllowedMemory(ip, eventName, limit, windowMs);
    }

    /**
     * In-memory fallback rate limiter
     */
    private isAllowedMemory(ip: string, eventName: string, limit: number, windowMs: number): boolean {
        const key = `${ip}:${eventName}`;
        const now = Date.now();

        // Get existing requests
        let timestamps = this.memoryRequests.get(key) || [];

        // Filter out expired requests
        timestamps = timestamps.filter(t => t > now - windowMs);

        // Check limit
        if (timestamps.length >= limit) {
            this.logger.warn(`BLOCKED ${key}: ${timestamps.length}/${limit} in ${windowMs}ms (Memory)`);
            return false;
        }

        // Add current request
        timestamps.push(now);
        this.memoryRequests.set(key, timestamps);

        return true;
    }

    /**
     * Get client IP from socket
     */
    static getClientIp(client: any): string {
        return client.handshake?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
            client.handshake?.address ||
            client.id;
    }

    /**
     * Cleanup old in-memory entries (call periodically)
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, timestamps] of this.memoryRequests.entries()) {
            const filtered = timestamps.filter(t => t > now - 60000);
            if (filtered.length === 0) {
                this.memoryRequests.delete(key);
            } else {
                this.memoryRequests.set(key, filtered);
            }
        }
    }
}

// Rate limit configurations
export const RATE_LIMITS = {
    'room:create': { limit: 10, windowMs: 60000 },   // 10 per minute
    'room:join': { limit: 10, windowMs: 60000 },     // 10 per minute
    'chat:send': { limit: 10, windowMs: 10000 },     // 10 per 10 seconds
    'game:bingoClaim': { limit: 3, windowMs: 10000 }, // 3 per 10 seconds
} as const;
