'use client';

import { cn } from '@/lib/utils';

interface TicketCellProps {
    value: number | null;
    marked: boolean;
    isCurrentNumber?: boolean;
    onClick?: () => void;
    disabled?: boolean;
}

export function TicketCell({
    value,
    marked,
    isCurrentNumber = false,
    onClick,
    disabled = false,
}: TicketCellProps) {
    const isEmpty = value === null;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || isEmpty}
            className={cn(
                // Base styles
                'flex items-center justify-center rounded transition-all duration-200',
                // Responsive sizing
                'w-8 h-8 text-xs',
                'sm:w-9 sm:h-9',
                'md:w-10 md:h-10 md:text-sm',
                'lg:w-12 lg:h-12 lg:text-base',
                // Font
                'font-semibold',
                // States
                isEmpty && 'bg-slate-800/50 cursor-default',
                !isEmpty && !marked && [
                    'bg-slate-700/80 hover:bg-slate-600/80',
                    'cursor-pointer',
                    'border border-slate-600/50',
                ],
                marked && [
                    'bg-emerald-500 text-white',
                    'border border-emerald-400',
                    'glow-success',
                ],
                isCurrentNumber && !marked && [
                    'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900',
                    'animate-pulse-number',
                    'bg-amber-500/20',
                ],
                // Disabled
                disabled && 'opacity-50 cursor-not-allowed',
            )}
        >
            {value}
        </button>
    );
}
