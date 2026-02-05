import { Module, forwardRef } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { GameModule } from '../game/game.module';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [forwardRef(() => GameModule), RedisModule],
    controllers: [UploadController],
    providers: [UploadService],
    exports: [UploadService],
})
export class UploadModule { }
