'use client';

import { cn } from '@/lib/utils';

interface ActionButtonsProps {
    onMark?: () => void;
    onNoNumber?: () => void;
    onBingo?: () => void;
    canMark?: boolean;
    canBingo?: boolean;
    hasResponded?: boolean;
    isPlaying?: boolean;
}

export function ActionButtons({
    onMark,
    onNoNumber,
    onBingo,
    canMark = true,
    canBingo = false,
    hasResponded = false,
    isPlaying = true,
}: ActionButtonsProps) {
    if (!isPlaying) {
        return null;
    }

    return (
        <div className="space-y-3">
            {/* Mark / No Number buttons */}
            <div className="flex gap-2 w-full md:w-auto">
                <button
                    onClick={onMark}
                    disabled={!canMark || hasResponded}
                    className={cn(
                        'btn flex-1 md:flex-none',
                        'bg-emerald-500 text-white',
                        'hover:bg-emerald-400',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'h-12 md:h-10 px-6',
                    )}
                >
                    ✓ Có số
                </button>
                <button
                    onClick={onNoNumber}
                    disabled={hasResponded}
                    className={cn(
                        'btn flex-1 md:flex-none',
                        'bg-slate-600 text-white',
                        'hover:bg-slate-500',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'h-12 md:h-10 px-6',
                    )}
                >
                    ✗ Không có
                </button>
            </div>

            {/* BINGO button */}
            <button
                onClick={onBingo}
                disabled={!canBingo}
                className={cn(
                    'w-full py-4 md:py-3 rounded-lg',
                    'text-lg md:text-base font-bold',
                    'transition-all duration-200',
                    canBingo && 'bg-gradient-to-r from-amber-500 to-orange-500',
                    canBingo && 'text-white',
                    canBingo && 'animate-glow-pulse',
                    canBingo && 'hover:from-amber-400 hover:to-orange-400',
                    !canBingo && 'bg-slate-700/50 text-slate-500',
                    !canBingo && 'cursor-not-allowed',
                )}
            >
                🎉 HÔ BINGO!
            </button>
        </div>
    );
}
