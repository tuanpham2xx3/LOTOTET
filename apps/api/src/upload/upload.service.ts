import { Injectable, Logger } from '@nestjs/common';
import { RoomManager } from '../game/room.manager';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'fs';

/**
 * Upload Service - Manages audio file uploads with room validation
 * Provides authentication by requiring player to be in a room
 */
@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);

    // Rate limiting: track uploads per player
    private playerUploadCount = new Map<string, { count: number; resetAt: number }>();
    private readonly RATE_LIMIT = 5; // 5 uploads per minute
    private readonly RATE_WINDOW = 60 * 1000; // 1 minute

    constructor(private readonly roomManager: RoomManager) { }

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
     * Returns true if upload is allowed, false if rate limited
     */
    checkRateLimit(playerId: string): { allowed: boolean; retryAfter?: number } {
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
