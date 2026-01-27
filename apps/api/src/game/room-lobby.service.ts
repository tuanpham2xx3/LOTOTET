import { Injectable } from '@nestjs/common';
import { RoomManager } from './room.manager';
import {
    RoomState,
    RoomPhase,
    Player,
    PlayerStatus,
    JoinRequest,
    ErrorCode,
    ErrorPayload,
} from '@lototet/shared';

export type ServiceResult<T> =
    | { success: true; data: T }
    | { success: false; error: ErrorPayload };

@Injectable()
export class RoomLobbyService {
    constructor(private roomManager: RoomManager) { }

    /**
     * Handle join request (creates pending request)
     */
    handleJoinRequest(
        roomId: string,
        socketId: string,
        name: string,
        balance: number,
    ): ServiceResult<{ requestId: string }> {
        const room = this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        if (room.phase !== RoomPhase.LOBBY) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Game already started' },
            };
        }

        const requestId = this.roomManager.generateRequestId();
        const request: JoinRequest = {
            requestId,
            socketId,
            name,
            balance,
            createdAt: Date.now(),
        };

        room.pendingRequests.push(request);
        this.roomManager.update(roomId, room);
        this.roomManager.associateSocket(socketId, roomId);

        return { success: true, data: { requestId } };
    }

    /**
     * Approve a join request (host only)
     */
    approveJoin(
        roomId: string,
        requestId: string,
        hostSocketId: string,
    ): ServiceResult<{ player: Player; playerSocketId: string }> {
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
                error: { code: ErrorCode.NOT_HOST, message: 'Only host can approve' },
            };
        }

        const requestIndex = room.pendingRequests.findIndex(
            (r) => r.requestId === requestId,
        );

        if (requestIndex === -1) {
            return {
                success: false,
                error: { code: ErrorCode.REQUEST_NOT_FOUND, message: 'Request not found' },
            };
        }

        const request = room.pendingRequests[requestIndex];
        const playerId = this.roomManager.generatePlayerId();

        const player: Player = {
            id: playerId,
            socketId: request.socketId,
            name: request.name,
            balance: request.balance,
            isHost: false,
            status: PlayerStatus.APPROVED,
            ready: false,
        };

        room.players.push(player);
        room.pendingRequests.splice(requestIndex, 1);
        this.roomManager.update(roomId, room);

        return { success: true, data: { player, playerSocketId: request.socketId } };
    }

    /**
     * Reject a join request (host only)
     */
    rejectJoin(
        roomId: string,
        requestId: string,
        hostSocketId: string,
    ): ServiceResult<{ rejectedSocketId: string }> {
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
                error: { code: ErrorCode.NOT_HOST, message: 'Only host can reject' },
            };
        }

        const requestIndex = room.pendingRequests.findIndex(
            (r) => r.requestId === requestId,
        );

        if (requestIndex === -1) {
            return {
                success: false,
                error: { code: ErrorCode.REQUEST_NOT_FOUND, message: 'Request not found' },
            };
        }

        const request = room.pendingRequests[requestIndex];
        room.pendingRequests.splice(requestIndex, 1);
        this.roomManager.update(roomId, room);
        this.roomManager.removeSocket(request.socketId);

        return { success: true, data: { rejectedSocketId: request.socketId } };
    }

    /**
     * Update player balance (host only)
     */
    updateBalance(
        roomId: string,
        playerId: string,
        balance: number,
        hostSocketId: string,
    ): ServiceResult<void> {
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
                error: { code: ErrorCode.NOT_HOST, message: 'Only host can update balance' },
            };
        }

        const player = room.players.find((p) => p.id === playerId);

        if (!player) {
            return {
                success: false,
                error: { code: ErrorCode.PLAYER_NOT_FOUND, message: 'Player not found' },
            };
        }

        player.balance = balance;
        this.roomManager.update(roomId, room);

        return { success: true, data: undefined };
    }

    /**
     * Handle player disconnect
     */
    handleDisconnect(socketId: string): { roomId: string; room: RoomState } | undefined {
        const roomId = this.roomManager.getRoomIdBySocketId(socketId);
        if (!roomId) return undefined;

        const room = this.roomManager.get(roomId);
        if (!room) return undefined;

        // Remove from pending requests
        room.pendingRequests = room.pendingRequests.filter((r) => r.socketId !== socketId);

        // Remove from players
        const playerIndex = room.players.findIndex((p) => p.socketId === socketId);
        if (playerIndex !== -1) {
            const player = room.players[playerIndex];

            // If host leaves, delete room
            if (player.isHost) {
                this.roomManager.delete(roomId);
                return undefined;
            }

            room.players.splice(playerIndex, 1);
        }

        this.roomManager.removeSocket(socketId);
        this.roomManager.update(roomId, room);

        return { roomId, room };
    }
}
