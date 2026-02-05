import { Injectable, Logger } from '@nestjs/common';
import si from 'systeminformation';

export interface SystemStats {
    cpu: {
        usage: number;  // percentage 0-100
        cores: number;
    };
    memory: {
        total: number;  // bytes
        used: number;
        free: number;
        usagePercent: number;  // 0-100
    };
    disk: {
        total: number;  // bytes
        used: number;
        free: number;
        usagePercent: number;  // 0-100
    };
    uptime: number;  // seconds
}

@Injectable()
export class SystemService {
    private readonly logger = new Logger(SystemService.name);

    /**
     * Get current system stats (CPU, RAM, Disk)
     */
    async getSystemStats(): Promise<SystemStats> {
        try {
            const [cpu, mem, disk, time] = await Promise.all([
                si.currentLoad(),
                si.mem(),
                si.fsSize(),
                si.time(),
            ]);

            // Get main disk (usually C: on Windows, / on Linux)
            const mainDisk = disk[0] || { size: 0, used: 0, available: 0 };

            return {
                cpu: {
                    usage: Math.round(cpu.currentLoad * 10) / 10,
                    cores: cpu.cpus?.length || 1,
                },
                memory: {
                    total: mem.total,
                    used: mem.used,
                    free: mem.free,
                    usagePercent: Math.round((mem.used / mem.total) * 1000) / 10,
                },
                disk: {
                    total: mainDisk.size,
                    used: mainDisk.used,
                    free: mainDisk.available,
                    usagePercent: Math.round((mainDisk.used / mainDisk.size) * 1000) / 10,
                },
                uptime: time.uptime,
            };
        } catch (error) {
            this.logger.error('Failed to get system stats:', error);
            // Return default values on error
            return {
                cpu: { usage: 0, cores: 1 },
                memory: { total: 0, used: 0, free: 0, usagePercent: 0 },
                disk: { total: 0, used: 0, free: 0, usagePercent: 0 },
                uptime: 0,
            };
        }
    }
}
