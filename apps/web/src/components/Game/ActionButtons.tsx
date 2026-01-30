'use client';

import { cn } from '@/lib/utils';

interface ActionButtonsProps {
    onDraw?: () => void;
    onNoNumber?: () => void;
    isHost?: boolean;
    hasResponded?: boolean;
    isPlaying?: boolean;
    currentNumber?: number | null;
}

export function ActionButtons({
    onDraw,
    onNoNumber,
    isHost = false,
    hasResponded = false,
    isPlaying = true,
    currentNumber = null,
}: ActionButtonsProps) {
    if (!isPlaying) {
        return null;
    }

    return (
        <div className="space-y-3">
            {/* Host: Draw button + No Number | Player: Only No Number */}
            <div className="flex gap-2 w-full">
                {isHost ? (
                    <>
                        <button
                            onClick={onDraw}
                            className={cn(
                                'btn flex-1',
                                'bg-indigo-500 text-white',
                                'hover:bg-indigo-400',
                                'h-12 md:h-10 px-6 font-bold',
                            )}
                        >
                            🎲 Quay số
                        </button>
                        <button
                            onClick={onNoNumber}
                            disabled={hasResponded || currentNumber === null}
                            className={cn(
                                'btn flex-1',
                                'bg-slate-600 text-white',
                                'hover:bg-slate-500',
                                'disabled:opacity-50 disabled:cursor-not-allowed',
                                'h-12 md:h-10 px-6',
                            )}
                        >
                            ✗ Không có
                        </button>
                    </>
                ) : (
                    <button
                        onClick={onNoNumber}
                        disabled={hasResponded || currentNumber === null}
                        className={cn(
                            'btn w-full',
                            'bg-slate-600 text-white',
                            'hover:bg-slate-500',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            'h-12 md:h-10 px-6',
                        )}
                    >
                        ✗ Không có
                    </button>
                )}
            </div>
        </div>
    );
}
