import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class AlertService implements OnModuleInit {
    private readonly logger = new Logger(AlertService.name);
    private bot: TelegramBot | null = null;
    private chatId: string | null = null;
    private enabled = false;

    async onModuleInit() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        this.chatId = process.env.TELEGRAM_CHAT_ID || null;

        if (token && this.chatId) {
            try {
                this.bot = new TelegramBot(token, { polling: false });
                this.enabled = true;
                this.logger.log('✅ Telegram Alert Service initialized');

                // Send startup notification
                await this.sendMessage('🚀 LOTOTET Admin Service started');
            } catch (error) {
                this.logger.error('❌ Failed to initialize Telegram bot:', error);
            }
        } else {
            this.logger.warn('⚠️ Telegram alerts disabled (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
        }
    }

    private async sendMessage(text: string): Promise<void> {
        if (!this.enabled || !this.bot || !this.chatId) return;

        try {
            await this.bot.sendMessage(this.chatId, text, { parse_mode: 'Markdown' });
        } catch (error) {
            this.logger.error('Failed to send Telegram message:', error);
        }
    }

    async sendServerDownAlert(serverId: string): Promise<void> {
        const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        await this.sendMessage(
            `🔴 *LOTOTET Alert*\n\n` +
            `Server \`${serverId}\` went *OFFLINE*\n\n` +
            `⏰ Time: ${timestamp}`
        );
    }

    async sendServerUpAlert(serverId: string): Promise<void> {
        const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        await this.sendMessage(
            `🟢 *LOTOTET Alert*\n\n` +
            `Server \`${serverId}\` is back *ONLINE*\n\n` +
            `⏰ Time: ${timestamp}`
        );
    }

    async sendHighLoadAlert(activeRooms: number, connections: number): Promise<void> {
        const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        await this.sendMessage(
            `⚠️ *LOTOTET Alert*\n\n` +
            `*High Load Detected*\n` +
            `Active Rooms: ${activeRooms}\n` +
            `Connections: ${connections}\n\n` +
            `⏰ Time: ${timestamp}`
        );
    }

    async sendCustomAlert(title: string, message: string): Promise<void> {
        const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        await this.sendMessage(
            `📢 *${title}*\n\n` +
            `${message}\n\n` +
            `⏰ Time: ${timestamp}`
        );
    }
}
