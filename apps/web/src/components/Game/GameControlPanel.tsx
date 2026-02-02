'use client';

import { cn } from '@/lib/utils';
import { CurrentNumber } from './CurrentNumber';

interface GameControlPanelProps {
    currentNumber: number | null;
    turnId?: number;
    isHost: boolean;
    hasResponded: boolean;
    canBingo: boolean;
    onDraw: () => void;
    onNoNumber: () => void;
    onBingo: () => void;
}

export function GameControlPanel({
    currentNumber,
    turnId,
    isHost,
    hasResponded,
    canBingo,
    onDraw,
    onNoNumber,
    onBingo,
}: GameControlPanelProps) {
    return (
        <>
            {/* Main Control Panel */}
            <div className="card p-4">
                {/* Current Number Display */}
                <div className="text-center mb-4">
                    <CurrentNumber number={currentNumber ?? undefined} turnId={turnId} />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-center">
                    {/* Host: Draw button */}
                    {isHost && (
                        <button
                            onClick={onDraw}
                            className={cn(
                                'btn flex-1 max-w-[200px]',
                                'bg-indigo-600 text-white',
                                'hover:bg-indigo-500',
                                'h-12 px-6 font-bold',
                            )}
                        >
                            🎲 Quay số
                        </button>
                    )}

                    {/* No Number button - for all players */}
                    <button
                        onClick={onNoNumber}
                        disabled={hasResponded || !currentNumber}
                        className={cn(
                            'btn flex-1 max-w-[200px]',
                            'bg-slate-600 text-white',
                            'hover:bg-slate-500',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            'h-12 px-6 font-bold',
                        )}
                    >
                        ✗ Không có
                    </button>
                </div>
            </div>

            {/* BINGO Banner - Only show when can BINGO */}
            {canBingo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <button
                        onClick={onBingo}
                        className={cn(
                            'pointer-events-auto',
                            'px-16 py-8 rounded-2xl',
                            'text-4xl md:text-5xl font-black',
                            'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500',
                            'text-white',
                            'shadow-2xl shadow-amber-500/50',
                            'animate-bounce',
                            'border-4 border-yellow-300',
                            'hover:scale-110 transition-transform duration-200',
                        )}
                    >
                        🎉 HÔ BINGO! 🎉
                    </button>
                </div>
            )}
        </>
    );
}
