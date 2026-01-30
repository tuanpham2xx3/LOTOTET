'use client';

import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

interface CurrentNumberProps {
    number?: number;
    turnId?: number;
}

// Thời gian GIF chạy (ms) - điều chỉnh theo độ dài thực tế của GIF
const GIF_DURATION = 2000;

export function CurrentNumber({ number, turnId }: CurrentNumberProps) {
    const [isRolling, setIsRolling] = useState(false);
    const [displayNumber, setDisplayNumber] = useState<number | undefined>(undefined);
    const [gifKey, setGifKey] = useState(0); // Force reload GIF
    const prevTurnIdRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        // Khi có turnId mới và number mới -> play animation
        if (turnId !== undefined && turnId !== prevTurnIdRef.current && number !== undefined) {
            setIsRolling(true);
            setGifKey(prev => prev + 1); // Force reload GIF
            prevTurnIdRef.current = turnId;

            // Sau GIF_DURATION ms, hiện số
            const timer = setTimeout(() => {
                setIsRolling(false);
                setDisplayNumber(number);
            }, GIF_DURATION);

            return () => clearTimeout(timer);
        } else if (number !== undefined && !isRolling) {
            setDisplayNumber(number);
        }
    }, [turnId, number, isRolling]);

    if (number === undefined && !isRolling) {
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
        <div className="text-center p-6">
            <p className="text-slate-400 text-sm mb-2">
                Lượt #{turnId}
            </p>

            {/* GIF animation khi roll */}
            {isRolling && (
                <div className="flex justify-center">
                    <img
                        key={gifKey}
                        src={`/roll_num.gif?t=${gifKey}`}
                        alt="Rolling..."
                        className="w-24 h-24 md:w-32 md:h-32"
                    />
                </div>
            )}

            {/* Số hiện tại sau khi animation xong */}
            {!isRolling && displayNumber !== undefined && (
                <div
                    key={displayNumber}
                    className={cn(
                        'text-5xl md:text-6xl lg:text-7xl font-bold',
                        'text-indigo-400',
                        'animate-number-reveal',
                    )}
                >
                    {displayNumber}
                </div>
            )}
        </div>
    );
}
