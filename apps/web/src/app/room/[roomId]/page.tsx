'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RoomPhase } from '@lototet/shared';
import {
    useGameStore,
    useRoomState,
    useMyPlayer,
    useIsHost,
    useCurrentTurn,
    useConnected,
    useNotification,
    useClearNotification,
} from '@/stores/gameStore';
import { LobbyView, PlayingView, EndedView, GameMenu, PendingRequestsFloat } from '@/components/Room';
import { ChatBox } from '@/components/Chat';
import { formatNumber, formatBalance } from '@/lib/utils';
import { getServerForRoom } from '@/lib/socket';
import AnnouncementBanner from '@/components/AnnouncementBanner';

// Component hiển thị form join phòng hoặc trạng thái chờ duyệt
function JoinRoomForm({
    roomId,
    onJoinSuccess,
}: {
    roomId: string;
    onJoinSuccess: () => void;
}) {
    const { connect, socket, connected } = useGameStore();
    const router = useRouter();
    const [name, setName] = useState('');
    const [balance, setBalance] = useState(100000);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Trạng thái: 'form' = chưa gửi request, 'waiting' = đã gửi và đang chờ duyệt
    const [state, setState] = useState<'form' | 'waiting'>('form');

    const sessionKey = `lototet_pending_${roomId}`;

    // Initialize socket connection (with load balancer)
    const ensureConnected = async () => {
        if (!connected) {
            // Query load balancer for correct server URL
            const serverUrl = await getServerForRoom(roomId.toUpperCase());
            connect(serverUrl);
        }
        return useGameStore.getState().socket;
    };

    // Clear pending request from storage
    const clearPendingRequest = () => {
        sessionStorage.removeItem(sessionKey);
    };

    // Submit join request
    const submitJoinRequest = async (playerName: string, playerBalance: number) => {
        setLoading(true);
        setError(null);

        try {
            const s = await ensureConnected();
            if (!s) {
                setError('Không thể kết nối server');
                setLoading(false);
                return;
            }

            // Wait for socket to connect
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
                if (s.connected) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    s.once('connect', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                }
            });

            // Join room - gửi request, chờ host duyệt
            s.emit('room:join', { roomId: roomId.toUpperCase(), name: playerName, balance: playerBalance }, (response: { success: boolean; error?: { message: string } }) => {
                setLoading(false);
                if (response.success) {
                    // Lưu thông tin pending request vào sessionStorage
                    sessionStorage.setItem(sessionKey, JSON.stringify({ name: playerName, balance: playerBalance }));
                    // Request đã được gửi, chờ host duyệt
                    setState('waiting');
                    setName(playerName);
                    setBalance(playerBalance);
                } else {
                    setError(response.error?.message || 'Không thể vào phòng');
                    clearPendingRequest();
                }
            });
        } catch (err) {
            setError('Lỗi kết nối');
            setLoading(false);
        }
    };

    // Check for saved pending request on mount and auto-resubmit
    useEffect(() => {
        const savedRequest = sessionStorage.getItem(sessionKey);
        if (savedRequest && connected) {
            try {
                const { name: savedName, balance: savedBalance } = JSON.parse(savedRequest);
                if (savedName && savedBalance) {
                    // Auto-submit the request again (socket ID changed after refresh)
                    submitJoinRequest(savedName, savedBalance);
                }
            } catch {
                clearPendingRequest();
            }
        }
    }, [connected]);

    // Listen for rejection or approval
    useEffect(() => {
        if (!socket || state !== 'waiting') return;

        const handleError = (payload: { code: string; message: string }) => {
            // Request bị từ chối
            if (payload.code === 'REQUEST_NOT_FOUND' || payload.message?.includes('rejected')) {
                setError('Yêu cầu của bạn đã bị từ chối');
                setState('form');
                clearPendingRequest();
            }
        };

        const handleRoomState = (roomState: { players: Array<{ socketId: string }> }) => {
            // Kiểm tra xem socket hiện tại có trong danh sách players không
            // Nếu có nghĩa là đã được duyệt (không còn trong pendingRequests nữa)
            const myPlayer = roomState.players.find((p) => p.socketId === socket.id);
            if (myPlayer) {
                clearPendingRequest();
                onJoinSuccess();
            }
            // Nếu không tìm thấy, có nghĩa là vẫn đang pending - tiếp tục chờ
        };

        socket.on('error', handleError);
        socket.on('room:state', handleRoomState);

        return () => {
            socket.off('error', handleError);
            socket.off('room:state', handleRoomState);
        };
    }, [socket, state, onJoinSuccess]);

    const handleJoin = async () => {
        if (!name.trim()) {
            setError('Vui lòng nhập tên');
            return;
        }

        await submitJoinRequest(name, balance);
    };

    const handleCancel = () => {
        setState('form');
        router.push('/');
    };

    // Trạng thái chờ host duyệt
    if (state === 'waiting') {
        return (
            <main className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md animate-fadeInUp">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <img
                            src="/logo.png"
                            alt="LOTOTET"
                            className="w-56 h-32 md:w-64 md:h-40 mx-auto"
                        />
                    </div>

                    {/* Card */}
                    <div className="card-traditional p-6">
                        <div className="text-center">
                            {/* Room ID Badge */}
                            <div
                                className="inline-block px-4 py-2 rounded-lg font-mono text-lg text-amber-200 mb-6"
                                style={{
                                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                    border: '2px solid #d4a000',
                                }}
                            >
                                {roomId.toUpperCase()}
                            </div>

                            {/* Loading Animation */}
                            <div className="mb-4">
                                <img
                                    src="/menu_btn.svg"
                                    alt="Loading"
                                    className="w-16 h-16 animate-spin mx-auto"
                                    style={{ animationDuration: '1s' }}
                                />
                            </div>

                            {/* Waiting Message */}
                            <h2 className="text-xl font-bold text-amber-400 mb-2">
                                Đang chờ duyệt
                            </h2>
                            <p className="text-amber-200/70 text-sm mb-6">
                                Chủ phòng sẽ duyệt yêu cầu của bạn...
                            </p>

                            {/* Player Info */}
                            <div
                                className="rounded-lg p-3 mb-4"
                                style={{
                                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid rgba(212, 160, 0, 0.5)',
                                }}
                            >
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-amber-200/60">Tên:</span>
                                    <span className="text-amber-200 font-medium">{name}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm mt-2">
                                    <span className="text-amber-200/60">Số dư:</span>
                                    <span className="text-amber-400 font-medium flex items-center gap-1">
                                        {formatBalance(balance)}
                                        <img src="/coin.svg" alt="" className="w-4 h-4" />
                                    </span>
                                </div>
                            </div>

                            {/* Cancel button */}
                            <button
                                onClick={handleCancel}
                                className="w-full py-3 text-amber-200/60 hover:text-amber-200 transition-colors text-sm"
                            >
                                ← Hủy và quay lại trang chủ
                            </button>
                        </div>
                    </div>

                    {/* Connection Status */}
                    <div className="mt-4 text-center text-xs text-slate-500">
                        {connected ? (
                            <span className="text-emerald-400">● Đã kết nối</span>
                        ) : (
                            <span className="text-slate-500">○ Chưa kết nối</span>
                        )}
                    </div>
                </div>
            </main>
        );
    }

    // Trạng thái form nhập thông tin
    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-fadeInUp">
                {/* Logo */}
                <div className="text-center mb-8">
                    <img
                        src="/logo.png"
                        alt="LOTOTET"
                        className="w-56 h-32 md:w-64 md:h-40 mx-auto"
                    />
                </div>

                {/* Card */}
                <div className="card-traditional p-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-amber-400 mb-2">
                            Vào phòng
                        </h2>
                        <div
                            className="inline-block px-4 py-2 rounded-lg font-mono text-lg text-amber-200"
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                border: '2px solid #d4a000',
                            }}
                        >
                            {roomId.toUpperCase()}
                        </div>
                    </div>

                    {/* Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="input-label-traditional">Tên của bạn</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nhập tên..."
                                className="input-traditional"
                                maxLength={20}
                            />
                        </div>

                        <div>
                            <label className="input-label-traditional flex items-center gap-1">
                                Số dư
                                <img src="/coin.svg" alt="" className="w-4 h-4" />
                            </label>
                            <input
                                type="number"
                                value={balance}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setBalance(val > 999999 ? 999999 : val);
                                }}
                                placeholder="100000"
                                className="input-traditional"
                                min={10000}
                                max={999999}
                                step={10000}
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-900/50 border border-red-500/50 text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleJoin}
                            disabled={loading}
                            className="w-full btn-traditional-red py-4 text-lg"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <img
                                        src="/menu_btn.svg"
                                        alt="Loading"
                                        className="w-6 h-6 animate-spin"
                                        style={{ animationDuration: '1s' }}
                                    />
                                    Đang xử lý...
                                </span>
                            ) : (
                                'Vào phòng'
                            )}
                        </button>

                        {/* Back button */}
                        <button
                            onClick={() => router.push('/')}
                            className="w-full py-3 text-amber-200/60 hover:text-amber-200 transition-colors text-sm"
                        >
                            ← Quay lại trang chủ
                        </button>
                    </div>
                </div>

                {/* Connection Status */}
                <div className="mt-4 text-center text-xs text-slate-500">
                    {connected ? (
                        <span className="text-emerald-400">● Đã kết nối</span>
                    ) : (
                        <span className="text-slate-500">○ Chưa kết nối</span>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;

    const { connect, socket, reset } = useGameStore();
    const connected = useConnected();
    const roomState = useRoomState();
    const myPlayer = useMyPlayer();
    const isHost = useIsHost();
    const currentTurn = useCurrentTurn();
    const notification = useNotification();
    const clearNotification = useClearNotification();
    const [pendingPlayerIds, setPendingPlayerIds] = useState<string[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [copyNotification, setCopyNotification] = useState<string | null>(null);
    const [showJoinForm, setShowJoinForm] = useState(false);
    const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

    // Copy to clipboard helper
    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyNotification(`Đã copy ${label}!`);
            setTimeout(() => setCopyNotification(null), 2000);
        } catch {
            setCopyNotification('Không thể copy');
            setTimeout(() => setCopyNotification(null), 2000);
        }
    };

    // Get room link
    const getRoomLink = () => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/room/${roomState?.roomId || roomId.toUpperCase()}`;
        }
        return '';
    };

    // Connect on mount (with load balancer)
    useEffect(() => {
        const initConnection = async () => {
            // Query load balancer for correct server URL
            const serverUrl = await getServerForRoom(roomId.toUpperCase());
            connect(serverUrl);
        };
        initConnection();

        return () => {
            // Cleanup on unmount
        };
    }, [connect, roomId]);

    // Check if we need to show join form (no saved player for this room)
    useEffect(() => {
        if (connected && !hasCheckedStorage) {
            const savedPlayerId = localStorage.getItem(`lototet_player_${roomId}`);
            if (!savedPlayerId) {
                setShowJoinForm(true);
            }
            setHasCheckedStorage(true);
        }
    }, [connected, hasCheckedStorage, roomId]);

    // Listen for turn:progress
    useEffect(() => {
        if (!socket) return;

        const handleProgress = (payload: { turnId: number; pendingPlayerIds: string[] }) => {
            setPendingPlayerIds(payload.pendingPlayerIds);
        };

        socket.on('turn:progress', handleProgress);

        return () => {
            socket.off('turn:progress', handleProgress);
        };
    }, [socket]);

    // Listen for kicked event
    useEffect(() => {
        if (!socket) return;

        const handleKicked = (payload: { reason: string }) => {
            setCopyNotification(payload.reason || 'Bạn đã bị đuổi khỏi phòng');
            setTimeout(() => {
                reset();
                localStorage.removeItem(`lototet_player_${roomId}`);
                router.push('/');
            }, 2000);
        };

        socket.on('player:kicked', handleKicked);

        return () => {
            socket.off('player:kicked', handleKicked);
        };
    }, [socket, reset, roomId, router]);

    // Listen for forfeit events
    useEffect(() => {
        if (!socket) return;

        const handleForfeited = (payload: { playerId: string; playerName: string }) => {
            setCopyNotification(`${payload.playerName} đã bỏ cuộc!`);
            setTimeout(() => setCopyNotification(null), 3000);
        };

        socket.on('player:forfeited', handleForfeited);

        return () => {
            socket.off('player:forfeited', handleForfeited);
        };
    }, [socket]);

    // Listen for game cancelled events
    useEffect(() => {
        if (!socket) return;

        const handleCancelled = (payload: { reason: string }) => {
            setCopyNotification(payload.reason || 'Trận đấu đã bị hủy!');
            setTimeout(() => setCopyNotification(null), 4000);
        };

        socket.on('game:cancelled', handleCancelled);

        return () => {
            socket.off('game:cancelled', handleCancelled);
        };
    }, [socket]);

    // Reconnect to room if needed
    useEffect(() => {
        if (!socket || !connected || showJoinForm) return;

        // If we don't have room state, try to reconnect
        if (!roomState) {
            const savedPlayerId = localStorage.getItem(`lototet_player_${roomId}`);
            if (savedPlayerId) {
                socket.emit('room:reconnect', { roomId, playerId: savedPlayerId }, (response) => {
                    if (!response.success) {
                        // Reconnect failed, clear localStorage and show join form
                        localStorage.removeItem(`lototet_player_${roomId}`);
                        setShowJoinForm(true);
                    }
                });
            }
            // Nếu không có savedPlayerId thì sẽ hiển thị form join (đã xử lý ở useEffect check storage)
        }
    }, [socket, connected, roomState, roomId, showJoinForm]);

    // Save player ID to localStorage
    useEffect(() => {
        if (myPlayer?.id) {
            localStorage.setItem(`lototet_player_${roomId}`, myPlayer.id);
        }
    }, [myPlayer?.id, roomId]);

    // ==================== Actions ====================

    const handleReroll = () => {
        socket?.emit('ticket:reroll');
    };

    const handleReady = () => {
        socket?.emit('ticket:saveReady');
    };

    const handleApprove = (requestId: string) => {
        socket?.emit('room:approveJoin', { requestId });
    };

    const handleReject = (requestId: string) => {
        socket?.emit('room:rejectJoin', { requestId });
    };

    const handleSetBet = (amount: number) => {
        socket?.emit('room:setBetAmount', { amount });
    };

    const handleStartGame = () => {
        socket?.emit('game:start');
    };

    const handleDraw = () => {
        socket?.emit('turn:draw');
    };

    const handleMark = (row: number, col: number) => {
        socket?.emit('turn:markAny', {
            row,
            col,
        });
    };

    const handleNoNumber = useCallback(() => {
        if (!currentTurn) {
            return;
        }
        if (!socket) {
            return;
        }
        if (!socket.connected) {
            return;
        }
        socket.emit('turn:noNumber', { turnId: currentTurn.turnId });
    }, [currentTurn, socket]);

    const handleBingo = () => {
        socket?.emit('game:bingoClaim');
    };

    const handleRestart = () => {
        socket?.emit('game:restart');
    };

    const handleLeave = () => {
        reset();
        localStorage.removeItem(`lototet_player_${roomId}`);
        router.push('/');
    };

    const handleUpdateBalance = (playerId: string, balance: number) => {
        socket?.emit('room:updateBalance', { playerId, balance });
    };

    const handleKickPlayer = (playerId: string) => {
        socket?.emit('room:kickPlayer', { playerId });
    };

    const handleForfeit = () => {
        socket?.emit('game:forfeit');
    };

    const handleCancelGame = () => {
        socket?.emit('game:cancel');
    };

    // ==================== Render ====================

    // Show join form if user accessed via URL without saved session and not yet approved
    // myPlayer is null until the player is approved and added to room.players
    if (showJoinForm && !myPlayer) {
        return (
            <JoinRoomForm
                roomId={roomId}
                onJoinSuccess={() => setShowJoinForm(false)}
            />
        );
    }

    // Loading state
    if (!connected) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                {/* Backdrop overlay */}
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
                <div
                    className="relative z-50 p-8 rounded-xl text-center animate-fadeIn"
                    style={{
                        background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.95) 0%, rgba(92, 0, 0, 0.98) 100%)',
                        border: '3px solid #d4a000',
                        boxShadow: '0 0 30px rgba(212, 160, 0, 0.3)',
                    }}
                >
                    <img
                        src="/menu_btn.svg"
                        alt="Loading"
                        className="w-16 h-16 animate-spin mx-auto mb-4"
                        style={{ animationDuration: '1s' }}
                    />
                    <p className="text-amber-200/80">Đang kết nối...</p>
                </div>
            </main>
        );
    }

    if (!roomState) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                {/* Backdrop overlay */}
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
                <div
                    className="relative z-50 p-8 rounded-xl text-center animate-fadeIn"
                    style={{
                        background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.95) 0%, rgba(92, 0, 0, 0.98) 100%)',
                        border: '3px solid #d4a000',
                        boxShadow: '0 0 30px rgba(212, 160, 0, 0.3)',
                    }}
                >
                    <img
                        src="/menu_btn.svg"
                        alt="Loading"
                        className="w-16 h-16 animate-spin mx-auto mb-4"
                        style={{ animationDuration: '1s' }}
                    />
                    <p className="text-amber-200/80">Đang tải phòng...</p>
                    <p className="text-amber-200/50 text-xs mt-2">Chờ Host duyệt...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen">
            {/* Admin Broadcast Notification */}
            {notification && (
                <AnnouncementBanner
                    message={notification.message}
                    onComplete={clearNotification}
                />
            )}

            {/* Copy Notification Toast */}
            {copyNotification && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium shadow-lg">
                        {copyNotification}
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={() => setShowShareModal(false)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="w-full max-w-sm rounded-xl p-6 animate-fadeIn"
                            style={{
                                background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.98) 0%, rgba(92, 0, 0, 0.99) 100%)',
                                border: '3px solid #d4a000',
                                boxShadow: '0 0 40px rgba(212, 160, 0, 0.4)',
                            }}
                        >
                            <h3 className="text-xl font-bold text-amber-200 text-center mb-6">
                                Chia sẻ phòng
                            </h3>

                            {/* Room ID */}
                            <div className="mb-4">
                                <label className="text-amber-200/70 text-sm mb-2 block">Mã phòng</label>
                                <button
                                    onClick={() => copyToClipboard(roomState?.roomId || '', 'Mã phòng')}
                                    className="w-full p-3 rounded-lg bg-black/30 border border-amber-200/20 text-amber-200 font-mono text-base text-center hover:bg-black/50 hover:border-amber-200/40 transition-all group"
                                >
                                    <span className="group-hover:scale-105 inline-block transition-transform">
                                        {roomState?.roomId}
                                    </span>
                                </button>
                            </div>

                            {/* Room Link */}
                            <div className="mb-6">
                                <label className="text-amber-200/70 text-sm mb-2 block">Link phòng</label>
                                <button
                                    onClick={() => copyToClipboard(getRoomLink(), 'Link phòng')}
                                    className="w-full p-3 rounded-lg bg-black/30 border border-amber-200/20 text-amber-200 font-mono text-base text-center hover:bg-black/50 hover:border-amber-200/40 transition-all break-all"
                                >
                                    {getRoomLink()}
                                </button>
                            </div>

                            {/* Close button */}
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="w-full py-3 rounded-lg bg-amber-200/10 text-amber-200 hover:bg-amber-200/20 transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Rules Modal */}
            {showRulesModal && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={() => setShowRulesModal(false)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="w-full max-w-md rounded-xl animate-fadeIn max-h-[80vh] overflow-hidden flex flex-col"
                            style={{
                                background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.98) 0%, rgba(92, 0, 0, 0.99) 100%)',
                                border: '3px solid #d4a000',
                                boxShadow: '0 0 40px rgba(212, 160, 0, 0.4)',
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-amber-200/20">
                                <h3 className="text-xl font-bold text-amber-200">
                                    Luật chơi LÔ TÔ TẾT
                                </h3>
                                <button
                                    onClick={() => setShowRulesModal(false)}
                                    className="text-amber-200/60 hover:text-amber-200 transition-colors text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 overflow-y-auto flex-1 text-amber-200/90 text-sm space-y-4">
                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Luật phòng</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Nút bắt đầu chỉ hiện khi tất cả mọi người trong phòng đã sẵn sàng</li>
                                        <li>Khi có yêu cầu vào phòng mới, nút bắt đầu sẽ ẩn đi</li>
                                        <li>Chủ phòng có quyền duyệt người vào phòng và chỉnh sửa số dư của tất cả người chơi</li>
                                        <li>Chủ phòng có quyền loại người chơi</li>
                                        <li>Chủ phòng có quyền hủy trận ở menu</li>
                                        <li>Người chơi có quyền bỏ cuộc ở menu</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Lưu ý</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Tất cả người chơi phải sẵn sàng trước khi bắt đầu</li>
                                        <li>Cần tối thiểu 2 người để chơi</li>
                                        <li>Sau khi bắt đầu không thể nhận yêu cầu vào phòng</li>
                                        <li>Không thể loại người chơi sau khi bắt đầu</li>
                                        <li>Nếu không chơi tiếp cần ấn nút bỏ cuộc để tiếp tục ván</li>
                                        <li>Nếu người chơi không bỏ cuộc thì không thể tiếp tục trò chơi, chủ phòng hủy trận và bắt đầu ván mới</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Cách chơi</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Mỗi người nhận 1 vé số với các số ngẫu nhiên</li>
                                        <li>Chủ phòng sẽ quay số (từ 1-90)</li>
                                        <li>Khi số được gọi, người chơi đánh dấu ô có số đó trên vé</li>
                                        <li>Nếu vé không có số đó, không cần làm gì</li>
                                        <li>Lượt quay số sẽ tự động sau khi tất cả người chơi đã đánh dấu hoặc không có số</li>
                                        <li>CHIẾN THẮNG khi được 5 số hàng ngang bất kì, ấn nút BINGO để giành chiến thắng</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-amber-400 mb-2">Tiền cược</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        <li>Chủ phòng đặt mức cược cho mỗi ván</li>
                                        <li>Người thắng sẽ nhận tiền cược từ tất cả người chơi khác</li>
                                        <li>Người thua mất số tiền cược đã đặt</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-amber-200/20">
                                <button
                                    onClick={() => setShowRulesModal(false)}
                                    className="w-full py-3 rounded-lg bg-amber-200/10 text-amber-200 hover:bg-amber-200/20 transition-colors font-medium"
                                >
                                    Đã hiểu
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-white/10" style={{ backgroundColor: 'rgba(74, 4, 4, 0.85)' }}>
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    {/* Left: Room info */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="font-mono text-amber-200 text-lg hover:text-amber-100 transition-colors cursor-pointer"
                            title="Ấn để chia sẻ phòng"
                        >
                            {roomState.roomId}
                        </button>
                        <div className="h-5 w-px bg-white/20" />
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-200 text-lg">
                                {roomState.players.length}
                            </span>
                            <img src="/players.svg" alt="Players" className="w-8 h-8" />
                        </div>
                        <div className="h-5 w-px bg-white/20" />
                        <div className="flex items-center gap-1.5">
                            <span className="text-amber-400 font-bold text-lg">
                                {formatNumber(roomState.betAmount ?? 0)}
                            </span>
                            <img src="/coin.svg" alt="Coin" className="w-8 h-8" />
                        </div>
                    </div>

                    {/* Right: Rules + Menu button */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowRulesModal(true)}
                            className="px-3 py-1.5 rounded-lg text-amber-200 font-bold text-sm hover:bg-amber-200/10 transition-colors border border-amber-200/30 hover:border-amber-200/50"
                            title="Luật chơi"
                        >
                            LUẬT
                        </button>
                        <button
                            onClick={() => setMenuOpen(true)}
                            className="hover:opacity-80 transition-opacity p-1"
                            title="Menu"
                        >
                            <img src="/menu_btn.svg" alt="Menu" className="w-8 h-8" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Game Menu Drawer */}
            <GameMenu
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                roomState={roomState}
                myPlayer={myPlayer}
                isHost={isHost}
                canStart={isHost && roomState.players.every(p => p.ready) && roomState.players.length >= 2}
                onSetBet={handleSetBet}
                onApprove={handleApprove}
                onReject={handleReject}
                onStartGame={handleStartGame}
                onUpdateBalance={handleUpdateBalance}
                onKickPlayer={handleKickPlayer}
                onForfeit={handleForfeit}
                onCancelGame={handleCancelGame}
            />

            {/* Content */}
            <div className="max-w-7xl mx-auto p-4">
                {roomState.phase === RoomPhase.LOBBY && (
                    <LobbyView
                        roomState={roomState}
                        myPlayer={myPlayer}
                        isHost={isHost}
                        onReroll={handleReroll}
                        onReady={handleReady}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onStartGame={handleStartGame}
                        onSetBet={handleSetBet}
                        onUpdateBalance={handleUpdateBalance}
                        onKickPlayer={handleKickPlayer}
                    />
                )}

                {roomState.phase === RoomPhase.PLAYING && (
                    <PlayingView
                        roomState={roomState}
                        myPlayer={myPlayer}
                        isHost={isHost}
                        currentTurn={currentTurn}
                        pendingPlayerIds={pendingPlayerIds}
                        onDraw={handleDraw}
                        onMark={handleMark}
                        onNoNumber={handleNoNumber}
                        onBingo={handleBingo}
                    />
                )}

                {roomState.phase === RoomPhase.ENDED && (
                    <EndedView
                        roomState={roomState}
                        isHost={isHost}
                        onRestart={handleRestart}
                        onLeave={handleLeave}
                    />
                )}
            </div>

            {/* Floating Pending Requests - Host Only */}
            {isHost && roomState.pendingRequests.length > 0 && (
                <PendingRequestsFloat
                    requests={roomState.pendingRequests}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            )}

            {/* Chat */}
            {myPlayer && <ChatBox />}
        </main>
    );
}
