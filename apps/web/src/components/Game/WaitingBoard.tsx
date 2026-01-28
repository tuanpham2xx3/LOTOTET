'use client';

import type { WaitingState } from '@lototet/shared';
import { cn } from '@/lib/utils';

interface WaitingBoardProps {
    waitingBoard: WaitingState[];
    myPlayerId?: string | null;
}

export function WaitingBoard({ waitingBoard, myPlayerId }: WaitingBoardProps) {
    if (waitingBoard.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-amber-400 flex items-center gap-2">
                <span>⚠️</span>
                Sắp BINGO (4/5)
            </h3>
            <div className="space-y-2">
                {waitingBoard.map((state) => {
                    const isMe = state.playerId === myPlayerId;
                    return (
                        <div
                            key={`${state.playerId}-${state.row}`}
                            className={cn(
                                'p-3 rounded-lg text-sm',
                                'animate-blink-warn',
                                isMe && 'ring-2 ring-amber-400',
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className={cn('font-medium', isMe && 'text-amber-300')}>
                                    {isMe ? '🎯 Bạn' : state.playerName}
                                </span>
                                <span className="text-xs text-slate-400">
                                    Hàng {state.row + 1}
                                </span>
                            </div>
                            <div className="mt-1 flex gap-1 flex-wrap">
                                <span className="text-slate-400 text-xs">Chờ:</span>
                                {state.waitingNumbers.map((num) => (
                                    <span
                                        key={num}
                                        className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded bg-amber-500/30 text-amber-300"
                                    >
                                        {num}
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
