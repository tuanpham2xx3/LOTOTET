import { Injectable } from '@nestjs/common';
import { RoomManager } from './room.manager';
import {
    RoomState,
    RoomPhase,
    Player,
    ErrorCode,
    ErrorPayload,
    generateTicket,
} from '@lototet/shared';

export type ServiceResult<T> =
    | { success: true; data: T }
    | { success: false; error: ErrorPayload };

@Injectable()
export class RoomGameService {
    constructor(private roomManager: RoomManager) { }

    /**
     * Start the game (host only, all players must be ready)
     * Now starts directly from LOBBY phase
     */
    async startGame(roomId: string, hostSocketId: string): Promise<ServiceResult<void>> {
        const room = await this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        if (!this.roomManager.isHost(room, hostSocketId)) {
            return {
                success: false,
                error: { code: ErrorCode.NOT_HOST, message: 'Only host can start game' },
            };
        }

        if (room.phase !== RoomPhase.LOBBY) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Game can only be started from lobby' },
            };
        }

        const allReady = room.players.every((p) => p.ready);

        if (!allReady) {
            return {
                success: false,
                error: { code: ErrorCode.NOT_READY_ALL, message: 'Not all players ready' },
            };
        }

        // Validate all players have enough balance for bet
        const betAmount = room.betAmount || 0;
        console.log(`[Game] Starting game. room.betAmount = ${room.betAmount}, betAmount = ${betAmount}`);

        // Save initial balances for leaderboard
        room.initialBalances = {};
        for (const player of room.players) {
            room.initialBalances[player.id] = player.balance;
        }

        if (betAmount > 0) {
            for (const player of room.players) {
                if (player.balance < betAmount) {
                    return {
                        success: false,
                        error: {
                            code: ErrorCode.INSUFFICIENT_BALANCE,
                            message: `${player.name} không đủ tiền (cần ${betAmount}, có ${player.balance})`,
                        },
                    };
                }
            }
            // Deduct bet from all players
            for (const player of room.players) {
                console.log(`[Game] Deducting ${betAmount} from ${player.name}: ${player.balance} -> ${player.balance - betAmount}`);
                player.balance -= betAmount;
            }
        }

        room.phase = RoomPhase.PLAYING;
        room.game = {
            turnId: 0,
            drawnNumbers: [],
            turnResponses: {},
            waitingBoard: [],
        };
        await this.roomManager.update(roomId, room);

        return { success: true, data: undefined };
    }

    /**
     * Draw next number (host only)
     */
    async drawNumber(roomId: string, hostSocketId: string): Promise<ServiceResult<{ number: number; turnId: number }>> {
        const room = await this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        if (!this.roomManager.isHost(room, hostSocketId)) {
            return {
                success: false,
                error: { code: ErrorCode.NOT_HOST, message: 'Only host can draw' },
            };
        }

        if (room.phase !== RoomPhase.PLAYING || !room.game) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Game not active' },
            };
        }

        // Check if all players have responded to the previous turn
        // Skip this check for the first turn (turnId === 0)
        if (room.game.turnId > 0) {
            const pendingPlayers = this.getPendingPlayers(room);
            if (pendingPlayers.length > 0) {
                const pendingNames = room.players
                    .filter((p) => pendingPlayers.includes(p.id))
                    .map((p) => p.name)
                    .join(', ');
                return {
                    success: false,
                    error: {
                        code: ErrorCode.TURN_NOT_ACTIVE,
                        message: `Đợi phản hồi từ: ${pendingNames}`,
                    },
                };
            }
        }

        // Get all available numbers (1-90 minus already drawn)
        const allNumbers = Array.from({ length: 90 }, (_, i) => i + 1);
        const available = allNumbers.filter((n) => !room.game!.drawnNumbers.includes(n));

        if (available.length === 0) {
            return {
                success: false,
                error: { code: ErrorCode.TURN_NOT_ACTIVE, message: 'No more numbers' },
            };
        }

        // Draw random number
        const number = available[Math.floor(Math.random() * available.length)];
        room.game.drawnNumbers.push(number);
        room.game.turnId++;
        room.game.activeNumber = number;
        room.game.turnResponses = {};

        // Reset player turn responses
        for (const player of room.players) {
            player.respondedTurnId = undefined;
        }

        await this.roomManager.update(roomId, room);

        return { success: true, data: { number, turnId: room.game.turnId } };
    }

    /**
     * Auto-draw next number (called by server when all players respond)
     * Similar to drawNumber but doesn't require host authentication
     */
    async autoDrawNumber(roomId: string): Promise<ServiceResult<{ number: number; turnId: number }>> {
        const room = await this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        if (room.phase !== RoomPhase.PLAYING || !room.game) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Game not active' },
            };
        }

        // Get all available numbers (1-90 minus already drawn)
        const allNumbers = Array.from({ length: 90 }, (_, i) => i + 1);
        const available = allNumbers.filter((n) => !room.game!.drawnNumbers.includes(n));

        if (available.length === 0) {
            return {
                success: false,
                error: { code: ErrorCode.TURN_NOT_ACTIVE, message: 'No more numbers' },
            };
        }

        // Draw random number
        const number = available[Math.floor(Math.random() * available.length)];
        room.game.drawnNumbers.push(number);
        room.game.turnId++;
        room.game.activeNumber = number;
        room.game.turnResponses = {};

        // Reset player turn responses
        for (const player of room.players) {
            player.respondedTurnId = undefined;
        }

        await this.roomManager.update(roomId, room);

        return { success: true, data: { number, turnId: room.game.turnId } };
    }

    /**
     * Mark a cell on player's ticket
     */
    async markCell(
        roomId: string,
        socketId: string,
        turnId: number,
        row: number,
        col: number,
    ): Promise<ServiceResult<{ hasWaitingUpdate: boolean }>> {
        const room = await this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        if (room.phase !== RoomPhase.PLAYING || !room.game) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Game not active' },
            };
        }

        if (room.game.turnId !== turnId) {
            return {
                success: false,
                error: { code: ErrorCode.TURN_NOT_ACTIVE, message: 'Invalid turn' },
            };
        }

        const player = this.roomManager.findPlayerBySocketId(room, socketId);

        if (!player) {
            return {
                success: false,
                error: { code: ErrorCode.PLAYER_NOT_FOUND, message: 'Player not found' },
            };
        }

        if (player.respondedTurnId === turnId) {
            return {
                success: false,
                error: { code: ErrorCode.ALREADY_RESPONDED, message: 'Already responded' },
            };
        }

        // Validate mark
        if (!player.ticket || player.ticket[row][col] !== room.game.activeNumber) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_MARK, message: 'Invalid cell to mark' },
            };
        }

        // Mark the cell
        if (player.marked) {
            player.marked[row][col] = true;
        }
        player.respondedTurnId = turnId;
        room.game.turnResponses[player.id] = 'MARKED';

        // Check for waiting state (4/5 in a row)
        this.updateWaitingBoard(room);

        await this.roomManager.update(roomId, room);

        return { success: true, data: { hasWaitingUpdate: true } };
    }

    /**
     * Mark a cell containing any drawn number (for reconnect scenarios)
     * This allows players to mark numbers they missed while disconnected
     */
    async markAnyDrawnNumber(
        roomId: string,
        socketId: string,
        row: number,
        col: number,
    ): Promise<ServiceResult<{ hasWaitingUpdate: boolean }>> {
        const room = await this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        if (room.phase !== RoomPhase.PLAYING || !room.game) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Game not active' },
            };
        }

        const player = this.roomManager.findPlayerBySocketId(room, socketId);

        if (!player) {
            return {
                success: false,
                error: { code: ErrorCode.PLAYER_NOT_FOUND, message: 'Player not found' },
            };
        }

        // Validate the cell contains a number that has been drawn
        const cellValue = player.ticket?.[row]?.[col];
        if (cellValue === null || cellValue === undefined) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_MARK, message: 'Empty cell' },
            };
        }

        if (!room.game.drawnNumbers.includes(cellValue)) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_MARK, message: 'Number not yet drawn' },
            };
        }

        // Check if already marked
        if (player.marked?.[row]?.[col]) {
            return {
                success: false,
                error: { code: ErrorCode.ALREADY_RESPONDED, message: 'Cell already marked' },
            };
        }

        // Mark the cell
        if (player.marked) {
            player.marked[row][col] = true;
        }

        // If this is the current active number, mark as responded
        if (cellValue === room.game.activeNumber) {
            player.respondedTurnId = room.game.turnId;
            room.game.turnResponses[player.id] = 'MARKED';
        }

        // Check for waiting state (4/5 in a row)
        this.updateWaitingBoard(room);

        await this.roomManager.update(roomId, room);

        return { success: true, data: { hasWaitingUpdate: true } };
    }

    /**
     * Player has no matching number
     */
    async noNumber(
        roomId: string,
        socketId: string,
        turnId: number,
    ): Promise<ServiceResult<void>> {
        // Use lock to prevent race condition when multiple players respond simultaneously
        return this.roomManager.withLock(roomId, async () => {
            const room = await this.roomManager.get(roomId);

            if (!room) {
                return {
                    success: false,
                    error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
                };
            }

            if (room.phase !== RoomPhase.PLAYING || !room.game) {
                return {
                    success: false,
                    error: { code: ErrorCode.INVALID_PHASE, message: 'Game not active' },
                };
            }

            if (room.game.turnId !== turnId) {
                return {
                    success: false,
                    error: { code: ErrorCode.TURN_NOT_ACTIVE, message: 'Invalid turn' },
                };
            }

            const player = this.roomManager.findPlayerBySocketId(room, socketId);

            if (!player) {
                return {
                    success: false,
                    error: { code: ErrorCode.PLAYER_NOT_FOUND, message: 'Player not found' },
                };
            }

            if (player.respondedTurnId === turnId) {
                return {
                    success: false,
                    error: { code: ErrorCode.ALREADY_RESPONDED, message: 'Already responded' },
                };
            }

            // Verify player really doesn't have the number
            if (player.ticket) {
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        if (player.ticket[r][c] === room.game.activeNumber && !player.marked?.[r][c]) {
                            return {
                                success: false,
                                error: {
                                    code: ErrorCode.CANNOT_NO_NUMBER_HAVE_NUMBER,
                                    message: 'You have this number on your ticket',
                                },
                            };
                        }
                    }
                }
            }

            player.respondedTurnId = turnId;
            room.game.turnResponses[player.id] = 'NO_NUMBER';
            await this.roomManager.update(roomId, room);

            return { success: true, data: undefined };
        });
    }

    /**
     * Claim BINGO
     */
    async claimBingo(roomId: string, socketId: string): Promise<ServiceResult<{ winningRow: number }>> {
        const room = await this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        if (room.phase !== RoomPhase.PLAYING || !room.game) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Game not active' },
            };
        }

        const player = this.roomManager.findPlayerBySocketId(room, socketId);

        if (!player) {
            return {
                success: false,
                error: { code: ErrorCode.PLAYER_NOT_FOUND, message: 'Player not found' },
            };
        }

        // Check if player has a complete row
        const winningRow = this.checkBingo(player);

        if (winningRow === -1) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_BINGO_CLAIM, message: 'No bingo found' },
            };
        }

        // Calculate prize and award to winner
        const betAmount = room.betAmount || 0;
        const prize = betAmount * room.players.length;
        console.log(`[Game] ${player.name} wins! Prize: ${prize} = ${betAmount} x ${room.players.length} players`);
        console.log(`[Game] ${player.name} balance: ${player.balance} -> ${player.balance + prize}`);
        player.balance += prize;

        // Game ends
        room.phase = RoomPhase.ENDED;
        room.winner = {
            playerId: player.id,
            playerName: player.name,
            winningRow,
            prize,
        };
        await this.roomManager.update(roomId, room);

        return { success: true, data: { winningRow } };
    }

    /**
     * Restart game (host only)
     */
    async restartGame(roomId: string, hostSocketId: string): Promise<ServiceResult<void>> {
        const room = await this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        if (!this.roomManager.isHost(room, hostSocketId)) {
            return {
                success: false,
                error: { code: ErrorCode.NOT_HOST, message: 'Only host can restart' },
            };
        }

        // Reset to lobby
        room.phase = RoomPhase.LOBBY;
        room.game = undefined;
        room.winner = undefined;

        for (const player of room.players) {
            player.ticket = generateTicket();
            player.marked = Array(9).fill(null).map(() => Array(9).fill(false));
            player.ready = false;
            player.respondedTurnId = undefined;
        }

        await this.roomManager.update(roomId, room);

        return { success: true, data: undefined };
    }

    /**
     * Get pending player IDs for current turn
     */
    getPendingPlayers(room: RoomState): string[] {
        if (!room.game) return [];
        return room.players
            .filter((p) => !p.forfeited && p.respondedTurnId !== room.game!.turnId)
            .map((p) => p.id);
    }

    /**
     * Get count of active (non-forfeited) players
     */
    getActivePlayerCount(room: RoomState): number {
        return room.players.filter((p) => !p.forfeited).length;
    }

    /**
     * Player forfeits (gives up) during game
     * - Player is removed from room
     * - Their bet stays in pot
     * - If only 1 player remains, they win automatically
     */
    async forfeitPlayer(roomId: string, socketId: string): Promise<ServiceResult<{
        forfeitedPlayer: Player;
        autoWin?: { winner: Player; prize: number };
    }>> {
        const room = await this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        if (room.phase !== RoomPhase.PLAYING || !room.game) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Game not active' },
            };
        }

        const player = this.roomManager.findPlayerBySocketId(room, socketId);

        if (!player) {
            return {
                success: false,
                error: { code: ErrorCode.PLAYER_NOT_FOUND, message: 'Player not found' },
            };
        }

        if (player.isHost) {
            return {
                success: false,
                error: { code: ErrorCode.NOT_HOST, message: 'Host cannot forfeit, use cancel instead' },
            };
        }

        if (player.forfeited) {
            return {
                success: false,
                error: { code: ErrorCode.ALREADY_RESPONDED, message: 'Already forfeited' },
            };
        }

        // Mark player as forfeited
        player.forfeited = true;
        console.log(`[Game] ${player.name} forfeited in room ${roomId}`);

        // Remove player from room
        room.players = room.players.filter((p) => p.id !== player.id);

        // Check for auto-win condition (only 1 active player left)
        const activePlayers = room.players.filter((p) => !p.forfeited);
        let autoWin: { winner: Player; prize: number } | undefined;

        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            const betAmount = room.betAmount || 0;
            // Prize = total pot (all original players' bets)
            // We need to count forfeited player + remaining players
            const totalPlayers = room.players.length + 1; // +1 for the player we just removed
            const prize = betAmount * totalPlayers;

            console.log(`[Game] Auto-win: ${winner.name} wins! Prize: ${prize}`);
            winner.balance += prize;

            room.phase = RoomPhase.ENDED;
            room.winner = {
                playerId: winner.id,
                playerName: winner.name,
                winningRow: -1, // No winning row, won by forfeit
                prize,
            };

            autoWin = { winner, prize };
        }

        await this.roomManager.update(roomId, room);

        return { success: true, data: { forfeitedPlayer: player, autoWin } };
    }

    /**
     * Host cancels the game
     * - Refunds all bets to players (using initialBalances)
     * - Returns to LOBBY phase
     */
    async cancelGame(roomId: string, hostSocketId: string): Promise<ServiceResult<void>> {
        const room = await this.roomManager.get(roomId);

        if (!room) {
            return {
                success: false,
                error: { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
            };
        }

        if (!this.roomManager.isHost(room, hostSocketId)) {
            return {
                success: false,
                error: { code: ErrorCode.NOT_HOST, message: 'Only host can cancel game' },
            };
        }

        if (room.phase !== RoomPhase.PLAYING) {
            return {
                success: false,
                error: { code: ErrorCode.INVALID_PHASE, message: 'Game not active' },
            };
        }

        console.log(`[Game] Host cancelled game in room ${roomId}`);

        // Restore initial balances for all players
        if (room.initialBalances) {
            for (const player of room.players) {
                if (room.initialBalances[player.id] !== undefined) {
                    console.log(`[Game] Restoring ${player.name} balance: ${player.balance} -> ${room.initialBalances[player.id]}`);
                    player.balance = room.initialBalances[player.id];
                }
            }
        }

        // Reset to lobby
        room.phase = RoomPhase.LOBBY;
        room.game = undefined;
        room.winner = undefined;

        for (const player of room.players) {
            player.ticket = generateTicket();
            player.marked = Array(9).fill(null).map(() => Array(9).fill(false));
            player.ready = false;
            player.respondedTurnId = undefined;
            player.forfeited = undefined;
        }

        await this.roomManager.update(roomId, room);

        return { success: true, data: undefined };
    }

    // Private helpers

    private checkBingo(player: Player): number {
        if (!player.ticket || !player.marked) return -1;

        for (let row = 0; row < 9; row++) {
            let markedCount = 0;
            let numberCount = 0;

            for (let col = 0; col < 9; col++) {
                if (player.ticket[row][col] !== null) {
                    numberCount++;
                    if (player.marked[row][col]) {
                        markedCount++;
                    }
                }
            }

            // Row has 5 numbers and all are marked
            if (numberCount === 5 && markedCount === 5) {
                return row;
            }
        }

        return -1;
    }

    private updateWaitingBoard(room: RoomState): void {
        if (!room.game) return;

        room.game.waitingBoard = [];

        for (const player of room.players) {
            if (!player.ticket || !player.marked) continue;

            for (let row = 0; row < 9; row++) {
                let markedCount = 0;
                const waitingNumbers: number[] = [];

                for (let col = 0; col < 9; col++) {
                    if (player.ticket[row][col] !== null) {
                        if (player.marked[row][col]) {
                            markedCount++;
                        } else {
                            waitingNumbers.push(player.ticket[row][col] as number);
                        }
                    }
                }

                // 4 marked, 1 waiting = waiting state
                if (markedCount === 4 && waitingNumbers.length === 1) {
                    room.game.waitingBoard.push({
                        playerId: player.id,
                        playerName: player.name,
                        waitingNumbers,
                        row,
                    });
                }
            }
        }
    }
}
