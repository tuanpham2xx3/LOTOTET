'use client';

import { TicketCell } from './TicketCell';
import type { Ticket } from '@lototet/shared';

interface TicketGridProps {
    ticket: Ticket | undefined;
    marked: boolean[][] | undefined;
    currentNumber?: number;
    drawnNumbers?: number[];
    onCellClick?: (row: number, col: number) => void;
}

export function TicketGrid({
    ticket,
    marked,
    currentNumber,
    drawnNumbers = [],
    onCellClick,
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
        <div className="inline-block">
            <div
                className="grid gap-[3px] xs:gap-1 sm:gap-1.5 md:gap-2"
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
                                isDrawn={value !== null && drawnNumbers.includes(value)}
                                onClick={() => onCellClick?.(rowIndex, colIndex)}
                                disabled={isMarked || value === null}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}
