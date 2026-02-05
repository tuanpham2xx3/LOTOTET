import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * HTTP Request Logging Interceptor
 * Logs all incoming HTTP requests with timing information
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        // Only log HTTP requests, not WebSocket
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();
        const { method, url, ip } = request;
        const userAgent = request.get('user-agent') || '';
        const startTime = Date.now();

        return next.handle().pipe(
            tap({
                next: () => {
                    const { statusCode } = response;
                    const duration = Date.now() - startTime;
                    this.logger.log(
                        `${method} ${url} ${statusCode} - ${duration}ms - ${ip} - ${userAgent.substring(0, 50)}`
                    );
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    const statusCode = error.status || 500;
                    this.logger.warn(
                        `${method} ${url} ${statusCode} - ${duration}ms - ${ip} - ${error.message}`
                    );
                },
            }),
        );
    }
}
