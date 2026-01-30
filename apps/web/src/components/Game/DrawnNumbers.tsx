'use client';

import { cn } from '@/lib/utils';

interface DrawnNumbersProps {
    numbers: number[];
    currentNumber?: number;
}

export function DrawnNumbers({ numbers, currentNumber }: DrawnNumbersProps) {
    if (numbers.length === 0) {
        return (
            <div className="text-sm text-slate-500">
                Chưa quay số nào
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <span></span>
                Đã quay ({numbers.length})
            </h3>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {numbers.map((num, index) => {
                    const isLatest = num === currentNumber;
                    return (
                        <span
                            key={`${num}-${index}`}
                            className={cn(
                                'inline-flex items-center justify-center',
                                'w-7 h-7 text-xs font-semibold rounded',
                                'transition-all duration-200',
                                isLatest
                                    ? 'bg-indigo-500 text-white scale-110'
                                    : 'bg-slate-700/80 text-slate-300',
                            )}
                        >
                            {num}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
