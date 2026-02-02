import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const logger = new Logger('AdminBootstrap');
    const app = await NestFactory.create(AppModule);

    // Enable CORS for admin dashboard
    app.enableCors({
        origin: '*',
        credentials: true,
    });

    const port = process.env.ADMIN_PORT || 4000;
    await app.listen(port);

    logger.log(`🎯 Admin Dashboard API running on http://localhost:${port}`);
}

bootstrap();
