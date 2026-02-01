import { Injectable } from '@nestjs/common';
import { RoomManager } from './room.manager';
import {
    RoomState,
    RoomPhase,
    Player,
    PlayerStatus,
    JoinRequest,
    Spectator,
    ErrorCode,
    ErrorPayload,
    generateTicket,
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

        // Remove any existing pending request with the same name (e.g., from page refresh)
        const existingIndex = room.pendingRequests.findIndex(
            (r) => r.name.toLowerCase() === name.toLowerCase()
        );
        if (existingIndex !== -1) {
            room.pendingRequests.splice(existingIndex, 1);
        }

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

        // Get unique name to avoid duplicates
        const uniqueName = this.getUniqueName(room, request.name);

        // Generate ticket immediately so player can view and reroll
        const ticket = generateTicket();

        const player: Player = {
            id: playerId,
            socketId: request.socketId,
            name: uniqueName,
            balance: request.balance,
            isHost: false,
            status: PlayerStatus.APPROVED,
            ready: false,
            ticket,
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
     * Set bet amount for the room (host only)
     */
    setBetAmount(
        roomId: string,
        amount: number,
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
                error: { code: ErrorCode.NOT_HOST, message: 'Only host can set bet amount' },
            };
        }

        if (room.phase !== RoomPhase.LOBBY) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Can only set bet in lobby' },
            };
        }

        console.log(`[Lobby] Setting betAmount: ${room.betAmount} -> ${amount}`);
        room.betAmount = amount;
        this.roomManager.update(roomId, room);
        console.log(`[Lobby] betAmount set successfully: ${room.betAmount}`);

        return { success: true, data: undefined };
    }

    /**
     * Kick a player from the room (host only, LOBBY phase only)
     */
    kickPlayer(
        roomId: string,
        playerId: string,
        hostSocketId: string,
    ): ServiceResult<{ kickedSocketId: string; kickedName: string }> {
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
                error: { code: ErrorCode.NOT_HOST, message: 'Only host can kick players' },
            };
        }

        if (room.phase !== RoomPhase.LOBBY) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Chỉ có thể đuổi người chơi trong phòng chờ' },
            };
        }

        const playerIndex = room.players.findIndex((p) => p.id === playerId);

        if (playerIndex === -1) {
            return {
                success: false,
                error: { code: ErrorCode.PLAYER_NOT_FOUND, message: 'Player not found' },
            };
        }

        const player = room.players[playerIndex];

        // Cannot kick yourself (host)
        if (player.isHost) {
            return {
                success: false,
                error: { code: ErrorCode.NOT_HOST, message: 'Không thể đuổi chính mình' },
            };
        }

        const kickedSocketId = player.socketId;
        const kickedName = player.name;

        // Remove player from room
        room.players.splice(playerIndex, 1);
        this.roomManager.removeSocket(kickedSocketId);
        this.roomManager.update(roomId, room);

        return { success: true, data: { kickedSocketId, kickedName } };
    }

    // ==================== Spectator Management ====================

    /**
     * Add a spectator to the room
     */
    addSpectator(roomId: string, socketId: string): ServiceResult<void> {
        const room = this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        // Check if already spectating
        if (room.spectators.find((s) => s.socketId === socketId)) {
            return {
                success: false,
                error: { code: ErrorCode.ALREADY_IN_ROOM, message: 'Already spectating' },
            };
        }

        // Check if already a player
        if (room.players.find((p) => p.socketId === socketId)) {
            return {
                success: false,
                error: { code: ErrorCode.ALREADY_IN_ROOM, message: 'Already a player' },
            };
        }

        const spectator: Spectator = {
            socketId,
            joinedAt: Date.now(),
        };

        room.spectators.push(spectator);
        this.roomManager.update(roomId, room);
        this.roomManager.associateSocket(socketId, roomId);

        return { success: true, data: undefined };
    }

    /**
     * Remove a spectator from the room
     */
    removeSpectator(roomId: string, socketId: string): void {
        const room = this.roomManager.get(roomId);
        if (!room) return;

        room.spectators = room.spectators.filter((s) => s.socketId !== socketId);
        this.roomManager.update(roomId, room);
        this.roomManager.removeSocket(socketId);
    }

    /**
     * Convert spectator to join request (spectator wants to play)
     */
    spectatorToJoinRequest(
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

        // Check if spectator
        const spectatorIndex = room.spectators.findIndex((s) => s.socketId === socketId);
        if (spectatorIndex === -1) {
            return {
                success: false,
                error: { code: ErrorCode.NOT_IN_ROOM, message: 'Not a spectator' },
            };
        }

        // Can only join in LOBBY phase
        if (room.phase !== RoomPhase.LOBBY) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Cannot join after game started' },
            };
        }

        // Remove from spectators
        room.spectators.splice(spectatorIndex, 1);

        // Create join request
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

        return { success: true, data: { requestId } };
    }

    /**
     * Handle player disconnect
     * Note: We don't remove players from room on disconnect to allow reconnection.
     * Players (including host) can reconnect with their playerId.
     * Only spectators and pending requests are removed.
     */
    handleDisconnect(socketId: string): { roomId: string; room: RoomState } | undefined {
        const roomId = this.roomManager.getRoomIdBySocketId(socketId);
        if (!roomId) return undefined;

        const room = this.roomManager.get(roomId);
        if (!room) return undefined;

        // Remove from pending requests (they need to re-request)
        room.pendingRequests = room.pendingRequests.filter((r) => r.socketId !== socketId);

        // Remove from spectators (they can just re-spectate)
        room.spectators = room.spectators.filter((s) => s.socketId !== socketId);

        // Check if this is a player (including host)
        const player = room.players.find((p) => p.socketId === socketId);
        if (player) {
            // DON'T remove player from room - they can reconnect
            // Just log for debugging
            console.log(`[RoomLobbyService] Player ${player.id} (host: ${player.isHost}) disconnected, keeping in room for reconnection`);
        }

        this.roomManager.removeSocket(socketId);
        this.roomManager.update(roomId, room);

        return { roomId, room };
    }

    /**
     * Reconnect a player who has refreshed the page
     * Updates their socket ID and re-associates them with the room
     */
    reconnectPlayer(
        roomId: string,
        playerId: string,
        newSocketId: string,
    ): ServiceResult<{ player: Player }> {
        const room = this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        const player = this.roomManager.findPlayerById(room, playerId);

        if (!player) {
            return {
                success: false,
                error: { code: ErrorCode.PLAYER_NOT_FOUND, message: 'Player not found in room' },
            };
        }

        // Store old socket ID for cleanup
        const oldSocketId = player.socketId;

        // Update player's socket ID
        const updated = this.roomManager.updatePlayerSocketId(room, playerId, newSocketId, oldSocketId);

        if (!updated) {
            return {
                success: false,
                error: { code: ErrorCode.PLAYER_NOT_FOUND, message: 'Failed to update socket' },
            };
        }

        // Associate new socket with room
        this.roomManager.associateSocket(newSocketId, roomId);
        this.roomManager.update(roomId, room);

        return { success: true, data: { player } };
    }

    // ==================== Private Helpers ====================

    /**
     * Generate unique name if duplicate exists
     * Example: "User" -> "User", "User" -> "User_2", "User" -> "User_3"
     */
    private getUniqueName(room: RoomState, baseName: string): string {
        const existingNames = new Set(room.players.map((p) => p.name.toLowerCase()));

        // If name doesn't exist, return as-is
        if (!existingNames.has(baseName.toLowerCase())) {
            return baseName;
        }

        // Find next available suffix
        let suffix = 2;
        while (existingNames.has(`${baseName.toLowerCase()}_${suffix}`)) {
            suffix++;
        }

        return `${baseName}_${suffix}`;
    }
}
