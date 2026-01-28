'use client';

import { TicketGrid } from '@/components/Ticket';
import { cn } from '@/lib/utils';
import type { RoomState, Player, JoinRequest } from '@lototet/shared';

interface LobbyViewProps {
    roomState: RoomState;
    myPlayer: Player | null;
    isHost: boolean;
    onReroll: () => void;
    onReady: () => void;
    onApprove: (requestId: string) => void;
    onReject: (requestId: string) => void;
    onStartGame: () => void;
    onSetBet: (amount: number) => void;
    onUpdateBalance: (playerId: string, balance: number) => void;
}

export function LobbyView({
    roomState,
    myPlayer,
    isHost,
    onReroll,
    onReady,
    onApprove,
    onReject,
    onStartGame,
    onSetBet,
    onUpdateBalance,
}: LobbyViewProps) {
    const allReady = roomState.players.every((p) => p.ready);
    const canStart = isHost && allReady && roomState.players.length >= 2;

    return (
        <div className="space-y-6 animate-fadeInUp">
            {/* Room Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white">🏠 Phòng chờ</h2>
                    <p className="text-sm text-slate-400">
                        Room ID: <span className="font-mono text-indigo-400">{roomState.roomId}</span>
                    </p>
                </div>
                {isHost && (
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={roomState.betAmount || 10000}
                            onChange={(e) => onSetBet(Number(e.target.value))}
                            className="input w-32 text-right"
                            placeholder="Bet"
                        />
                        <span className="text-slate-400">VND</span>
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Left: Ticket Preview */}
                <div className="card p-4">
                    <h3 className="text-sm font-medium text-slate-400 mb-3">🎟️ Vé của bạn</h3>
                    <TicketGrid
                        ticket={myPlayer?.ticket}
                        marked={myPlayer?.marked}
                        readonly={true}
                    />
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={onReroll}
                            disabled={myPlayer?.ready}
                            className="btn btn-secondary flex-1"
                        >
                            🔄 Đổi vé
                        </button>
                        <button
                            onClick={onReady}
                            disabled={myPlayer?.ready}
                            className={cn(
                                'btn flex-1',
                                myPlayer?.ready ? 'btn-success' : 'btn-primary',
                            )}
                        >
                            {myPlayer?.ready ? '✅ Đã sẵn sàng' : 'Sẵn sàng'}
                        </button>
                    </div>
                </div>

                {/* Right: Players & Pending */}
                <div className="space-y-4">
                    {/* Players List */}
                    <div className="card p-4">
                        <h3 className="text-sm font-medium text-slate-400 mb-3">
                            👥 Người chơi ({roomState.players.length})
                        </h3>
                        <div className="space-y-2">
                            {roomState.players.map((player) => (
                                <div
                                    key={player.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50"
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{player.isHost ? '👑' : '🎮'}</span>
                                        <span className="font-medium">{player.name}</span>
                                        {player.id === myPlayer?.id && (
                                            <span className="text-xs text-indigo-400">(Bạn)</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isHost ? (
                                            <button
                                                onClick={() => {
                                                    const newBalance = prompt(
                                                        `Nhập số dư mới cho ${player.name}:`,
                                                        String(player.balance)
                                                    );
                                                    if (newBalance !== null) {
                                                        const parsed = parseInt(newBalance, 10);
                                                        if (!isNaN(parsed) && parsed >= 0) {
                                                            onUpdateBalance(player.id, parsed);
                                                        }
                                                    }
                                                }}
                                                className="text-sm text-indigo-400 hover:text-indigo-300 underline"
                                            >
                                                {player.balance.toLocaleString()}đ
                                            </button>
                                        ) : (
                                            <span className="text-sm text-slate-400">
                                                {player.balance.toLocaleString()}đ
                                            </span>
                                        )}
                                        {player.ready ? (
                                            <span className="badge badge-success">✓</span>
                                        ) : (
                                            <span className="badge">Chờ</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pending Requests (Host only) */}
                    {isHost && roomState.pendingRequests.length > 0 && (
                        <div className="card p-4">
                            <h3 className="text-sm font-medium text-amber-400 mb-3">
                                ⏳ Yêu cầu tham gia ({roomState.pendingRequests.length})
                            </h3>
                            <div className="space-y-2">
                                {roomState.pendingRequests.map((req: JoinRequest) => (
                                    <div
                                        key={req.requestId}
                                        className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10"
                                    >
                                        <div>
                                            <span className="font-medium">{req.name}</span>
                                            <span className="text-sm text-slate-400 ml-2">
                                                {req.balance.toLocaleString()}đ
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onApprove(req.requestId)}
                                                className="btn btn-success py-1 px-3 text-sm"
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={() => onReject(req.requestId)}
                                                className="btn btn-danger py-1 px-3 text-sm"
                                            >
                                                ✗
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Start Game (Host only) */}
                    {isHost && (
                        <button
                            onClick={onStartGame}
                            disabled={!canStart}
                            className={cn(
                                'w-full btn btn-lg',
                                canStart
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                    : 'btn-secondary opacity-50',
                            )}
                        >
                            🚀 Bắt đầu trò chơi
                        </button>
                    )}

                    {!isHost && (
                        <div className="text-center text-slate-500 text-sm">
                            Đợi Host bắt đầu trò chơi...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
