import { Injectable } from '@nestjs/common';
import { RoomManager } from './room.manager';
import { RoomLobbyService, ServiceResult } from './room-lobby.service';
import { RoomTicketService } from './room-ticket.service';
import { RoomGameService } from './room-game.service';
import { RoomState, Player } from '@lototet/shared';

// Re-export ServiceResult type
export { ServiceResult } from './room-lobby.service';

@Injectable()
export class RoomService {
    constructor(
        private roomManager: RoomManager,
        private lobbyService: RoomLobbyService,
        private ticketService: RoomTicketService,
        private gameService: RoomGameService,
    ) { }

    // ==================== Core Room Operations ====================

    /**
     * Create a new room
     */
    async createRoom(hostSocketId: string, hostName: string = 'Host', hostBalance: number = 0): Promise<{ roomId: string; state: RoomState }> {
        const roomId = await this.roomManager.generateRoomId();
        const state = await this.roomManager.create(roomId, hostSocketId, hostName, hostBalance);
        return { roomId, state };
    }

    /**
     * Get room state
     */
    async getRoom(roomId: string): Promise<RoomState | undefined> {
        return this.roomManager.get(roomId);
    }

    /**
     * Get pending player IDs for current turn
     */
    getPendingPlayers(room: RoomState): string[] {
        return this.gameService.getPendingPlayers(room);
    }

    // ==================== Lobby Operations (delegated) ====================

    handleJoinRequest(roomId: string, socketId: string, name: string, balance: number) {
        return this.lobbyService.handleJoinRequest(roomId, socketId, name, balance);
    }

    approveJoin(roomId: string, requestId: string, hostSocketId: string) {
        return this.lobbyService.approveJoin(roomId, requestId, hostSocketId);
    }

    rejectJoin(roomId: string, requestId: string, hostSocketId: string) {
        return this.lobbyService.rejectJoin(roomId, requestId, hostSocketId);
    }

    updateBalance(roomId: string, playerId: string, balance: number, hostSocketId: string) {
        return this.lobbyService.updateBalance(roomId, playerId, balance, hostSocketId);
    }

    handleDisconnect(socketId: string) {
        return this.lobbyService.handleDisconnect(socketId);
    }

    reconnectPlayer(roomId: string, playerId: string, newSocketId: string) {
        return this.lobbyService.reconnectPlayer(roomId, playerId, newSocketId);
    }

    setBetAmount(roomId: string, amount: number, hostSocketId: string) {
        return this.lobbyService.setBetAmount(roomId, amount, hostSocketId);
    }

    kickPlayer(roomId: string, playerId: string, hostSocketId: string) {
        return this.lobbyService.kickPlayer(roomId, playerId, hostSocketId);
    }

    // ==================== Spectator Operations (delegated) ====================

    addSpectator(roomId: string, socketId: string) {
        return this.lobbyService.addSpectator(roomId, socketId);
    }

    removeSpectator(roomId: string, socketId: string) {
        return this.lobbyService.removeSpectator(roomId, socketId);
    }

    spectatorToJoinRequest(roomId: string, socketId: string, name: string, balance: number) {
        return this.lobbyService.spectatorToJoinRequest(roomId, socketId, name, balance);
    }

    // ==================== Ticket Operations (delegated) ====================

    rerollTicket(roomId: string, socketId: string) {
        return this.ticketService.rerollTicket(roomId, socketId);
    }

    saveTicketReady(roomId: string, socketId: string) {
        return this.ticketService.saveTicketReady(roomId, socketId);
    }

    // ==================== Game Operations (delegated) ====================

    startGame(roomId: string, hostSocketId: string) {
        return this.gameService.startGame(roomId, hostSocketId);
    }

    drawNumber(roomId: string, hostSocketId: string) {
        return this.gameService.drawNumber(roomId, hostSocketId);
    }

    autoDrawNumber(roomId: string) {
        return this.gameService.autoDrawNumber(roomId);
    }

    markCell(roomId: string, socketId: string, turnId: number, row: number, col: number) {
        return this.gameService.markCell(roomId, socketId, turnId, row, col);
    }

    markAnyDrawnNumber(roomId: string, socketId: string, row: number, col: number) {
        return this.gameService.markAnyDrawnNumber(roomId, socketId, row, col);
    }

    noNumber(roomId: string, socketId: string, turnId: number) {
        return this.gameService.noNumber(roomId, socketId, turnId);
    }

    claimBingo(roomId: string, socketId: string) {
        return this.gameService.claimBingo(roomId, socketId);
    }

    restartGame(roomId: string, hostSocketId: string) {
        return this.gameService.restartGame(roomId, hostSocketId);
    }

    forfeitPlayer(roomId: string, socketId: string) {
        return this.gameService.forfeitPlayer(roomId, socketId);
    }

    cancelGame(roomId: string, hostSocketId: string) {
        return this.gameService.cancelGame(roomId, hostSocketId);
    }
}
