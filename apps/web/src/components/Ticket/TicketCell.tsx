'use client';

import { cn } from '@/lib/utils';

interface TicketCellProps {
    value: number | null;
    marked: boolean;
    isCurrentNumber?: boolean;
    isDrawn?: boolean;
    onClick?: () => void;
    disabled?: boolean;
}

export function TicketCell({
    value,
    marked,
    isCurrentNumber = false,
    isDrawn = false,
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
                'relative flex items-center justify-center transition-all duration-200 overflow-hidden',
                // Responsive sizing - consistent spacing
                'w-9 h-9 text-base',
                'md:w-10 md:h-10',
                'lg:w-11 lg:h-11 lg:text-lg',
                // Font
                'font-bold',
                // States
                isEmpty && 'bg-slate-800/50 cursor-default rounded-lg',
                !isEmpty && !marked && [
                    'bg-[#FFF8E1] text-[#4A2C2A]', // Cream background with darker brown text
                    'hover:bg-[#FFE4B5]',
                    'cursor-pointer',
                    'border-2 border-[#A1887F]', // Thicker, more visible border
                    'shadow-sm', // Subtle shadow for depth
                    'rounded-lg',
                ],
                // Marked state - use SVG background
                marked && 'text-[#5D4037]',
                // Current number highlight (strongest)
                isCurrentNumber && !marked && [
                    'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900',
                    'animate-pulse-number',
                    'bg-amber-500/20',
                    'rounded-lg',
                ],
                // Drawn but not marked (recommend) - blinking yellow
                isDrawn && !marked && !isCurrentNumber && [
                    'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900',
                    'animate-pulse',
                    'bg-yellow-400/30',
                ],
                // Disabled
                disabled && !marked && !isDrawn && 'opacity-50 cursor-not-allowed',
            )}
            style={marked ? {
                backgroundImage: 'url(/num_mark.svg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            } : undefined}
        >
            <span className="relative z-10">{value}</span>
        </button>
    );
}
