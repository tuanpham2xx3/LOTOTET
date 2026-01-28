import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS for frontend
    app.enableCors({
        origin: '*',
        credentials: true,
    });

    const port = process.env.PORT || 3010;
    await app.listen(port);
    console.log(`🚀 LOTOTET Backend running on http://localhost:${port}`);
}
bootstrap();
