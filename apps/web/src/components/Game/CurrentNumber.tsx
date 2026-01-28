'use client';

import { cn } from '@/lib/utils';

interface CurrentNumberProps {
    number: number | null;
    turnId?: number;
}

export function CurrentNumber({ number, turnId }: CurrentNumberProps) {
    if (number === null) {
        return (
            <div className="text-center p-6">
                <p className="text-slate-500 text-sm mb-2">Số hiện tại</p>
                <div className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-600">
                    -
                </div>
            </div>
        );
    }

    return (
        <div className="text-center p-6 animate-fadeIn">
            <p className="text-slate-400 text-sm mb-2">
                Lượt #{turnId}
            </p>
            <div
                key={number} // Force re-render animation
                className={cn(
                    'text-5xl md:text-6xl lg:text-7xl font-bold',
                    'text-indigo-400',
                    'animate-number-reveal',
                )}
            >
                {number}
            </div>
        </div>
    );
}
