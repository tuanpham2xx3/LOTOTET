'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RoomPhase } from '@lototet/shared';
import {
    useGameStore,
    useRoomState,
    useMyPlayer,
    useIsHost,
    useCurrentTurn,
    useConnected,
} from '@/stores/gameStore';
import { LobbyView, PlayingView, EndedView, GameMenu } from '@/components/Room';
import { ChatBox } from '@/components/Chat';
import { formatNumber } from '@/lib/utils';

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
    const [pendingPlayerIds, setPendingPlayerIds] = useState<string[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);

    // Connect on mount
    useEffect(() => {
        connect();

        return () => {
            // Cleanup on unmount
        };
    }, [connect]);

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
            console.log('[Room] Kicked:', payload);
            alert(payload.reason || 'Bạn đã bị đuổi khỏi phòng');
            reset();
            localStorage.removeItem(`lototet_player_${roomId}`);
            router.push('/');
        };

        socket.on('player:kicked', handleKicked);

        return () => {
            socket.off('player:kicked', handleKicked);
        };
    }, [socket, reset, roomId, router]);

    // Reconnect to room if needed
    useEffect(() => {
        if (!socket || !connected) return;

        // If we don't have room state, try to reconnect or spectate
        if (!roomState) {
            const savedPlayerId = localStorage.getItem(`lototet_player_${roomId}`);
            if (savedPlayerId) {
                socket.emit('room:reconnect', { roomId, playerId: savedPlayerId }, (response) => {
                    if (!response.success) {
                        // Try to spectate instead
                        socket.emit('room:spectate', { roomId }, (res) => {
                            if (!res.success) {
                                router.push('/');
                            }
                        });
                    }
                });
            } else {
                // Spectate the room
                socket.emit('room:spectate', { roomId }, (response) => {
                    if (!response.success) {
                        router.push('/');
                    }
                });
            }
        }
    }, [socket, connected, roomState, roomId, router]);

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

    const handleNoNumber = () => {
        if (!currentTurn) return;
        socket?.emit('turn:noNumber', { turnId: currentTurn.turnId });
    };

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

    // ==================== Render ====================

    // Loading state
    if (!connected) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="text-center animate-fadeIn">
                    <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Đang kết nối...</p>
                </div>
            </main>
        );
    }

    if (!roomState) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="text-center animate-fadeIn">
                    <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Đang tải phòng...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-white/10" style={{ backgroundColor: 'rgba(74, 4, 4, 0.85)' }}>
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    {/* Left: Player count */}
                    <div className="flex items-center gap-4">
                        <span className="font-mono text-indigo-400 text-sm">
                            {roomState.roomId}
                        </span>
                        <div className="h-5 w-px bg-white/20" />
                        <div className="flex items-center gap-1.5">
                            <span className="text-lg">👤</span>
                            <span className="font-bold text-white">
                                {roomState.players.length}
                            </span>
                        </div>
                        <div className="h-5 w-px bg-white/20" />
                        <div className="flex items-center gap-1.5">
                            <span className="text-amber-400 font-bold">
                                {formatNumber(roomState.betAmount ?? 0)}🧧
                            </span>
                        </div>
                    </div>

                    {/* Right: Menu button */}
                    <button
                        onClick={() => setMenuOpen(true)}
                        className="hover:opacity-80 transition-opacity p-1"
                        title="Menu"
                    >
                        <img src="/menu_btn.png" alt="Menu" className="w-8 h-8" />
                    </button>
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

            {/* Chat */}
            {myPlayer && <ChatBox />}
        </main>
    );
}
