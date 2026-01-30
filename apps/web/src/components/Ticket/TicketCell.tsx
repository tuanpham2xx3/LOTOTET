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
                'flex items-center justify-center rounded-md transition-all duration-200',
                // Responsive sizing - consistent spacing
                'w-8 h-8 text-sm',
                'md:w-9 md:h-9',
                'lg:w-10 lg:h-10 lg:text-base',
                // Font
                'font-semibold',
                // States
                isEmpty && 'bg-slate-800/50 cursor-default',
                !isEmpty && !marked && [
                    'bg-[#FFF8E1] text-[#5D4037]', // Cream background with brown text
                    'hover:bg-[#FFE4B5]',
                    'cursor-pointer',
                    'border border-[#D7CCC8]',
                ],
                marked && [
                    'bg-[#FFD700] text-[#5D4037]', // Gold background with brown text
                    'border-2 border-[#FFA000]',
                    'shadow-[0_0_12px_rgba(255,215,0,0.6)]', // Gold glow shadow
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
