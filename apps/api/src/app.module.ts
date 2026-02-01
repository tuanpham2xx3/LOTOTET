import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from './redis/redis.module';
import { GameModule } from './game/game.module';
import { UploadModule } from './upload/upload.module';

@Module({
    imports: [
        ThrottlerModule.forRoot([{
            ttl: 60000,  // 60 seconds window
            limit: 20,   // Default: 20 requests per 60s
        }]),
        RedisModule,
        GameModule,
        UploadModule,
    ],
})
export class AppModule { }
