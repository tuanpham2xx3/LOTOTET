import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import {
    ClientToServerEvents,
    ServerToClientEvents,
    SocketData,
    JoinRoomSchema,
    ApproveJoinSchema,
    RejectJoinSchema,
    UpdateBalanceSchema,
    SetBetAmountSchema,
    SpectateRoomSchema,
    SpectatorRequestJoinSchema,
    ReconnectSchema,
    MarkSchema,
    NoNumberSchema,
    ErrorCode,
    ErrorPayload,
} from '@lototet/shared';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: TypedServer;

    constructor(private roomService: RoomService) { }

    // ==================== Connection Lifecycle ====================

    handleConnection(client: TypedSocket) {
        console.log(`[Gateway] Client connected: ${client.id}`);
    }

    handleDisconnect(client: TypedSocket) {
        console.log(`[Gateway] Client disconnected: ${client.id}`);
        const result = this.roomService.handleDisconnect(client.id);
        if (result) {
            this.broadcastRoomState(result.roomId);
        }
    }

    // ==================== Room Management ====================

    @SubscribeMessage('room:create')
    handleCreateRoom(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        console.log(`[Gateway] room:create from ${client.id}`, payload);

        // Parse payload (optional name and balance)
        let hostName = 'Host';
        let hostBalance = 0;

        if (payload && typeof payload === 'object') {
            const p = payload as { name?: string; balance?: number };
            if (p.name && typeof p.name === 'string') {
                hostName = p.name.trim().substring(0, 20) || 'Host';
            }
            if (p.balance !== undefined && typeof p.balance === 'number') {
                hostBalance = Math.max(0, p.balance);
            }
        }

        const { roomId, state } = this.roomService.createRoom(client.id, hostName, hostBalance);

        client.join(roomId);
        client.data.roomId = roomId;
        client.data.playerId = state.hostId;

        // Send initial state to host
        client.emit('room:state', state);

        return { roomId };
    }

    @SubscribeMessage('room:join')
    handleJoinRoom(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        console.log(`[Gateway] room:join from ${client.id}`, payload);

        // Validate payload
        const parsed = JoinRoomSchema.safeParse(payload);
        if (!parsed.success) {
            const error: ErrorPayload = {
                code: ErrorCode.VALIDATION_ERROR,
                message: 'Invalid payload',
                details: parsed.error.errors,
            };
            return { success: false, error };
        }

        const { roomId, name, balance } = parsed.data;
        const result = this.roomService.handleJoinRequest(roomId, client.id, name, balance);

        if (result.success) {
            // Join the socket room to receive updates
            client.join(roomId);
            client.data.roomId = roomId;

            // Broadcast updated state to room (host sees pending request)
            this.broadcastRoomState(roomId);

            return { success: true };
        }

        return { success: false, error: result.error };
    }

    @SubscribeMessage('room:approveJoin')
    handleApproveJoin(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        console.log(`[Gateway] room:approveJoin from ${client.id}`, payload);

        const parsed = ApproveJoinSchema.safeParse(payload);
        if (!parsed.success) {
            return this.sendError(client, ErrorCode.VALIDATION_ERROR, 'Invalid payload');
        }

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = this.roomService.approveJoin(roomId, parsed.data.requestId, client.id);

        if (result.success) {
            // Set playerId on the approved socket
            const approvedSocketId = result.data.playerSocketId;
            const sockets = this.server.sockets.sockets;
            const approvedSocket = sockets.get(approvedSocketId) as TypedSocket | undefined;
            if (approvedSocket) {
                approvedSocket.data.playerId = result.data.player.id;
            }

            this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('room:rejectJoin')
    handleRejectJoin(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        console.log(`[Gateway] room:rejectJoin from ${client.id}`, payload);

        const parsed = RejectJoinSchema.safeParse(payload);
        if (!parsed.success) {
            return this.sendError(client, ErrorCode.VALIDATION_ERROR, 'Invalid payload');
        }

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = this.roomService.rejectJoin(roomId, parsed.data.requestId, client.id);

        if (result.success) {
            // Notify rejected socket
            const rejectedSocketId = result.data.rejectedSocketId;
            const sockets = this.server.sockets.sockets;
            const rejectedSocket = sockets.get(rejectedSocketId) as TypedSocket | undefined;
            if (rejectedSocket) {
                rejectedSocket.emit('error', {
                    code: ErrorCode.REQUEST_NOT_FOUND,
                    message: 'Your join request was rejected',
                });
                rejectedSocket.leave(roomId);
            }

            this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('room:updateBalance')
    handleUpdateBalance(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        console.log(`[Gateway] room:updateBalance from ${client.id}`, payload);

        const parsed = UpdateBalanceSchema.safeParse(payload);
        if (!parsed.success) {
            return this.sendError(client, ErrorCode.VALIDATION_ERROR, 'Invalid payload');
        }

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = this.roomService.updateBalance(
            roomId,
            parsed.data.playerId,
            parsed.data.balance,
            client.id,
        );

        if (result.success) {
            this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('room:reconnect')
    handleReconnect(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        console.log(`[Gateway] room:reconnect from ${client.id}`, payload);

        const parsed = ReconnectSchema.safeParse(payload);
        if (!parsed.success) {
            const error: ErrorPayload = {
                code: ErrorCode.VALIDATION_ERROR,
                message: 'Invalid payload',
                details: parsed.error.errors,
            };
            return { success: false, error };
        }

        const { roomId, playerId } = parsed.data;
        const result = this.roomService.reconnectPlayer(roomId, playerId, client.id);

        if (result.success) {
            // Join socket room and set client data
            client.join(roomId);
            client.data.roomId = roomId;
            client.data.playerId = playerId;

            // Send current room state to reconnected player
            const room = this.roomService.getRoom(roomId);
            if (room) {
                client.emit('room:state', room);
            }

            console.log(`[Gateway] Player ${playerId} reconnected to room ${roomId}`);
            return { success: true };
        }

        return { success: false, error: result.error };
    }

    @SubscribeMessage('room:setBetAmount')
    handleSetBetAmount(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        console.log(`[Gateway] room:setBetAmount from ${client.id}`, payload);

        const parsed = SetBetAmountSchema.safeParse(payload);
        if (!parsed.success) {
            return this.sendError(client, ErrorCode.VALIDATION_ERROR, 'Invalid payload');
        }

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = this.roomService.setBetAmount(
            roomId,
            parsed.data.amount,
            client.id,
        );

        if (result.success) {
            this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    // ==================== Spectator Mode ====================

    @SubscribeMessage('room:spectate')
    handleSpectate(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        console.log(`[Gateway] room:spectate from ${client.id}`, payload);

        const parsed = SpectateRoomSchema.safeParse(payload);
        if (!parsed.success) {
            const error: ErrorPayload = {
                code: ErrorCode.VALIDATION_ERROR,
                message: 'Invalid payload',
                details: parsed.error.errors,
            };
            return { success: false, error };
        }

        const { roomId } = parsed.data;
        const result = this.roomService.addSpectator(roomId, client.id);

        if (result.success) {
            // Join socket room to receive updates
            client.join(roomId);
            client.data.roomId = roomId;

            // Send current room state to spectator
            const room = this.roomService.getRoom(roomId);
            if (room) {
                client.emit('room:state', room);
            }

            return { success: true };
        }

        return { success: false, error: result.error };
    }

    @SubscribeMessage('spectator:requestJoin')
    handleSpectatorRequestJoin(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        console.log(`[Gateway] spectator:requestJoin from ${client.id}`, payload);

        const parsed = SpectatorRequestJoinSchema.safeParse(payload);
        if (!parsed.success) {
            const error: ErrorPayload = {
                code: ErrorCode.VALIDATION_ERROR,
                message: 'Invalid payload',
                details: parsed.error.errors,
            };
            return { success: false, error };
        }

        const roomId = client.data.roomId;
        if (!roomId) {
            return { success: false, error: { code: ErrorCode.NOT_IN_ROOM, message: 'Not spectating any room' } };
        }

        const { name, balance } = parsed.data;
        const result = this.roomService.spectatorToJoinRequest(roomId, client.id, name, balance);

        if (result.success) {
            // Broadcast updated state (host sees pending request)
            this.broadcastRoomState(roomId);
            return { success: true };
        }

        return { success: false, error: result.error };
    }

    // ==================== Ticket Management ====================

    @SubscribeMessage('ticket:reroll')
    handleTicketReroll(@ConnectedSocket() client: TypedSocket) {
        console.log(`[Gateway] ticket:reroll from ${client.id}`);

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = this.roomService.rerollTicket(roomId, client.id);

        if (result.success) {
            this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('ticket:saveReady')
    handleTicketSaveReady(@ConnectedSocket() client: TypedSocket) {
        console.log(`[Gateway] ticket:saveReady from ${client.id}`);

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = this.roomService.saveTicketReady(roomId, client.id);

        if (result.success) {
            this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    // ==================== Game Flow ====================

    @SubscribeMessage('game:start')
    handleGameStart(@ConnectedSocket() client: TypedSocket) {
        console.log(`[Gateway] game:start from ${client.id}`);

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        // Start game directly from LOBBY (all players must be ready)
        const result = this.roomService.startGame(roomId, client.id);
        if (result.success) {
            this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('turn:draw')
    handleTurnDraw(@ConnectedSocket() client: TypedSocket) {
        console.log(`[Gateway] turn:draw from ${client.id}`);

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = this.roomService.drawNumber(roomId, client.id);

        if (result.success) {
            // Emit turn:new to all players
            this.server.to(roomId).emit('turn:new', {
                turnId: result.data.turnId,
                number: result.data.number,
            });

            this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('turn:mark')
    handleTurnMark(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        console.log(`[Gateway] turn:mark from ${client.id}`, payload);

        const parsed = MarkSchema.safeParse(payload);
        if (!parsed.success) {
            return this.sendError(client, ErrorCode.VALIDATION_ERROR, 'Invalid payload');
        }

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = this.roomService.markCell(
            roomId,
            client.id,
            parsed.data.turnId,
            parsed.data.row,
            parsed.data.col,
        );

        if (result.success) {
            // Broadcast turn progress
            const room = this.roomService.getRoom(roomId);
            if (room?.game) {
                const pendingPlayerIds = this.roomService.getPendingPlayers(room);
                this.server.to(roomId).emit('turn:progress', {
                    turnId: room.game.turnId,
                    pendingPlayerIds,
                });

                // Broadcast waiting board update
                this.server.to(roomId).emit('waiting:update', {
                    waitingBoard: room.game.waitingBoard,
                });
            }

            this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('turn:noNumber')
    handleTurnNoNumber(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        console.log(`[Gateway] turn:noNumber from ${client.id}`, payload);

        const parsed = NoNumberSchema.safeParse(payload);
        if (!parsed.success) {
            return this.sendError(client, ErrorCode.VALIDATION_ERROR, 'Invalid payload');
        }

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = this.roomService.noNumber(roomId, client.id, parsed.data.turnId);

        if (result.success) {
            // Broadcast turn progress
            const room = this.roomService.getRoom(roomId);
            if (room?.game) {
                const pendingPlayerIds = this.roomService.getPendingPlayers(room);
                this.server.to(roomId).emit('turn:progress', {
                    turnId: room.game.turnId,
                    pendingPlayerIds,
                });
            }

            this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('game:bingoClaim')
    handleBingoClaim(@ConnectedSocket() client: TypedSocket) {
        console.log(`[Gateway] game:bingoClaim from ${client.id}`);

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = this.roomService.claimBingo(roomId, client.id);

        if (result.success) {
            // Broadcast game ended
            const room = this.roomService.getRoom(roomId);
            if (room?.winner) {
                this.server.to(roomId).emit('game:ended', {
                    winner: room.winner,
                });
            }

            this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('game:restart')
    handleGameRestart(@ConnectedSocket() client: TypedSocket) {
        console.log(`[Gateway] game:restart from ${client.id}`);

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = this.roomService.restartGame(roomId, client.id);

        if (result.success) {
            this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    // ==================== Helpers ====================

    private broadcastRoomState(roomId: string) {
        const room = this.roomService.getRoom(roomId);
        if (room) {
            this.server.to(roomId).emit('room:state', room);
        }
    }

    private sendError(client: TypedSocket, code: ErrorCode, message: string) {
        client.emit('error', { code, message });
    }
}
