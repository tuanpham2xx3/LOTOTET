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
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fadeInUp px-4">
            {/* Confetti Background - with gold/red colors */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 30 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-3 h-3 rounded-full animate-confetti"
                        style={{
                            left: `${Math.random() * 100}%`,
                            bottom: '-10%',
                            backgroundColor: ['#d4a000', '#ffd700', '#c62828', '#ff6b6b', '#fff8e1'][
                                Math.floor(Math.random() * 5)
                            ],
                            animationDelay: `${Math.random() * 2}s`,
                        }}
                    />
                ))}
            </div>

            {/* Winner Card */}
            <div className="relative z-10 w-full max-w-md">
                {/* Money Bag Icon */}
                <div className="text-center mb-4">
                    <img src="/money_bag.svg" alt="Prize" className="w-20 h-20 md:w-24 md:h-24 mx-auto drop-shadow-lg" />
                </div>

                {/* Winner Banner */}
                <div
                    className="rounded-xl overflow-hidden"
                    style={{
                        background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.95) 0%, rgba(92, 0, 0, 0.98) 100%)',
                        border: '3px solid #d4a000',
                        boxShadow: '0 0 30px rgba(212, 160, 0, 0.3)',
                    }}
                >
                    {/* Header */}
                    <div
                        className="text-center py-4 px-6"
                        style={{
                            background: 'rgba(74, 4, 4, 0.85)',
                            borderBottom: '2px solid #d4a000',
                        }}
                    >
                        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 flex items-center justify-center gap-2">
                            <img src="/your_balance.svg" alt="" className="w-8 h-8 md:w-10 md:h-10" />
                            BINGO!
                            <img src="/your_balance.svg" alt="" className="w-8 h-8 md:w-10 md:h-10" />
                        </h1>
                    </div>

                    {/* Winner Info */}
                    <div className="text-center py-6 px-6">
                        <p className="text-amber-200/70 text-sm mb-2">Người chiến thắng</p>
                        <div className="text-2xl md:text-3xl font-bold text-amber-100 mb-3">
                            {winner.playerName}
                        </div>
                        <p className="text-amber-200/60 text-sm mb-4">
                            Hoàn thành hàng {winner.winningRow + 1}
                        </p>
                        <div
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-xl"
                            style={{
                                background: 'linear-gradient(180deg, #d4a000 0%, #b8860b 100%)',
                                color: '#5c0000',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.3)',
                            }}
                        >
                            <span>+{formatNumber(winner.prize)}</span>
                            <img src="/coin.svg" alt="" className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Leaderboard */}
                <div
                    className="mt-6 rounded-xl overflow-hidden"
                    style={{
                        background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.95) 0%, rgba(60, 0, 0, 1) 100%)',
                        border: '3px solid #d4a000',
                    }}
                >
                    {/* Header */}
                    <div
                        className="py-3 px-4 text-center"
                        style={{
                            background: 'rgba(74, 4, 4, 0.85)',
                            borderBottom: '2px solid #d4a000',
                        }}
                    >
                        <h3 className="text-sm font-bold text-amber-400">
                            Bảng xếp hạng lời / lỗ
                        </h3>
                    </div>

                    {/* Player List */}
                    <div className="p-3 space-y-2">
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
                                        'flex items-center justify-between p-3 rounded-lg transition-all',
                                    )}
                                    style={{
                                        background: player.id === winner.playerId
                                            ? 'linear-gradient(90deg, rgba(212, 160, 0, 0.3) 0%, rgba(184, 134, 11, 0.2) 100%)'
                                            : 'rgba(0, 0, 0, 0.2)',
                                        border: player.id === winner.playerId
                                            ? '1px solid #d4a000'
                                            : '1px solid rgba(212, 160, 0, 0.2)',
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl w-8 text-center">
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                        </span>
                                        <div>
                                            <span className={cn(
                                                'font-semibold',
                                                player.id === winner.playerId ? 'text-amber-300' : 'text-amber-100',
                                            )}>
                                                {player.name}
                                                {player.id === winner.playerId && ' 🏆'}
                                            </span>
                                            <div className="text-xs text-amber-200/50 flex items-center gap-1">
                                                Số dư: {formatNumber(player.balance)}
                                                <img src="/coin.svg" alt="" className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        'font-bold text-lg flex items-center gap-1',
                                        profitLoss > 0
                                            ? 'text-green-400'
                                            : profitLoss < 0
                                                ? 'text-red-400'
                                                : 'text-amber-200/60',
                                    )}>
                                        {profitLoss >= 0 ? '+' : ''}{formatNumber(profitLoss)}
                                        <img src="/coin.svg" alt="" className="w-4 h-4" />
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    {isHost && (
                        <button
                            onClick={onRestart}
                            className="btn-traditional-red py-3 px-8 text-lg font-bold flex-1 sm:flex-initial sm:min-w-[140px]"
                        >
                            Chơi lại
                        </button>
                    )}
                    <button
                        onClick={onLeave}
                        className="py-3 px-8 text-lg font-bold rounded-lg transition-all flex-1 sm:flex-initial sm:min-w-[140px]"
                        style={{
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)',
                            border: '2px solid #d4a000',
                            color: '#d4a000',
                        }}
                    >
                        Rời phòng
                    </button>
                </div>

                {!isHost && (
                    <p className="mt-4 text-sm text-amber-200/50 text-center">
                        Đợi Host bắt đầu ván mới...
                    </p>
                )}
            </div>
        </div>
    );
}
