import { Module } from '@nestjs/common';
import { GameModule } from './game/game.module';
import { UploadModule } from './upload/upload.module';

@Module({
    imports: [GameModule, UploadModule],
})
export class AppModule { }
