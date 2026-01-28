import { Injectable } from '@nestjs/common';
import { RoomState, RoomPhase, Player, PlayerStatus, GameState, generateTicket } from '@lototet/shared';

/**
 * In-memory room storage manager
 * Stores all active game rooms in a Map
 */
@Injectable()
export class RoomManager {
    private rooms = new Map<string, RoomState>();
    private socketToRoom = new Map<string, string>(); // socketId -> roomId

    /**
     * Generate a unique 6-character room code
     */
    generateRoomId(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
        let roomId: string;
        do {
            roomId = Array.from(
                { length: 6 },
                () => chars[Math.floor(Math.random() * chars.length)],
            ).join('');
        } while (this.rooms.has(roomId));
        return roomId;
    }

    /**
     * Generate a unique player ID
     */
    generatePlayerId(): string {
        return `player_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    /**
     * Generate a unique request ID
     */
    generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    /**
     * Create a new room with the given host
     */
    create(roomId: string, hostSocketId: string, hostName: string = 'Host', hostBalance: number = 0): RoomState {
        const hostId = this.generatePlayerId();

        const host: Player = {
            id: hostId,
            socketId: hostSocketId,
            name: hostName,
            balance: hostBalance,
            isHost: true,
            status: PlayerStatus.APPROVED,
            ready: false,
            ticket: generateTicket(), // Generate ticket immediately
        };

        const room: RoomState = {
            roomId,
            phase: RoomPhase.LOBBY,
            hostId,
            players: [host],
            pendingRequests: [],
            spectators: [],
        };

        this.rooms.set(roomId, room);
        this.socketToRoom.set(hostSocketId, roomId);
        return room;
    }

    /**
     * Get room by ID
     */
    get(roomId: string): RoomState | undefined {
        return this.rooms.get(roomId);
    }

    /**
     * Get room by socket ID
     */
    getBySocketId(socketId: string): RoomState | undefined {
        const roomId = this.socketToRoom.get(socketId);
        if (!roomId) return undefined;
        return this.rooms.get(roomId);
    }

    /**
     * Get roomId by socket ID
     */
    getRoomIdBySocketId(socketId: string): string | undefined {
        return this.socketToRoom.get(socketId);
    }

    /**
     * Update room state
     */
    update(roomId: string, state: RoomState): void {
        this.rooms.set(roomId, state);
    }

    /**
     * Associate a socket with a room
     */
    associateSocket(socketId: string, roomId: string): void {
        this.socketToRoom.set(socketId, roomId);
    }

    /**
     * Remove socket association
     */
    removeSocket(socketId: string): void {
        this.socketToRoom.delete(socketId);
    }

    /**
     * Delete a room
     */
    delete(roomId: string): void {
        const room = this.rooms.get(roomId);
        if (room) {
            // Clean up all socket associations
            for (const player of room.players) {
                this.socketToRoom.delete(player.socketId);
            }
            for (const request of room.pendingRequests) {
                this.socketToRoom.delete(request.socketId);
            }
        }
        this.rooms.delete(roomId);
    }

    /**
     * Find player in room by socket ID
     */
    findPlayerBySocketId(room: RoomState, socketId: string): Player | undefined {
        return room.players.find((p) => p.socketId === socketId);
    }

    /**
     * Check if socket is the host
     */
    isHost(room: RoomState, socketId: string): boolean {
        const player = this.findPlayerBySocketId(room, socketId);
        return player?.isHost === true;
    }

    /**
     * Find spectator in room by socket ID
     */
    findSpectatorBySocketId(room: RoomState, socketId: string): { socketId: string; joinedAt: number } | undefined {
        return room.spectators.find((s) => s.socketId === socketId);
    }

    /**
     * Find player in room by player ID (for reconnection)
     */
    findPlayerById(room: RoomState, playerId: string): Player | undefined {
        return room.players.find((p) => p.id === playerId);
    }

    /**
     * Update player's socket ID (for reconnection)
     */
    updatePlayerSocketId(room: RoomState, playerId: string, newSocketId: string, oldSocketId?: string): boolean {
        const player = this.findPlayerById(room, playerId);
        if (!player) return false;

        // Remove old socket association if exists
        if (oldSocketId) {
            this.socketToRoom.delete(oldSocketId);
        }

        // Update player's socket ID
        player.socketId = newSocketId;

        return true;
    }
}
