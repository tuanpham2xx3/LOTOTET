'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    text?: string;
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-16 h-16',
        lg: 'w-24 h-24',
    };

    return (
        <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
            <img
                src="/menu_btn.svg"
                alt="Loading..."
                className={cn(
                    sizeClasses[size],
                    'animate-spin',
                )}
                style={{
                    animationDuration: '1s',
                }}
            />
            {text && (
                <p className="text-amber-200/80 text-sm animate-pulse">{text}</p>
            )}
        </div>
    );
}

// Full page loading overlay
export function LoadingOverlay({ text }: { text?: string }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                className="p-8 rounded-xl text-center"
                style={{
                    background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.95) 0%, rgba(92, 0, 0, 0.98) 100%)',
                    border: '3px solid #d4a000',
                    boxShadow: '0 0 30px rgba(212, 160, 0, 0.3)',
                }}
            >
                <LoadingSpinner size="lg" text={text} />
            </div>
        </div>
    );
}
