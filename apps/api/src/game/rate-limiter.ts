/**
 * Simple WebSocket Rate Limiter
 * Tracks requests per IP per event type
 */
export class WsRateLimiter {
    // Map: key = "ip:eventName" => array of request timestamps
    private readonly requests = new Map<string, number[]>();

    /**
     * Check if request is allowed and track it
     * @param ip - Client IP address
     * @param eventName - Socket event name
     * @param limit - Max requests allowed
     * @param windowMs - Time window in milliseconds
     * @returns true if allowed, false if rate limited
     */
    isAllowed(ip: string, eventName: string, limit: number, windowMs: number): boolean {
        const key = `${ip}:${eventName}`;
        const now = Date.now();

        // Get existing requests
        let timestamps = this.requests.get(key) || [];

        // Filter out expired requests
        timestamps = timestamps.filter(t => t > now - windowMs);

        // Check limit
        if (timestamps.length >= limit) {
            console.log(`[RateLimiter] BLOCKED ${key}: ${timestamps.length}/${limit} in ${windowMs}ms`);
            return false;
        }

        // Add current request
        timestamps.push(now);
        this.requests.set(key, timestamps);

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
}

// Rate limit configurations
export const RATE_LIMITS = {
    'room:create': { limit: 10, windowMs: 60000 },   // 10 per minute
    'room:join': { limit: 10, windowMs: 60000 },     // 10 per minute
    'chat:send': { limit: 10, windowMs: 10000 },     // 10 per 10 seconds
    'game:bingoClaim': { limit: 3, windowMs: 10000 }, // 3 per 10 seconds
} as const;
