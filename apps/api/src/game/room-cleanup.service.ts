import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { RoomManager } from './room.manager';

/**
 * Room Cleanup Service
 * Automatically cleans up inactive rooms and rooms where host disconnected
 */
@Injectable()
export class RoomCleanupService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RoomCleanupService.name);
    private cleanupInterval: NodeJS.Timeout | null = null;

    // Configuration
    private readonly CLEANUP_INTERVAL_MS = 60 * 1000; // Check every 1 minute
    private readonly INACTIVE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
    private readonly HOST_DISCONNECT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes after host disconnect

    constructor(private readonly roomManager: RoomManager) { }

    onModuleInit() {
        this.logger.log('🧹 Room Cleanup Service started');
        this.logger.log(`   - Inactive timeout: ${this.INACTIVE_TIMEOUT_MS / 60000} minutes`);
        this.logger.log(`   - Host disconnect timeout: ${this.HOST_DISCONNECT_TIMEOUT_MS / 60000} minutes`);
        this.logger.log(`   - Cleanup interval: ${this.CLEANUP_INTERVAL_MS / 1000} seconds`);

        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, this.CLEANUP_INTERVAL_MS);
    }

    onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            this.logger.log('🧹 Room Cleanup Service stopped');
        }
    }

    /**
     * Perform cleanup of inactive rooms
     */
    private performCleanup(): void {
        const now = Date.now();
        const rooms = this.roomManager.getAllRooms();
        const roomsToDelete: string[] = [];

        for (const [roomId, room] of rooms) {
            let shouldDelete = false;
            let reason = '';

            // Check 1: Inactive for too long
            const inactiveDuration = now - room.lastActivityAt;
            if (inactiveDuration >= this.INACTIVE_TIMEOUT_MS) {
                shouldDelete = true;
                reason = `inactive for ${Math.round(inactiveDuration / 60000)} minutes`;
            }

            // Check 2: Host disconnected for too long
            if (room.hostDisconnectedAt) {
                const hostDisconnectDuration = now - room.hostDisconnectedAt;
                if (hostDisconnectDuration >= this.HOST_DISCONNECT_TIMEOUT_MS) {
                    shouldDelete = true;
                    reason = `host disconnected for ${Math.round(hostDisconnectDuration / 60000)} minutes`;
                }
            }

            if (shouldDelete) {
                roomsToDelete.push(roomId);
                this.logger.log(`🗑️ Deleting room ${roomId}: ${reason}`);
            }
        }

        // Delete rooms
        for (const roomId of roomsToDelete) {
            this.roomManager.delete(roomId);
        }

        // Log summary if any rooms were deleted
        if (roomsToDelete.length > 0) {
            this.logger.log(`🧹 Cleanup complete: deleted ${roomsToDelete.length} room(s), ${rooms.size - roomsToDelete.length} remaining`);
        }
    }

    /**
     * Get cleanup statistics (for debugging/monitoring)
     */
    getStats(): {
        totalRooms: number;
        inactiveRooms: number;
        hostDisconnectedRooms: number;
    } {
        const now = Date.now();
        const rooms = this.roomManager.getAllRooms();
        let inactiveRooms = 0;
        let hostDisconnectedRooms = 0;

        for (const room of rooms.values()) {
            if (now - room.lastActivityAt >= this.INACTIVE_TIMEOUT_MS) {
                inactiveRooms++;
            }
            if (room.hostDisconnectedAt) {
                hostDisconnectedRooms++;
            }
        }

        return {
            totalRooms: rooms.size,
            inactiveRooms,
            hostDisconnectedRooms,
        };
    }
}
