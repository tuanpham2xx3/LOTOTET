/**
 * Error codes for the LOTOTET game
 */
export enum ErrorCode {
  // Authorization errors
  NOT_HOST = 'NOT_HOST',
  NOT_IN_ROOM = 'NOT_IN_ROOM',

  // Room errors
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  INVALID_PHASE = 'INVALID_PHASE',

  // Game flow errors
  NOT_READY_ALL = 'NOT_READY_ALL',
  TURN_NOT_ACTIVE = 'TURN_NOT_ACTIVE',
  ALREADY_RESPONDED = 'ALREADY_RESPONDED',

  // Action errors
  INVALID_MARK = 'INVALID_MARK',
  CANNOT_NO_NUMBER_HAVE_NUMBER = 'CANNOT_NO_NUMBER_HAVE_NUMBER',
  INVALID_BINGO_CLAIM = 'INVALID_BINGO_CLAIM',

  // Request errors
  REQUEST_NOT_FOUND = 'REQUEST_NOT_FOUND',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_TICKET = 'INVALID_TICKET',
}

/**
 * Error response payload
 */
export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  details?: unknown;
}
