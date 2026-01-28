import { z } from 'zod';

/**
 * Zod schemas for runtime validation of Socket.IO payloads
 */

// Join request schema
export const JoinRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(24, 'Name too long'),
  balance: z.number().int().min(0).max(1_000_000),
});

export type JoinRequestPayload = z.infer<typeof JoinRequestSchema>;

// Approve/Reject join request
export const ApproveJoinSchema = z.object({
  requestId: z.string(),
});

export const RejectJoinSchema = z.object({
  requestId: z.string(),
});

// Update balance schema
export const UpdateBalanceSchema = z.object({
  playerId: z.string(),
  balance: z.number().int().min(0).max(1_000_000),
});

export type UpdateBalancePayload = z.infer<typeof UpdateBalanceSchema>;

// Mark cell schema
export const MarkSchema = z.object({
  turnId: z.number().int().nonnegative(),
  row: z.number().int().min(0).max(8),
  col: z.number().int().min(0).max(8),
});

export type MarkPayload = z.infer<typeof MarkSchema>;

// No number schema
export const NoNumberSchema = z.object({
  turnId: z.number().int().nonnegative(),
});

export type NoNumberPayload = z.infer<typeof NoNumberSchema>;

// Join room with code
export const JoinRoomSchema = z.object({
  roomId: z.string(),
  name: z.string().min(1).max(24),
  balance: z.number().int().min(0).max(1_000_000),
});

export type JoinRoomPayload = z.infer<typeof JoinRoomSchema>;

// Set bet amount schema
export const SetBetAmountSchema = z.object({
  amount: z.number().int().min(1, 'Bet must be at least 1').max(1_000_000, 'Bet too high'),
});

export type SetBetAmountPayload = z.infer<typeof SetBetAmountSchema>;

// Spectate room schema
export const SpectateRoomSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
});

export type SpectateRoomPayload = z.infer<typeof SpectateRoomSchema>;

// Spectator request to join as player
export const SpectatorRequestJoinSchema = z.object({
  name: z.string().min(1, 'Name is required').max(24, 'Name too long'),
  balance: z.number().int().min(0).max(1_000_000),
});

export type SpectatorRequestJoinPayload = z.infer<typeof SpectatorRequestJoinSchema>;

