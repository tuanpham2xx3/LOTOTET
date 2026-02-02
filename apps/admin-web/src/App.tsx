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

interface DashboardStats {
    overview: OverviewStats;
    servers: ServerInfo[];
    rooms: RoomInfo[];
    last7Days: DailyStats[];
}

// Get API URL from environment or default
const API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4000';

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [error, setError] = useState<string>('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

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
                                <div key={server.serverId} className="server-item">
                                    <div className="server-info">
                                        <span className={`server-status ${server.isOnline ? 'online' : 'offline'}`}></span>
                                        <span>{server.serverId}</span>
                                    </div>
                                    <div className="server-connections">
                                        <strong>{server.connections}</strong> connections
                                    </div>
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
                <h2>📊 Thống kê 7 ngày gần nhất</h2>
                <div className="chart-container">
                    {stats?.last7Days ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.last7Days}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="rgba(255,255,255,0.5)"
                                    tickFormatter={(value) => value.split('-').slice(1).join('/')}
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
