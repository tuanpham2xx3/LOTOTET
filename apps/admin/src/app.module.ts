import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisService } from './redis.service';
import { StatsService } from './stats.service';
import { AlertService } from './alert.service';
import { AdminGateway } from './admin.gateway';
import { AdminController } from './admin.controller';
import { AuthService } from './auth.service';
import { SystemService } from './system.service';

@Module({
    imports: [ScheduleModule.forRoot()],
    controllers: [AdminController],
    providers: [
        RedisService,
        StatsService,
        AlertService,
        AdminGateway,
        AuthService,
        SystemService,
    ],
})
export class AppModule { }
