import { Injectable, Logger } from '@nestjs/common';
import { RoomManager } from '../game/room.manager';
import { RedisService } from '../redis/redis.service';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'fs';

/**
 * Upload Service - Manages audio file uploads with room validation
 * Provides authentication by requiring player to be in a room
 */
@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);

    // In-memory fallback rate limiting
    private playerUploadCount = new Map<string, { count: number; resetAt: number }>();
    private readonly RATE_LIMIT = 5; // 5 uploads per minute
    private readonly RATE_WINDOW = 60 * 1000; // 1 minute
    private readonly RATE_WINDOW_SECONDS = 60;

    constructor(
        private readonly roomManager: RoomManager,
        private readonly redis: RedisService,
    ) { }

    /**
     * Get the uploads directory for a specific room
     */
    getRoomUploadDir(roomId: string): string {
        return join(process.cwd(), 'uploads', 'audio', roomId);
    }

    /**
     * Ensure room upload directory exists
     */
    ensureRoomDir(roomId: string): string {
        const dir = this.getRoomUploadDir(roomId);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        return dir;
    }

    /**
     * Validate that the socket is in the specified room
     * Returns player info if valid, null otherwise
     */
    async validateSocketInRoom(roomId: string, socketId: string): Promise<{
        valid: boolean;
        playerId?: string;
        playerName?: string;
        error?: string;
    }> {
        const room = await this.roomManager.get(roomId);

        if (!room) {
            return { valid: false, error: 'Room not found' };
        }

        const player = this.roomManager.findPlayerBySocketId(room, socketId);

        if (!player) {
            return { valid: false, error: 'Player not in room' };
        }

        return {
            valid: true,
            playerId: player.id,
            playerName: player.name,
        };
    }

    /**
     * Check rate limit for a player
     * Uses Redis if available, falls back to in-memory
     * Returns true if upload is allowed, false if rate limited
     */
    async checkRateLimit(playerId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
        // Try Redis first
        if (this.redis.isConnected()) {
            const result = await this.redis.checkRateLimit(
                playerId,
                'upload:audio',
                this.RATE_LIMIT,
                this.RATE_WINDOW_SECONDS,
            );

            if (!result.allowed) {
                this.logger.log(`[RateLimit] BLOCKED upload for ${playerId}: ${result.count}/${this.RATE_LIMIT} (Redis)`);
            }

            return {
                allowed: result.allowed,
                retryAfter: result.retryAfter,
            };
        }

        // Fallback to in-memory
        return this.checkRateLimitMemory(playerId);
    }

    /**
     * In-memory fallback rate limiter
     */
    private checkRateLimitMemory(playerId: string): { allowed: boolean; retryAfter?: number } {
        const now = Date.now();
        const record = this.playerUploadCount.get(playerId);

        if (!record || now >= record.resetAt) {
            // Reset window
            this.playerUploadCount.set(playerId, {
                count: 1,
                resetAt: now + this.RATE_WINDOW,
            });
            return { allowed: true };
        }

        if (record.count >= this.RATE_LIMIT) {
            const retryAfter = Math.ceil((record.resetAt - now) / 1000);
            this.logger.log(`[RateLimit] BLOCKED upload for ${playerId}: ${record.count}/${this.RATE_LIMIT} (Memory)`);
            return { allowed: false, retryAfter };
        }

        record.count++;
        return { allowed: true };
    }

    /**
     * Generate filename for audio upload
     */
    generateFilename(ext: string = '.webm'): string {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        return `audio-${uniqueSuffix}${ext}`;
    }

    /**
     * Delete all audio files for a room
     * Called when room is cleaned up
     */
    deleteRoomAudio(roomId: string): void {
        const dir = this.getRoomUploadDir(roomId);

        if (existsSync(dir)) {
            try {
                // Get file count for logging
                const files = readdirSync(dir);
                const fileCount = files.length;

                // Remove directory and all contents
                rmSync(dir, { recursive: true, force: true });

                if (fileCount > 0) {
                    this.logger.log(`🗑️ Deleted ${fileCount} audio file(s) for room ${roomId}`);
                }
            } catch (error) {
                this.logger.error(`Failed to delete audio for room ${roomId}:`, error);
            }
        }
    }

    /**
     * Clean up rate limit records for old entries
     * Should be called periodically
     */
    cleanupRateLimits(): void {
        const now = Date.now();
        for (const [playerId, record] of this.playerUploadCount.entries()) {
            if (now >= record.resetAt) {
                this.playerUploadCount.delete(playerId);
            }
        }
    }
}
