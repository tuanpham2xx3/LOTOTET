import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

/**
 * Check if origin is allowed
 * Allowed patterns:
 * - *.iceteadev.site (any subdomain)
 * - localhost:* (any port)
 */
function isAllowedOrigin(origin: string | undefined): boolean {
    if (!origin) return true; // Allow requests without origin (e.g., mobile apps, Postman)

    // localhost with any port
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return true;
    }

    // *.iceteadev.site (including iceteadev.site itself)
    if (/^https?:\/\/([a-zA-Z0-9-]+\.)?iceteadev\.site(:\d+)?$/.test(origin)) {
        return true;
    }

    return false;
}

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Enable CORS with origin validation
    app.enableCors({
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) {
                callback(null, true);
            } else {
                console.warn(`[CORS] Blocked origin: ${origin}`);
                callback(null, false);
            }
        },
        credentials: true,
    });

    // Enable graceful shutdown
    app.enableShutdownHooks();

    // Serve static files from uploads folder
    app.useStaticAssets(join(process.cwd(), 'uploads'), {
        prefix: '/uploads/',
    });

    const port = process.env.PORT || 3010;
    await app.listen(port);
    console.log(`🚀 LOTOTET Backend running on http://localhost:${port}`);
}
bootstrap();

