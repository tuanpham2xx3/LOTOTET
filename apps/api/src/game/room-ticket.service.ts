import { Injectable } from '@nestjs/common';
import { RoomManager } from './room.manager';
import {
    RoomPhase,
    ErrorCode,
    ErrorPayload,
    generateTicket,
} from '@lototet/shared';

export type ServiceResult<T> =
    | { success: true; data: T }
    | { success: false; error: ErrorPayload };

@Injectable()
export class RoomTicketService {
    constructor(private roomManager: RoomManager) { }

    /**
     * Reroll ticket for a player (only in LOBBY phase, before ready)
     */
    async rerollTicket(roomId: string, socketId: string): Promise<ServiceResult<void>> {
        const room = await this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        // Only allow reroll in LOBBY phase
        if (room.phase !== RoomPhase.LOBBY) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Cannot reroll after game started' },
            };
        }

        const player = this.roomManager.findPlayerBySocketId(room, socketId);

        if (!player) {
            return {
                success: false,
                error: { code: ErrorCode.PLAYER_NOT_FOUND, message: 'Player not found' },
            };
        }

        // Block reroll if player is already ready
        if (player.ready) {
            return {
                success: false,
                error: { code: ErrorCode.ALREADY_RESPONDED, message: 'Cannot reroll after ready' },
            };
        }

        player.ticket = generateTicket();
        await this.roomManager.update(roomId, room);

        return { success: true, data: undefined };
    }

    /**
     * Save ticket and mark player as ready (only in LOBBY phase)
     */
    async saveTicketReady(roomId: string, socketId: string): Promise<ServiceResult<void>> {
        const room = await this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        // Only allow ready in LOBBY phase
        if (room.phase !== RoomPhase.LOBBY) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Cannot ready after game started' },
            };
        }

        const player = this.roomManager.findPlayerBySocketId(room, socketId);

        if (!player) {
            return {
                success: false,
                error: { code: ErrorCode.PLAYER_NOT_FOUND, message: 'Player not found' },
            };
        }

        player.ready = true;
        // Initialize marked grid
        player.marked = Array.from({ length: 9 }, () => Array(9).fill(false));
        await this.roomManager.update(roomId, room);

        return { success: true, data: undefined };
    }
}
