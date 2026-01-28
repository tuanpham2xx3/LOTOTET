import type { RoomState, WaitingState } from './types';
import type { ErrorPayload } from './errors';

/**
 * Socket.IO event definitions for type-safe communication
 */

// Client -> Server events
export interface ClientToServerEvents {
  // Room management
  'room:create': (callback: (response: { roomId: string }) => void) => void;
  'room:join': (
    payload: { roomId: string; name: string; balance: number },
    callback: (response: { success: boolean; error?: ErrorPayload }) => void
  ) => void;
  'room:approveJoin': (payload: { requestId: string }) => void;
  'room:rejectJoin': (payload: { requestId: string }) => void;
  'room:updateBalance': (payload: {
    playerId: string;
    balance: number;
  }) => void;
  'room:setBetAmount': (payload: { amount: number }) => void;

  // Spectator mode
  'room:spectate': (
    payload: { roomId: string },
    callback: (response: { success: boolean; error?: ErrorPayload }) => void
  ) => void;
  'spectator:requestJoin': (
    payload: { name: string; balance: number },
    callback: (response: { success: boolean; error?: ErrorPayload }) => void
  ) => void;

  // Ticket management
  'ticket:reroll': () => void;
  'ticket:saveReady': () => void;

  // Game flow
  'game:start': () => void;
  'turn:draw': () => void;
  'turn:mark': (payload: { turnId: number; row: number; col: number }) => void;
  'turn:noNumber': (payload: { turnId: number }) => void;
  'game:bingoClaim': () => void;
  'game:restart': () => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  // Room state updates
  'room:state': (state: RoomState) => void;

  // Turn events
  'turn:new': (payload: { turnId: number; number: number }) => void;
  'turn:progress': (payload: {
    turnId: number;
    pendingPlayerIds: string[];
  }) => void;

  // Game events
  'waiting:update': (payload: { waitingBoard: WaitingState[] }) => void;
  'game:ended': (payload: {
    winner: { playerId: string; playerName: string; winningRow: number };
  }) => void;

  // Error handling
  error: (payload: ErrorPayload) => void;
}

// Socket data (attached to each socket connection)
export interface SocketData {
  playerId?: string;
  roomId?: string;
}
