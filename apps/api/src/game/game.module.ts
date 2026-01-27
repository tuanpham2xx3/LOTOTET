import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { RoomService } from './room.service';
import { RoomManager } from './room.manager';
import { RoomLobbyService } from './room-lobby.service';
import { RoomTicketService } from './room-ticket.service';
import { RoomGameService } from './room-game.service';

@Module({
    providers: [
        GameGateway,
        RoomService,
        RoomManager,
        RoomLobbyService,
        RoomTicketService,
        RoomGameService,
    ],
})
export class GameModule { }
