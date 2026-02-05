import {
    Controller,
    Post,
    Body,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('audio')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, callback) => {
                    // roomId should be in the body, but multer processes file first
                    // We'll handle this in the controller method
                    // For now, use a temp location
                    const tempDir = process.cwd() + '/uploads/audio/temp';
                    const fs = require('fs');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }
                    callback(null, tempDir);
                },
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname) || '.webm';
                    callback(null, `audio-${uniqueSuffix}${ext}`);
                },
            }),
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB max
            },
            fileFilter: (req, file, callback) => {
                // Accept audio files
                if (file.mimetype.startsWith('audio/')) {
                    callback(null, true);
                } else {
                    callback(new BadRequestException('Only audio files are allowed'), false);
                }
            },
        }),
    )
    async uploadAudio(
        @UploadedFile() file: Express.Multer.File,
        @Body('roomId') roomId: string,
        @Body('socketId') socketId: string,
    ) {
        // Validate required fields
        if (!roomId || !socketId) {
            // Clean up temp file
            if (file) {
                const fs = require('fs');
                fs.unlinkSync(file.path);
            }
            throw new BadRequestException('roomId and socketId are required');
        }

        // Validate socket is in room
        const validation = await this.uploadService.validateSocketInRoom(roomId, socketId);
        if (!validation.valid) {
            // Clean up temp file
            if (file) {
                const fs = require('fs');
                fs.unlinkSync(file.path);
            }
            throw new BadRequestException(validation.error);
        }

        // Check rate limit
        const rateCheck = await this.uploadService.checkRateLimit(validation.playerId!);
        if (!rateCheck.allowed) {
            // Clean up temp file
            if (file) {
                const fs = require('fs');
                fs.unlinkSync(file.path);
            }
            throw new HttpException(
                {
                    success: false,
                    error: 'Too many uploads. Try again later.',
                    retryAfter: rateCheck.retryAfter,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Move file from temp to room directory
        const fs = require('fs');
        const path = require('path');
        const roomDir = this.uploadService.ensureRoomDir(roomId);
        const newPath = path.join(roomDir, file.filename);

        fs.renameSync(file.path, newPath);

        // Return URL to access the file
        const audioUrl = `/uploads/audio/${roomId}/${file.filename}`;

        return {
            success: true,
            audioUrl,
            filename: file.filename,
            roomId,
        };
    }
}
