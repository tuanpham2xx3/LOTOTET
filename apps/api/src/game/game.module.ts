import { Module, forwardRef } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { RoomService } from './room.service';
import { RoomManager } from './room.manager';
import { RoomLobbyService } from './room-lobby.service';
import { RoomTicketService } from './room-ticket.service';
import { RoomGameService } from './room-game.service';
import { RoomChatService } from './room-chat.service';
import { RoomCleanupService } from './room-cleanup.service';
import { UploadModule } from '../upload/upload.module';

@Module({
    imports: [forwardRef(() => UploadModule)],
    providers: [
        GameGateway,
        RoomService,
        RoomManager,
        RoomLobbyService,
        RoomTicketService,
        RoomGameService,
        RoomChatService,
        RoomCleanupService,
    ],
    exports: [RoomManager],
})
export class GameModule { }

