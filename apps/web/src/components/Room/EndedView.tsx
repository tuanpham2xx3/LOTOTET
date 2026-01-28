'use client';

import { cn, formatNumber } from '@/lib/utils';
import type { RoomState } from '@lototet/shared';

interface EndedViewProps {
    roomState: RoomState;
    isHost: boolean;
    onRestart: () => void;
    onLeave: () => void;
}

export function EndedView({
    roomState,
    isHost,
    onRestart,
    onLeave,
}: EndedViewProps) {
    const winner = roomState.winner;

    if (!winner) {
        return (
            <div className="text-center p-8">
                <p className="text-slate-500">Trò chơi đã kết thúc</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fadeInUp">
            {/* Confetti Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-3 h-3 rounded-full animate-confetti"
                        style={{
                            left: `${Math.random() * 100}%`,
                            bottom: '-10%',
                            backgroundColor: ['#6366f1', '#ec4899', '#10b981', '#f59e0b'][
                                Math.floor(Math.random() * 4)
                            ],
                            animationDelay: `${Math.random() * 2}s`,
                        }}
                    />
                ))}
            </div>

            {/* Winner Card */}
            <div className="relative z-10 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">
                    BINGO!
                </h1>
                <p className="text-slate-400 mb-6">Người chiến thắng</p>

                <div className="card p-6 md:p-8 glass shadow-glow">
                    <div className="text-2xl md:text-3xl font-bold text-white mb-2">
                        🏆 {winner.playerName}
                    </div>
                    <p className="text-slate-400 text-sm mb-4">
                        Hoàn thành hàng {winner.winningRow + 1}
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                        <span>+{formatNumber(winner.prize)}</span>
                        <span className="text-sm">VND</span>
                    </div>
                </div>

                {/* Final Standings - Leaderboard */}
                <div className="mt-8 card p-4 text-left min-w-[300px]">
                    <h3 className="text-sm font-medium text-slate-400 mb-3">
                        📊 Bảng xếp hạng lời / lỗ
                    </h3>
                    <div className="space-y-2">
                        {[...roomState.players]
                            .map((player) => {
                                const initialBalance = roomState.initialBalances?.[player.id] ?? player.balance;
                                const profitLoss = player.balance - initialBalance;
                                return { player, profitLoss };
                            })
                            .sort((a, b) => b.profitLoss - a.profitLoss)
                            .map(({ player, profitLoss }, index) => (
                                <div
                                    key={player.id}
                                    className={cn(
                                        'flex items-center justify-between p-3 rounded-lg',
                                        player.id === winner.playerId
                                            ? 'bg-emerald-500/20 border border-emerald-500/30'
                                            : 'bg-slate-800/50',
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                        </span>
                                        <div>
                                            <span className={cn(
                                                'font-medium',
                                                player.id === winner.playerId && 'text-emerald-400',
                                            )}>
                                                {player.name}
                                                {player.id === winner.playerId && ' 🏆'}
                                            </span>
                                            <div className="text-xs text-slate-500">
                                                Số dư: {formatNumber(player.balance)}đ
                                            </div>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        'font-bold text-lg',
                                        profitLoss > 0
                                            ? 'text-emerald-400'
                                            : profitLoss < 0
                                                ? 'text-red-400'
                                                : 'text-slate-400',
                                    )}>
                                        {profitLoss >= 0 ? '+' : ''}{formatNumber(profitLoss)}đ
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                    {isHost && (
                        <button
                            onClick={onRestart}
                            className="btn btn-primary btn-lg"
                        >
                            🔄 Chơi lại
                        </button>
                    )}
                    <button
                        onClick={onLeave}
                        className="btn btn-secondary btn-lg"
                    >
                        🚪 Rời phòng
                    </button>
                </div>

                {!isHost && (
                    <p className="mt-4 text-sm text-slate-500">
                        Đợi Host bắt đầu ván mới...
                    </p>
                )}
            </div>
        </div>
    );
}
