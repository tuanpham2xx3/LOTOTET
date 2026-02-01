'use client';

import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

interface CurrentNumberProps {
    number?: number;
    turnId?: number;
}

export function CurrentNumber({ number, turnId }: CurrentNumberProps) {
    const [isRolling, setIsRolling] = useState(false);
    const [displayNumber, setDisplayNumber] = useState<number | undefined>(undefined);
    const [videoKey, setVideoKey] = useState(0); // Force reload video
    const prevTurnIdRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        // Khi có turnId mới và number mới -> play animation
        if (turnId !== undefined && turnId !== prevTurnIdRef.current && number !== undefined) {
            setIsRolling(true);
            setVideoKey(prev => prev + 1); // Force reload video
            prevTurnIdRef.current = turnId;
        } else if (number !== undefined && !isRolling) {
            setDisplayNumber(number);
        }
    }, [turnId, number, isRolling]);

    // Khi video kết thúc
    const handleVideoEnded = () => {
        setIsRolling(false);
        if (number !== undefined) {
            setDisplayNumber(number);
        }
    };

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
        <div className="text-center p-2 md:p-6">
            {/* Video animation khi roll */}
            {isRolling && (
                <div className="flex justify-center">
                    <video
                        key={videoKey}
                        src="/roll_num.webm"
                        autoPlay
                        muted
                        playsInline
                        onEnded={handleVideoEnded}
                        onLoadedData={(e) => {
                            // Tăng tốc độ video (1 = bình thường, 2 = gấp đôi, 3 = gấp 3...)
                            (e.target as HTMLVideoElement).playbackRate = 8;
                        }}
                        className="w-20 h-20 md:w-64 md:h-64"
                    />
                </div>
            )}

            {/* Số hiện tại sau khi animation xong - với background */}
            {!isRolling && displayNumber !== undefined && (
                <div
                    key={displayNumber}
                    className="relative flex items-center justify-center w-20 h-20 md:w-64 md:h-64 mx-auto animate-number-reveal"
                >
                    {/* Background SVG */}
                    <img
                        src="/bg_number.svg"
                        alt=""
                        className="absolute inset-0 w-full h-full"
                    />
                    {/* Number on top */}
                    <span className={cn(
                        'relative z-10',
                        'text-3xl md:text-7xl lg:text-8xl font-bold',
                        'text-amber-100',
                        'drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]',
                    )}>
                        {displayNumber}
                    </span>
                </div>
            )}
        </div>
    );
}
