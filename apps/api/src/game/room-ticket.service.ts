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
     * Start ticket pick phase (host only)
     * Tickets are already generated when player is approved
     */
    startTicketPick(roomId: string, hostSocketId: string): ServiceResult<void> {
        const room = this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        if (!this.roomManager.isHost(room, hostSocketId)) {
            return {
                success: false,
                error: { code: ErrorCode.NOT_HOST, message: 'Only host can start' },
            };
        }

        if (room.phase !== RoomPhase.LOBBY) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Invalid phase' },
            };
        }

        // Ensure all players have tickets (in case any missed during approve)
        for (const player of room.players) {
            if (!player.ticket) {
                player.ticket = generateTicket();
            }
            player.ready = false;
        }

        room.phase = RoomPhase.TICKET_PICK;
        this.roomManager.update(roomId, room);

        return { success: true, data: undefined };
    }

    /**
     * Reroll ticket for a player (allowed in LOBBY or TICKET_PICK phase, but not if ready)
     */
    rerollTicket(roomId: string, socketId: string): ServiceResult<void> {
        const room = this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        // Allow reroll in LOBBY or TICKET_PICK phase
        if (room.phase !== RoomPhase.LOBBY && room.phase !== RoomPhase.TICKET_PICK) {
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
        this.roomManager.update(roomId, room);

        return { success: true, data: undefined };
    }

    /**
     * Save ticket and mark player as ready
     */
    saveTicketReady(roomId: string, socketId: string): ServiceResult<void> {
        const room = this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        if (room.phase !== RoomPhase.TICKET_PICK) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Not in ticket pick phase' },
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
        this.roomManager.update(roomId, room);

        return { success: true, data: undefined };
    }
}
