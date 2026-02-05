import { Injectable } from '@nestjs/common';
import si from 'systeminformation';

export interface SystemStats {
    cpu: {
        usage: number;
        cores: number;
    };
    memory: {
        total: number;
        used: number;
        usagePercent: number;
    };
    disk: {
        total: number;
        used: number;
        usagePercent: number;
    };
    uptime: number;
}

@Injectable()
export class SystemStatsService {
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
            const mainDisk = disk[0] || { size: 0, used: 0 };

            return {
                cpu: {
                    usage: Math.round(cpu.currentLoad * 10) / 10,
                    cores: cpu.cpus?.length || 1,
                },
                memory: {
                    total: mem.total,
                    used: mem.used,
                    usagePercent: Math.round((mem.used / mem.total) * 1000) / 10,
                },
                disk: {
                    total: mainDisk.size,
                    used: mainDisk.used,
                    usagePercent: Math.round((mainDisk.used / mainDisk.size) * 1000) / 10,
                },
                uptime: time.uptime,
            };
        } catch {
            return {
                cpu: { usage: 0, cores: 1 },
                memory: { total: 0, used: 0, usagePercent: 0 },
                disk: { total: 0, used: 0, usagePercent: 0 },
                uptime: 0,
            };
        }
    }
}
