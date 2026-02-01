import { Injectable } from '@nestjs/common';
import { RoomManager } from './room.manager';
import { ChatMessage, ErrorCode, ErrorPayload } from '@lototet/shared';

export type ChatResult<T> =
    | { success: true; data: T }
    | { success: false; error: ErrorPayload };

@Injectable()
export class RoomChatService {
    constructor(private roomManager: RoomManager) { }

    /**
     * Send a chat message to the room
     */
    async sendMessage(
        roomId: string,
        socketId: string,
        content: string,
        audioUrl?: string,
    ): Promise<ChatResult<{ message: ChatMessage }>> {
        const room = await this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        // Find player by socket ID
        const player = this.roomManager.findPlayerBySocketId(room, socketId);

        if (!player) {
            return {
                success: false,
                error: { code: ErrorCode.PLAYER_NOT_FOUND, message: 'Player not found' },
            };
        }

        // Create chat message
        const message: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            playerId: player.id,
            playerName: player.name,
            content,
            audioUrl,
            timestamp: Date.now(),
        };

        // Add to room messages
        room.messages.push(message);

        // Limit to last 100 messages
        if (room.messages.length > 100) {
            room.messages = room.messages.slice(-100);
        }

        await this.roomManager.update(roomId, room);

        return { success: true, data: { message } };
    }
}
