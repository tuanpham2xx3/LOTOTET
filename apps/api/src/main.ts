import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Enable CORS for frontend
    app.enableCors({
        origin: '*',
        credentials: true,
    });

    // Serve static files from uploads folder
    app.useStaticAssets(join(process.cwd(), 'uploads'), {
        prefix: '/uploads/',
    });

    const port = process.env.PORT || 3010;
    await app.listen(port);
    console.log(`🚀 LOTOTET Backend running on http://localhost:${port}`);
}
bootstrap();

