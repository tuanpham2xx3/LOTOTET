import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisService } from './redis.service';
import { StatsService } from './stats.service';
import { AlertService } from './alert.service';
import { AdminGateway } from './admin.gateway';
import { AdminController } from './admin.controller';
import { AuthService } from './auth.service';

@Module({
    imports: [ScheduleModule.forRoot()],
    controllers: [AdminController],
    providers: [
        RedisService,
        StatsService,
        AlertService,
        AdminGateway,
        AuthService,
    ],
})
export class AppModule { }
