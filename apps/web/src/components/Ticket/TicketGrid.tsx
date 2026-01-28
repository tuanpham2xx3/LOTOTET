'use client';

import { TicketCell } from './TicketCell';
import type { Ticket } from '@lototet/shared';

interface TicketGridProps {
    ticket: Ticket | undefined;
    marked: boolean[][] | undefined;
    currentNumber?: number;
    onCellClick?: (row: number, col: number) => void;
    readonly?: boolean;
}

export function TicketGrid({
    ticket,
    marked,
    currentNumber,
    onCellClick,
    readonly = false,
}: TicketGridProps) {
    // Empty state
    if (!ticket) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-500">
                <p>Chưa có vé</p>
            </div>
        );
    }

    // Find cell position for current number
    const findCurrentNumberPosition = (): { row: number; col: number } | null => {
        if (!currentNumber) return null;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (ticket[row][col] === currentNumber) {
                    return { row, col };
                }
            }
        }
        return null;
    };

    const currentPos = findCurrentNumberPosition();

    return (
        <div className="inline-block p-2 md:p-3 lg:p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div
                className="grid gap-0.5 sm:gap-1 md:gap-1 lg:gap-1.5"
                style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}
            >
                {ticket.map((row, rowIndex) =>
                    row.map((value, colIndex) => {
                        const isMarked = marked?.[rowIndex]?.[colIndex] ?? false;
                        const isCurrentNumber =
                            currentPos?.row === rowIndex && currentPos?.col === colIndex;

                        return (
                            <TicketCell
                                key={`${rowIndex}-${colIndex}`}
                                value={value}
                                marked={isMarked}
                                isCurrentNumber={isCurrentNumber}
                                onClick={() => onCellClick?.(rowIndex, colIndex)}
                                disabled={readonly || isMarked || value === null}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}
