import { Injectable, Logger } from '@nestjs/common';
import { RoomState, RoomPhase, Player, PlayerStatus, generateTicket } from '@lototet/shared';
import { RedisService } from '../redis/redis.service';

/**
 * Room Manager - Hybrid storage (Redis + In-Memory fallback)
 * Uses Redis when available, falls back to in-memory for development
 */
@Injectable()
export class RoomManager {
    private readonly logger = new Logger(RoomManager.name);

    // In-memory fallback when Redis is not available
    private memoryRooms = new Map<string, RoomState>();
    private memorySocketToRoom = new Map<string, string>();

    constructor(private readonly redis: RedisService) { }

    /**
     * Check if Redis is available
     */
    private useRedis(): boolean {
        return this.redis.isConnected();
    }

    /**
     * Generate a unique 6-character room code
     */
    async generateRoomId(): Promise<string> {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let roomId: string;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            roomId = Array.from(
                { length: 6 },
                () => chars[Math.floor(Math.random() * chars.length)],
            ).join('');
            attempts++;

            const exists = this.useRedis()
                ? await this.redis.roomExists(roomId)
                : this.memoryRooms.has(roomId);

            if (!exists) break;
        } while (attempts < maxAttempts);

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
    async create(roomId: string, hostSocketId: string, hostName: string = 'Host', hostBalance: number = 0): Promise<RoomState> {
        const hostId = this.generatePlayerId();
        const now = Date.now();

        const host: Player = {
            id: hostId,
            socketId: hostSocketId,
            name: hostName,
            balance: hostBalance,
            isHost: true,
            status: PlayerStatus.APPROVED,
            ready: false,
            ticket: generateTicket(),
        };

        const room: RoomState = {
            roomId,
            phase: RoomPhase.LOBBY,
            hostId,
            players: [host],
            pendingRequests: [],
            spectators: [],
            messages: [],
            createdAt: now,
            lastActivityAt: now,
        };

        if (this.useRedis()) {
            await this.redis.setRoom(roomId, room);
            await this.redis.setSocketRoom(hostSocketId, roomId);
            this.logger.debug(`Room ${roomId} created in Redis`);
        } else {
            this.memoryRooms.set(roomId, room);
            this.memorySocketToRoom.set(hostSocketId, roomId);
            this.logger.debug(`Room ${roomId} created in memory (Redis not available)`);
        }

        return room;
    }

    /**
     * Get room by ID
     */
    async get(roomId: string): Promise<RoomState | undefined> {
        if (this.useRedis()) {
            const room = await this.redis.getRoom(roomId);
            return room || undefined;
        }
        return this.memoryRooms.get(roomId);
    }

    /**
     * Get room by socket ID
     */
    async getBySocketId(socketId: string): Promise<RoomState | undefined> {
        const roomId = await this.getRoomIdBySocketId(socketId);
        if (!roomId) return undefined;
        return this.get(roomId);
    }

    /**
     * Get roomId by socket ID
     */
    async getRoomIdBySocketId(socketId: string): Promise<string | undefined> {
        if (this.useRedis()) {
            const roomId = await this.redis.getSocketRoom(socketId);
            return roomId || undefined;
        }
        return this.memorySocketToRoom.get(socketId);
    }

    /**
     * Update room state
     */
    async update(roomId: string, state: RoomState): Promise<void> {
        if (this.useRedis()) {
            await this.redis.setRoom(roomId, state);
        } else {
            this.memoryRooms.set(roomId, state);
        }
    }

    /**
     * Associate a socket with a room
     */
    async associateSocket(socketId: string, roomId: string): Promise<void> {
        if (this.useRedis()) {
            await this.redis.setSocketRoom(socketId, roomId);
        } else {
            this.memorySocketToRoom.set(socketId, roomId);
        }
    }

    /**
     * Remove socket association
     */
    async removeSocket(socketId: string): Promise<void> {
        if (this.useRedis()) {
            await this.redis.deleteSocket(socketId);
        } else {
            this.memorySocketToRoom.delete(socketId);
        }
    }

    /**
     * Delete a room
     */
    async delete(roomId: string): Promise<void> {
        const room = await this.get(roomId);
        if (room) {
            // Clean up all socket associations
            for (const player of room.players) {
                await this.removeSocket(player.socketId);
            }
            for (const request of room.pendingRequests) {
                await this.removeSocket(request.socketId);
            }
        }

        if (this.useRedis()) {
            await this.redis.deleteRoom(roomId);
        } else {
            this.memoryRooms.delete(roomId);
        }
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
    async updatePlayerSocketId(room: RoomState, playerId: string, newSocketId: string, oldSocketId?: string): Promise<boolean> {
        const player = this.findPlayerById(room, playerId);
        if (!player) return false;

        // Remove old socket association if exists
        if (oldSocketId) {
            await this.removeSocket(oldSocketId);
        }

        // Update player's socket ID
        player.socketId = newSocketId;

        return true;
    }

    /**
     * Get all rooms (for cleanup service)
     */
    async getAllRooms(): Promise<Map<string, RoomState>> {
        if (this.useRedis()) {
            return this.redis.getAllRooms();
        }
        return this.memoryRooms;
    }

    /**
     * Update room's last activity timestamp
     */
    async updateActivity(roomId: string): Promise<void> {
        if (this.useRedis()) {
            await this.redis.updateActivity(roomId);
        } else {
            const room = this.memoryRooms.get(roomId);
            if (room) {
                room.lastActivityAt = Date.now();
            }
        }
    }

    /**
     * Set host disconnected timestamp
     */
    async setHostDisconnected(roomId: string): Promise<void> {
        if (this.useRedis()) {
            await this.redis.setHostDisconnected(roomId);
        } else {
            const room = this.memoryRooms.get(roomId);
            if (room) {
                room.hostDisconnectedAt = Date.now();
            }
        }
    }

    /**
     * Clear host disconnected timestamp (when host reconnects)
     */
    async clearHostDisconnected(roomId: string): Promise<void> {
        if (this.useRedis()) {
            await this.redis.clearHostDisconnected(roomId);
        } else {
            const room = this.memoryRooms.get(roomId);
            if (room) {
                room.hostDisconnectedAt = undefined;
            }
        }
    }
}
