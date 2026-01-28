import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Ensure uploads directory exists
const uploadsDir = join(process.cwd(), 'uploads', 'audio');
if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
}

@Controller('upload')
export class UploadController {
    @Post('audio')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: uploadsDir,
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
    uploadAudio(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Return URL to access the file
        const audioUrl = `/uploads/audio/${file.filename}`;

        return {
            success: true,
            audioUrl,
            filename: file.filename,
        };
    }
}
