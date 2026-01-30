'use client';

import { cn } from '@/lib/utils';

interface BingoBannerProps {
    onBingo: () => void;
    canBingo: boolean;
}

export function BingoBanner({ onBingo, canBingo }: BingoBannerProps) {
    if (!canBingo) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 blur-xl opacity-75 animate-pulse" />

                {/* Banner button */}
                <button
                    onClick={onBingo}
                    className={cn(
                        'relative z-10',
                        'px-12 py-8 md:px-16 md:py-10',
                        'rounded-2xl',
                        'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500',
                        'text-white text-3xl md:text-5xl font-black',
                        'shadow-2xl shadow-amber-500/50',
                        'hover:from-amber-400 hover:via-yellow-400 hover:to-orange-400',
                        'hover:scale-105',
                        'transition-all duration-200',
                        'animate-bounce',
                        'border-4 border-white/30',
                    )}
                >
                    🎉 HÔ BINGO! 🎉
                </button>
            </div>
        </div>
    );
}
