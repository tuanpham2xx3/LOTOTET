/**
 * Core TypeScript type definitions for LOTOTET game
 */

/**
 * Ticket: 9x9 grid where each cell is either a number (1-90) or null
 * - Each row has exactly 5 numbers
 * - Each column has 3-6 numbers
 * - Column ranges: col 0 (1-9), col 1 (10-19), ..., col 8 (80-90)
 */
export type Ticket = (number | null)[][];

/**
 * Room phases during the game lifecycle
 */
export enum RoomPhase {
  LOBBY = 'LOBBY',
  TICKET_PICK = 'TICKET_PICK',
  PLAYING = 'PLAYING',
  ENDED = 'ENDED',
}

/**
 * Player status in the room
 */
export enum PlayerStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
}

/**
 * Turn response types
 */
export type TurnResponse = 'MARKED' | 'NO_NUMBER';

/**
 * Player in the game room
 */
export interface Player {
  id: string;
  socketId: string;
  name: string;
  balance: number;
  isHost: boolean;
  status: PlayerStatus;
  ready: boolean;
  ticket?: Ticket;
  marked?: boolean[][]; // 9x9 grid of marked cells
  respondedTurnId?: number; // Last turn this player responded to
}

/**
 * Pending join request
 */
export interface JoinRequest {
  requestId: string;
  socketId: string;
  name: string;
  balance: number;
  createdAt: number;
}

/**
 * Waiting state for a player (when 4/5 in a row)
 */
export interface WaitingState {
  playerId: string;
  playerName: string;
  waitingNumbers: number[]; // Numbers still needed for bingo
  row: number; // Which row they're waiting on
}

/**
 * Game state during active gameplay
 */
export interface GameState {
  turnId: number;
  activeNumber?: number;
  drawnNumbers: number[];
  turnResponses: Record<string, TurnResponse>; // playerId -> response
  waitingBoard: WaitingState[]; // Players waiting for specific numbers
}

/**
 * Complete room state
 */
export interface RoomState {
  roomId: string;
  phase: RoomPhase;
  hostId: string;
  players: Player[];
  pendingRequests: JoinRequest[];
  game?: GameState;
  betAmount?: number; // Số tiền cược mỗi ván
  winner?: {
    playerId: string;
    playerName: string;
    winningRow: number;
    prize: number; // Số tiền thắng
  };
}
