import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Types
interface OverviewStats {
    totalConnections: number;
    totalRoomsCreated: number;
    totalGamesPlayed: number;
    activeRooms: number;
    activeServers: number;
    totalCurrentConnections: number;
}

interface ServerInfo {
    serverId: string;
    connections: number;
    lastHeartbeat: number;
    isOnline: boolean;
    systemStats?: {
        cpu: { usage: number; cores: number };
        memory: { total: number; used: number; usagePercent: number };
        disk: { total: number; used: number; usagePercent: number };
        uptime: number;
    };
}

interface RoomInfo {
    roomId: string;
    hostName: string;
    playerCount: number;
    status: string;
    betAmount: number;
}

interface DailyStats {
    date: string;
    connections: number;
    roomsCreated: number;
    gamesPlayed: number;
}

interface SystemStats {
    cpu: {
        usage: number;
        cores: number;
    };
    memory: {
        total: number;
        used: number;
        free: number;
        usagePercent: number;
    };
    disk: {
        total: number;
        used: number;
        free: number;
        usagePercent: number;
    };
    uptime: number;
}

interface DashboardStats {
    overview: OverviewStats;
    servers: ServerInfo[];
    rooms: RoomInfo[];
    last7Days: DailyStats[];
    systemStats: SystemStats;
}

// Get API URL from environment or default
const API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4000';

// Helper function to format bytes to human readable
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper function to format uptime
function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [error, setError] = useState<string>('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month' | 'all'>('day');
    const [periodStats, setPeriodStats] = useState<Array<{ label: string; connections: number; roomsCreated: number; gamesPlayed: number }>>([]);

    // Connect to socket on mount
    useEffect(() => {
        const newSocket = io(API_URL, {
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log('Connected to admin server');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from admin server');
            setIsConnected(false);
        });

        newSocket.on('admin:stats', (data: DashboardStats) => {
            setStats(data);
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    const handleLogin = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!socket || !password.trim()) return;

        setIsLoading(true);
        setError('');

        socket.emit('admin:login', { password }, (response: { success: boolean; error?: string; stats?: DashboardStats }) => {
            setIsLoading(false);

            if (response.success) {
                setIsLoggedIn(true);
                if (response.stats) {
                    setStats(response.stats);
                }
                // Subscribe to realtime updates
                socket.emit('admin:subscribe');
            } else {
                setError(response.error || 'Đăng nhập thất bại');
            }
        });
    }, [socket, password]);

    const handleLogout = useCallback(() => {
        if (socket) {
            socket.emit('admin:logout');
        }
        setIsLoggedIn(false);
        setStats(null);
        setPassword('');
    }, [socket]);

    // Fetch stats by period
    const fetchStatsByPeriod = useCallback((period: 'day' | 'week' | 'month' | 'all') => {
        if (!socket) return;
        socket.emit('admin:getStatsByPeriod', { period }, (response: { success: boolean; stats?: typeof periodStats }) => {
            if (response.success && response.stats) {
                setPeriodStats(response.stats);
            }
        });
    }, [socket]);

    // Fetch period stats when period changes
    useEffect(() => {
        if (isLoggedIn && socket) {
            fetchStatsByPeriod(chartPeriod);
        }
    }, [chartPeriod, isLoggedIn, socket, fetchStatsByPeriod]);

    // Login Page
    if (!isLoggedIn) {
        return (
            <div className="login-container">
                <div className="login-box">
                    <h1>🎯 LOTOTET</h1>
                    <p>Admin Dashboard</p>

                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            placeholder="Nhập mật khẩu admin"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" disabled={isLoading || !isConnected}>
                            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </button>
                    </form>

                    <div className="connection-status" style={{ marginTop: '20px', justifyContent: 'center' }}>
                        <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
                        <span>{isConnected ? 'Đã kết nối server' : 'Đang kết nối...'}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Dashboard
    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>🎯 <span>LOTOTET</span> Admin Dashboard</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="connection-status">
                        <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
                        <span>{isConnected ? 'Realtime' : 'Offline'}</span>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        Đăng xuất
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="icon">🔗</div>
                    <div className="value">{stats?.overview.totalCurrentConnections || 0}</div>
                    <div className="label">Kết nối hiện tại</div>
                </div>
                <div className="stat-card">
                    <div className="icon">🏠</div>
                    <div className="value">{stats?.overview.activeRooms || 0}</div>
                    <div className="label">Phòng đang hoạt động</div>
                </div>
                <div className="stat-card">
                    <div className="icon">🎮</div>
                    <div className="value">{stats?.overview.totalGamesPlayed || 0}</div>
                    <div className="label">Tổng games đã chơi</div>
                </div>
                <div className="stat-card">
                    <div className="icon">💻</div>
                    <div className="value">{stats?.overview.activeServers || 0}</div>
                    <div className="label">Servers online</div>
                </div>
                <div className="stat-card">
                    <div className="icon">📊</div>
                    <div className="value">{stats?.overview.totalConnections || 0}</div>
                    <div className="label">Tổng lượt truy cập</div>
                </div>
                <div className="stat-card">
                    <div className="icon">🏗️</div>
                    <div className="value">{stats?.overview.totalRoomsCreated || 0}</div>
                    <div className="label">Tổng phòng đã tạo</div>
                </div>
            </div>

            {/* Panels */}
            <div className="panels-grid">
                {/* Server Status */}
                <div className="panel">
                    <h2>💚 Server Status</h2>
                    <div className="server-list">
                        {stats?.servers.length ? (
                            stats.servers.map((server) => (
                                <div key={server.serverId} className="server-item-expanded">
                                    <div className="server-header">
                                        <div className="server-info">
                                            <span className={`server-status ${server.isOnline ? 'online' : 'offline'}`}></span>
                                            <span>{server.serverId}</span>
                                        </div>
                                        <div className="server-connections">
                                            <strong>{server.connections}</strong> connections
                                        </div>
                                    </div>
                                    {server.systemStats && (
                                        <div className="server-system-stats">
                                            <div className="mini-stat">
                                                <span className="mini-label">🖥️ CPU</span>
                                                <div className="mini-progress">
                                                    <div className="mini-bar cpu" style={{ width: `${server.systemStats.cpu.usage}%` }} />
                                                </div>
                                                <span className="mini-value">{server.systemStats.cpu.usage.toFixed(1)}%</span>
                                                <span className="mini-info">{server.systemStats.cpu.cores} cores</span>
                                            </div>
                                            <div className="mini-stat">
                                                <span className="mini-label">💾 RAM</span>
                                                <div className="mini-progress">
                                                    <div className="mini-bar ram" style={{ width: `${server.systemStats.memory.usagePercent}%` }} />
                                                </div>
                                                <span className="mini-value">{server.systemStats.memory.usagePercent.toFixed(1)}%</span>
                                                <span className="mini-info">{formatBytes(server.systemStats.memory.used)} / {formatBytes(server.systemStats.memory.total)}</span>
                                            </div>
                                            <div className="mini-stat">
                                                <span className="mini-label">💿 Disk</span>
                                                <div className="mini-progress">
                                                    <div className="mini-bar disk" style={{ width: `${server.systemStats.disk.usagePercent}%` }} />
                                                </div>
                                                <span className="mini-value">{server.systemStats.disk.usagePercent.toFixed(1)}%</span>
                                                <span className="mini-info">{formatBytes(server.systemStats.disk.used)} / {formatBytes(server.systemStats.disk.total)}</span>
                                            </div>
                                            <div className="mini-stat">
                                                <span className="mini-label">⏱️ Up</span>
                                                <span className="mini-value uptime">{formatUptime(server.systemStats.uptime)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">Không có server nào đang hoạt động</div>
                        )}
                    </div>
                </div>

                {/* Active Rooms */}
                <div className="panel">
                    <h2>🏠 Active Rooms</h2>
                    <div className="room-list">
                        {stats?.rooms.length ? (
                            stats.rooms.map((room) => (
                                <div key={room.roomId} className="room-item">
                                    <div className="room-info">
                                        <span className="room-id">{room.roomId}</span>
                                        <span className="room-host">Host: {room.hostName}</span>
                                    </div>
                                    <div className="room-meta">
                                        <span className="room-players">👥 {room.playerCount}</span>
                                        <span className={`room-status ${room.status}`}>
                                            {room.status === 'LOBBY' ? '⏳ Lobby' : room.status === 'PLAYING' ? '🎮 Playing' : room.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">Không có phòng nào đang hoạt động</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="panel">
                <div className="chart-header">
                    <h2>📊 Thống kê</h2>
                    <div className="period-tabs">
                        <button
                            className={`period-tab ${chartPeriod === 'day' ? 'active' : ''}`}
                            onClick={() => setChartPeriod('day')}
                        >
                            Ngày
                        </button>
                        <button
                            className={`period-tab ${chartPeriod === 'week' ? 'active' : ''}`}
                            onClick={() => setChartPeriod('week')}
                        >
                            Tuần
                        </button>
                        <button
                            className={`period-tab ${chartPeriod === 'month' ? 'active' : ''}`}
                            onClick={() => setChartPeriod('month')}
                        >
                            Tháng
                        </button>
                        <button
                            className={`period-tab ${chartPeriod === 'all' ? 'active' : ''}`}
                            onClick={() => setChartPeriod('all')}
                        >
                            Tất cả
                        </button>
                    </div>
                </div>
                <div className="chart-container">
                    {periodStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={periodStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="label"
                                    stroke="rgba(255,255,255,0.5)"
                                />
                                <YAxis stroke="rgba(255,255,255,0.5)" />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(0,0,0,0.8)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                    }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="connections"
                                    stroke="#ffd700"
                                    strokeWidth={2}
                                    name="Lượt truy cập"
                                    dot={{ fill: '#ffd700' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="roomsCreated"
                                    stroke="#4caf50"
                                    strokeWidth={2}
                                    name="Phòng tạo"
                                    dot={{ fill: '#4caf50' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="gamesPlayed"
                                    stroke="#2196f3"
                                    strokeWidth={2}
                                    name="Games chơi"
                                    dot={{ fill: '#2196f3' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="loading">Đang tải dữ liệu...</div>
                    )}
                </div>
            </div>
        </div>
    );
}
