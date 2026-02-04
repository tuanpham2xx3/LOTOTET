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
import { RoomChatService } from './room-chat.service';
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
import { WsRateLimiter, RATE_LIMITS } from './rate-limiter';
import { RoomManager } from './room.manager';
import { RedisService } from '../redis/redis.service';

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

    private rateLimiter = new WsRateLimiter();
    private readonly serverId = process.env.SERVER_ID || `server-${process.env.PORT || '3011'}`;
    private connectionCount = 0;

    // Queue mechanism to handle race condition when multiple players respond simultaneously
    // Key: roomId, Value: timeout handle for debounced draw check
    private pendingDrawChecks: Map<string, NodeJS.Timeout> = new Map();
    private readonly DRAW_CHECK_DELAY_MS = 100; // Wait 100ms to collect all responses

    constructor(
        private roomService: RoomService,
        private chatService: RoomChatService,
        private roomManager: RoomManager,
        private redis: RedisService,
    ) {
        // Register server on startup
        this.registerServer();
    }

    private async registerServer() {
        await this.redis.setServerInfo(this.serverId, {
            port: parseInt(process.env.PORT || '3011'),
            version: '1.0.0',
        });
        // Start heartbeat
        this.startHeartbeat();
    }

    private startHeartbeat() {
        setInterval(async () => {
            await this.redis.updateServerHeartbeat(this.serverId);
        }, 30000); // Every 30 seconds
    }

    // ==================== Connection Lifecycle ====================

    async handleConnection(client: TypedSocket) {
        console.log(`[Gateway] Client connected: ${client.id}`);
        this.connectionCount++;
        await this.redis.incrementTotalConnections();
        await this.redis.setServerConnections(this.serverId, this.connectionCount);
    }

    async handleDisconnect(client: TypedSocket) {
        console.log(`[Gateway] Client disconnected: ${client.id}`);
        this.connectionCount = Math.max(0, this.connectionCount - 1);
        await this.redis.setServerConnections(this.serverId, this.connectionCount);

        const result = await this.roomService.handleDisconnect(client.id);
        if (result) {
            await this.broadcastRoomState(result.roomId);
        }
    }

    // ==================== Room Management ====================

    @SubscribeMessage('room:create')
    async handleCreateRoom(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        // Rate limit: 10 requests per 60s
        const ip = WsRateLimiter.getClientIp(client);
        if (!this.rateLimiter.isAllowed(ip, 'room:create', 10, 60000)) {
            return this.sendError(client, ErrorCode.VALIDATION_ERROR, 'Bạn đang tạo phòng quá nhanh. Vui lòng đợi.');
        }

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

        const { roomId, state } = await this.roomService.createRoom(client.id, hostName, hostBalance);

        // Track stats
        await this.redis.incrementTotalRoomsCreated();

        client.join(roomId);
        client.data.roomId = roomId;
        client.data.playerId = state.hostId;

        // Send initial state to host
        client.emit('room:state', state);

        return { roomId };
    }

    @SubscribeMessage('room:join')
    async handleJoinRoom(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        // Rate limit: 10 requests per 60s
        const ip = WsRateLimiter.getClientIp(client);
        if (!this.rateLimiter.isAllowed(ip, 'room:join', 10, 60000)) {
            return { success: false, error: { code: ErrorCode.VALIDATION_ERROR, message: 'Bạn đang gửi request quá nhanh. Vui lòng đợi.' } };
        }

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
        const result = await this.roomService.handleJoinRequest(roomId, client.id, name, balance);

        if (result.success) {
            // Join the socket room to receive updates
            client.join(roomId);
            client.data.roomId = roomId;

            // Broadcast updated state to room (host sees pending request)
            await this.broadcastRoomState(roomId);

            return { success: true };
        }

        return { success: false, error: result.error };
    }

    @SubscribeMessage('room:approveJoin')
    async handleApproveJoin(
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

        const result = await this.roomService.approveJoin(roomId, parsed.data.requestId, client.id);

        if (result.success) {
            // Set playerId on the approved socket
            const approvedSocketId = result.data.playerSocketId;
            const sockets = this.server.sockets.sockets;
            const approvedSocket = sockets.get(approvedSocketId) as TypedSocket | undefined;
            if (approvedSocket) {
                approvedSocket.data.playerId = result.data.player.id;
            }

            await this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('room:rejectJoin')
    async handleRejectJoin(
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

        const result = await this.roomService.rejectJoin(roomId, parsed.data.requestId, client.id);

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

            await this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('room:updateBalance')
    async handleUpdateBalance(
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

        const result = await this.roomService.updateBalance(
            roomId,
            parsed.data.playerId,
            parsed.data.balance,
            client.id,
        );

        if (result.success) {
            await this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('room:kickPlayer')
    async handleKickPlayer(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        console.log(`[Gateway] room:kickPlayer from ${client.id}`, payload);

        // Validate payload
        if (!payload || typeof payload !== 'object' || !('playerId' in payload)) {
            return this.sendError(client, ErrorCode.VALIDATION_ERROR, 'Invalid payload');
        }

        const { playerId } = payload as { playerId: string };

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = await this.roomService.kickPlayer(roomId, playerId, client.id);

        if (result.success) {
            const { kickedSocketId, kickedName } = result.data;

            // Notify kicked player before disconnecting
            const kickedSocket = this.server.sockets.sockets.get(kickedSocketId);
            if (kickedSocket) {
                // Emit special kicked event for proper handling on client
                kickedSocket.emit('player:kicked', {
                    reason: 'Bạn đã bị đuổi khỏi phòng',
                });
                kickedSocket.leave(roomId);

                // Delay disconnect to allow client to receive and process event
                setTimeout(() => {
                    kickedSocket.disconnect(true);
                }, 1000);
            }

            // Broadcast updated state
            await this.broadcastRoomState(roomId);

            return { success: true, kickedName };
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('room:reconnect')
    async handleReconnect(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        // No rate limit for reconnect
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
        const result = await this.roomService.reconnectPlayer(roomId, playerId, client.id);

        if (result.success) {
            // Join socket room and set client data
            client.join(roomId);
            client.data.roomId = roomId;
            client.data.playerId = playerId;

            // Send current room state to reconnected player
            const room = await this.roomService.getRoom(roomId);
            if (room) {
                client.emit('room:state', room);
            }

            console.log(`[Gateway] Player ${playerId} reconnected to room ${roomId}`);
            return { success: true };
        }

        return { success: false, error: result.error };
    }

    @SubscribeMessage('room:setBetAmount')
    async handleSetBetAmount(
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

        const result = await this.roomService.setBetAmount(
            roomId,
            parsed.data.amount,
            client.id,
        );

        if (result.success) {
            await this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    // ==================== Spectator Mode ====================

    @SubscribeMessage('room:spectate')
    async handleSpectate(
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
        const result = await this.roomService.addSpectator(roomId, client.id);

        if (result.success) {
            // Join socket room to receive updates
            client.join(roomId);
            client.data.roomId = roomId;

            // Send current room state to spectator
            const room = await this.roomService.getRoom(roomId);
            if (room) {
                client.emit('room:state', room);
            }

            return { success: true };
        }

        return { success: false, error: result.error };
    }

    @SubscribeMessage('spectator:requestJoin')
    async handleSpectatorRequestJoin(
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
        const result = await this.roomService.spectatorToJoinRequest(roomId, client.id, name, balance);

        if (result.success) {
            // Broadcast updated state (host sees pending request)
            await this.broadcastRoomState(roomId);
            return { success: true };
        }

        return { success: false, error: result.error };
    }

    // ==================== Ticket Management ====================

    @SubscribeMessage('ticket:reroll')
    async handleTicketReroll(@ConnectedSocket() client: TypedSocket) {
        console.log(`[Gateway] ticket:reroll from ${client.id}`);

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = await this.roomService.rerollTicket(roomId, client.id);

        if (result.success) {
            await this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('ticket:saveReady')
    async handleTicketSaveReady(@ConnectedSocket() client: TypedSocket) {
        console.log(`[Gateway] ticket:saveReady from ${client.id}`);

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = await this.roomService.saveTicketReady(roomId, client.id);

        if (result.success) {
            await this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    // ==================== Game Flow ====================

    @SubscribeMessage('game:start')
    async handleGameStart(@ConnectedSocket() client: TypedSocket) {
        console.log(`[Gateway] game:start from ${client.id}`);

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        // Start game directly from LOBBY (all players must be ready)
        const result = await this.roomService.startGame(roomId, client.id);
        if (result.success) {
            await this.broadcastRoomState(roomId);

            // Auto-draw first number immediately
            const drawResult = await this.roomService.autoDrawNumber(roomId);
            if (drawResult.success) {
                // Emit turn:new to all players
                this.server.to(roomId).emit('turn:new', {
                    turnId: drawResult.data.turnId,
                    number: drawResult.data.number,
                });
                await this.broadcastRoomState(roomId);
            }
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('turn:draw')
    async handleTurnDraw(@ConnectedSocket() client: TypedSocket) {
        console.log(`[Gateway] turn:draw from ${client.id}`);

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = await this.roomService.drawNumber(roomId, client.id);

        if (result.success) {
            // Emit turn:new to all players
            this.server.to(roomId).emit('turn:new', {
                turnId: result.data.turnId,
                number: result.data.number,
            });

            await this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('turn:mark')
    async handleTurnMark(
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

        const result = await this.roomService.markCell(
            roomId,
            client.id,
            parsed.data.turnId,
            parsed.data.row,
            parsed.data.col,
        );

        if (result.success) {
            // Broadcast turn progress
            const room = await this.roomService.getRoom(roomId);
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

            await this.broadcastRoomState(roomId);
            await this.checkAndAutoDrawNextNumber(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('turn:markAny')
    async handleTurnMarkAny(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        console.log(`[Gateway] turn:markAny from ${client.id}`, payload);

        // Validate payload - only need row and col
        if (!payload || typeof payload !== 'object' || !('row' in payload) || !('col' in payload)) {
            return this.sendError(client, ErrorCode.VALIDATION_ERROR, 'Invalid payload');
        }

        const { row, col } = payload as { row: number; col: number };

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = await this.roomService.markAnyDrawnNumber(
            roomId,
            client.id,
            row,
            col,
        );

        if (result.success) {
            // Broadcast turn progress
            const room = await this.roomService.getRoom(roomId);
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

            await this.broadcastRoomState(roomId);
            await this.checkAndAutoDrawNextNumber(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('turn:noNumber')
    async handleTurnNoNumber(
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

        const result = await this.roomService.noNumber(roomId, client.id, parsed.data.turnId);

        if (result.success) {
            // Broadcast turn progress
            const room = await this.roomService.getRoom(roomId);
            if (room?.game) {
                const pendingPlayerIds = this.roomService.getPendingPlayers(room);
                this.server.to(roomId).emit('turn:progress', {
                    turnId: room.game.turnId,
                    pendingPlayerIds,
                });
            }

            await this.broadcastRoomState(roomId);
            await this.checkAndAutoDrawNextNumber(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('game:bingoClaim')
    async handleBingoClaim(@ConnectedSocket() client: TypedSocket) {
        // Rate limit: 3 requests per 10s
        const ip = WsRateLimiter.getClientIp(client);
        if (!this.rateLimiter.isAllowed(ip, 'game:bingoClaim', 3, 10000)) {
            return this.sendError(client, ErrorCode.VALIDATION_ERROR, 'Bạn đang gửi request quá nhanh.');
        }

        console.log(`[Gateway] game:bingoClaim from ${client.id}`);

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = await this.roomService.claimBingo(roomId, client.id);

        if (result.success) {
            // Track stats - game completed
            await this.redis.incrementTotalGamesPlayed();

            // Broadcast game ended
            const room = await this.roomService.getRoom(roomId);
            if (room?.winner) {
                this.server.to(roomId).emit('game:ended', {
                    winner: room.winner,
                });
            }

            await this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    @SubscribeMessage('game:restart')
    async handleGameRestart(@ConnectedSocket() client: TypedSocket) {
        console.log(`[Gateway] game:restart from ${client.id}`);

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        const result = await this.roomService.restartGame(roomId, client.id);

        if (result.success) {
            await this.broadcastRoomState(roomId);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    // ==================== Chat ====================

    @SubscribeMessage('chat:send')
    async handleChatSend(
        @ConnectedSocket() client: TypedSocket,
        @MessageBody() payload: unknown,
    ) {
        // Rate limit: 10 messages per 10s
        const ip = WsRateLimiter.getClientIp(client);
        if (!this.rateLimiter.isAllowed(ip, 'chat:send', 10, 10000)) {
            return this.sendError(client, ErrorCode.VALIDATION_ERROR, 'Bạn đang gửi tin nhắn quá nhanh.');
        }

        console.log(`[Gateway] chat:send from ${client.id}`, payload);

        const roomId = client.data.roomId;
        if (!roomId) {
            return this.sendError(client, ErrorCode.NOT_IN_ROOM, 'Not in room');
        }

        // Validate payload
        if (!payload || typeof payload !== 'object' || !('content' in payload)) {
            return this.sendError(client, ErrorCode.VALIDATION_ERROR, 'Invalid payload');
        }

        const { content, audioUrl } = payload as { content: string; audioUrl?: string };

        const result = await this.chatService.sendMessage(roomId, client.id, content, audioUrl);

        if (result.success) {
            // Broadcast message to all in room
            this.server.to(roomId).emit('chat:message', result.data.message);
        } else {
            return this.sendError(client, result.error.code, result.error.message);
        }
    }

    // ==================== Helpers ====================

    private async broadcastRoomState(roomId: string) {
        const room = await this.roomService.getRoom(roomId);
        if (room) {
            // Update activity timestamp on every state change
            await this.roomManager.updateActivity(roomId);
            this.server.to(roomId).emit('room:state', room);
        }
    }

    private sendError(client: TypedSocket, code: ErrorCode, message: string) {
        client.emit('error', { code, message });
    }

    /**
     * Schedule a debounced draw check for a room
     * This ensures all player responses are collected before deciding to auto-draw
     */
    private scheduleDrawCheck(roomId: string) {
        // Clear any existing pending check for this room
        const existingTimeout = this.pendingDrawChecks.get(roomId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Schedule a new check after delay
        const timeout = setTimeout(async () => {
            this.pendingDrawChecks.delete(roomId);
            await this.executeDrawCheck(roomId);
        }, this.DRAW_CHECK_DELAY_MS);

        this.pendingDrawChecks.set(roomId, timeout);
        console.log(`[Gateway] scheduleDrawCheck: Scheduled draw check for room ${roomId} in ${this.DRAW_CHECK_DELAY_MS}ms`);
    }

    /**
     * Execute the actual draw check after debounce delay
     */
    private async executeDrawCheck(roomId: string) {
        const room = await this.roomService.getRoom(roomId);
        console.log(`[Gateway] executeDrawCheck: roomId=${roomId}, turnId=${room?.game?.turnId}, phase=${room?.phase}`);

        if (!room?.game || room.game.turnId === 0) {
            console.log(`[Gateway] executeDrawCheck: Skipping - no game or turnId is 0`);
            return;
        }

        const pendingPlayerIds = this.roomService.getPendingPlayers(room);
        console.log(`[Gateway] executeDrawCheck: pendingPlayerIds=${JSON.stringify(pendingPlayerIds)}, players=${JSON.stringify(room.players.map(p => ({ id: p.id, name: p.name, respondedTurnId: p.respondedTurnId })))}`);

        if (pendingPlayerIds.length === 0) {
            console.log(`[Gateway] executeDrawCheck: All players responded, auto-drawing next number`);

            // Check if ALL players responded with NO_NUMBER
            const allNoNumber = room.players.every(p => room.game!.turnResponses[p.id] === 'NO_NUMBER');

            // Delay before drawing: 2s if all NO_NUMBER, 1s otherwise
            const delayMs = allNoNumber ? 2000 : 1000;
            console.log(`[Gateway] executeDrawCheck: Waiting ${delayMs}ms before auto-draw (allNoNumber=${allNoNumber})`);
            await this.delay(delayMs);

            // All players responded, auto-draw next number
            const drawResult = await this.roomService.autoDrawNumber(roomId);
            console.log(`[Gateway] executeDrawCheck: drawResult success=${drawResult.success}`);
            if (drawResult.success) {
                // Emit turn:new to all players
                this.server.to(roomId).emit('turn:new', {
                    turnId: drawResult.data.turnId,
                    number: drawResult.data.number,
                });
                // Broadcast updated room state
                await this.broadcastRoomState(roomId);
            }
        } else {
            console.log(`[Gateway] executeDrawCheck: Still waiting for ${pendingPlayerIds.length} players`);
        }
    }

    /**
     * Helper delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if all players have responded and auto-draw the next number
     * Uses debounced scheduling to handle race conditions
     */
    private async checkAndAutoDrawNextNumber(roomId: string) {
        this.scheduleDrawCheck(roomId);
    }
}
