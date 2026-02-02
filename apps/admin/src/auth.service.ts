import { Injectable, Logger } from '@nestjs/common';

interface LoginAttempt {
    count: number;
    blockedUntil: number;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly password = process.env.ADMIN_PASSWORD || 'admin123';
    private readonly maxAttempts = 5;
    private readonly blockDuration = 15 * 60 * 1000; // 15 minutes

    private attempts = new Map<string, LoginAttempt>();
    private authenticatedSockets = new Set<string>();

    /**
     * Validate password with rate limiting
     */
    validatePassword(clientIp: string, password: string): { success: boolean; error?: string } {
        // Check if blocked
        const attempt = this.attempts.get(clientIp);
        if (attempt && attempt.blockedUntil > Date.now()) {
            const remainingMinutes = Math.ceil((attempt.blockedUntil - Date.now()) / 60000);
            this.logger.warn(`🚫 Blocked login attempt from ${clientIp}`);
            return {
                success: false,
                error: `Quá nhiều lần thử sai. Vui lòng đợi ${remainingMinutes} phút.`
            };
        }

        // Check password
        if (password === this.password) {
            this.attempts.delete(clientIp); // Reset on success
            this.logger.log(`✅ Successful login from ${clientIp}`);
            return { success: true };
        }

        // Failed attempt
        const currentAttempt = this.attempts.get(clientIp) || { count: 0, blockedUntil: 0 };
        currentAttempt.count++;

        if (currentAttempt.count >= this.maxAttempts) {
            currentAttempt.blockedUntil = Date.now() + this.blockDuration;
            this.logger.warn(`🚫 Blocked ${clientIp} after ${this.maxAttempts} failed attempts`);
        }

        this.attempts.set(clientIp, currentAttempt);

        const remainingAttempts = this.maxAttempts - currentAttempt.count;
        this.logger.warn(`❌ Failed login from ${clientIp} (${remainingAttempts} attempts left)`);

        return {
            success: false,
            error: remainingAttempts > 0
                ? `Sai mật khẩu. Còn ${remainingAttempts} lần thử.`
                : 'Sai mật khẩu. Tài khoản bị khóa 15 phút.'
        };
    }

    /**
     * Add socket to authenticated list
     */
    addAuthenticatedSocket(socketId: string): void {
        this.authenticatedSockets.add(socketId);
    }

    /**
     * Remove socket from authenticated list
     */
    removeAuthenticatedSocket(socketId: string): void {
        this.authenticatedSockets.delete(socketId);
    }

    /**
     * Check if socket is authenticated
     */
    isAuthenticated(socketId: string): boolean {
        return this.authenticatedSockets.has(socketId);
    }

    /**
     * Clear old blocked IPs (cleanup)
     */
    cleanup(): void {
        const now = Date.now();
        for (const [ip, attempt] of this.attempts.entries()) {
            if (attempt.blockedUntil < now) {
                this.attempts.delete(ip);
            }
        }
    }
}
