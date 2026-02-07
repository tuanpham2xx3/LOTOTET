'use client';

import { useEffect, useRef, useState } from 'react';
import { TicketGrid } from '@/components/Ticket';
import { CurrentNumber, WaitingBoard } from '@/components/Game';
import { cn, vibrate, formatNumber } from '@/lib/utils';
import { useNewWaitingEntries, useClearNewWaitingEntries } from '@/stores/gameStore';
import type { RoomState, Player, WaitingState } from '@lototet/shared';

interface PlayingViewProps {
    roomState: RoomState;
    myPlayer: Player | null;
    isHost: boolean;
    currentTurn: { turnId: number; number: number } | null;
    pendingPlayerIds: string[];
    onDraw: () => void;
    onMark: (row: number, col: number) => void;
    onNoNumber: () => void;
    onBingo: () => void;
}

export function PlayingView({
    roomState,
    myPlayer,
    isHost,
    currentTurn,
    pendingPlayerIds,
    onDraw,
    onMark,
    onNoNumber,
    onBingo,
}: PlayingViewProps) {
    const game = roomState.game;
    const drawnNumbers = game?.drawnNumbers || [];

    // Get the display number - prefer currentTurn.number, fallback to latest drawn number
    const displayNumber = currentTurn?.number ?? (drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : undefined);
    const displayTurnId = currentTurn?.turnId ?? (drawnNumbers.length > 0 ? drawnNumbers.length : undefined);

    const hasResponded = myPlayer?.respondedTurnId === currentTurn?.turnId;
    const isPending = pendingPlayerIds.includes(myPlayer?.id || '');
    const betAmount = roomState.betAmount || 0;
    const totalPot = betAmount * roomState.players.length;

    // Track last auto-responded turn to prevent double responses
    const lastAutoRespondedTurnRef = useRef<number | null>(null);

    // Toast state for "Sắp BINGO" notification - using entries from store
    const newWaitingEntries = useNewWaitingEntries();
    const clearNewWaitingEntries = useClearNewWaitingEntries();
    const [toastEntries, setToastEntries] = useState<WaitingState[]>([]);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Track last played audio number to avoid replaying
    const lastPlayedNumberRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Reset audio state when component mounts (new game starts)
    useEffect(() => {
        // Reset the last played number when PlayingView mounts
        lastPlayedNumberRef.current = null;

        // Cleanup any playing audio when component unmounts
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            lastPlayedNumberRef.current = null;
        };
    }, []);

    // Play audio when new number is drawn
    useEffect(() => {
        if (currentTurn?.number && currentTurn.number !== lastPlayedNumberRef.current) {
            // Stop any currently playing audio first
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }

            lastPlayedNumberRef.current = currentTurn.number;
            const audio = new Audio(`/nums_audio/${currentTurn.number}.wav`);
            audioRef.current = audio;
            audio.play().catch(() => {
                // Silent fail for audio autoplay restrictions
            });
        }
    }, [currentTurn?.number]);

    // Show toast when new entries arrive from store
    useEffect(() => {
        if (newWaitingEntries.length > 0) {
            // Show these entries as toast
            setToastEntries(newWaitingEntries);

            // Clear from store immediately
            clearNewWaitingEntries();

            // Clear existing timeout
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }

            // Hide toast after 5 seconds
            toastTimeoutRef.current = setTimeout(() => {
                setToastEntries([]);
                toastTimeoutRef.current = null;
            }, 5000);
        }
    }, [newWaitingEntries, clearNewWaitingEntries]);

    // Cleanup timeout on unmount only
    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);

    // Auto-respond "noNumber" if player doesn't have the current number
    useEffect(() => {


        if (!currentTurn?.number || !currentTurn?.turnId || !myPlayer?.ticket) {
            return;
        }
        if (hasResponded) {
            return;
        }
        // Prevent double response for same turn
        if (lastAutoRespondedTurnRef.current === currentTurn.turnId) {
            return;
        }

        // Check if player has the number on their ticket (and not yet marked)
        let hasNumber = false;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (myPlayer.ticket[r][c] === currentTurn.number && !myPlayer.marked?.[r]?.[c]) {
                    hasNumber = true;
                    break;
                }
            }
            if (hasNumber) break;
        }



        if (!hasNumber) {
            // Auto-send noNumber response
            lastAutoRespondedTurnRef.current = currentTurn.turnId;
            onNoNumber();
        }
    }, [currentTurn?.number, currentTurn?.turnId, hasResponded, myPlayer?.ticket, myPlayer?.marked, myPlayer?.id, onNoNumber]);

    // Check if player can claim BINGO (has a complete row)
    const canBingo = (() => {
        if (!myPlayer?.ticket || !myPlayer?.marked) return false;
        for (let row = 0; row < 9; row++) {
            let markedCount = 0;
            let numberCount = 0;
            for (let col = 0; col < 9; col++) {
                if (myPlayer.ticket[row][col] !== null) {
                    numberCount++;
                    if (myPlayer.marked[row][col]) {
                        markedCount++;
                    }
                }
            }
            // Each row has exactly 5 numbers
            if (numberCount === 5 && markedCount === 5) {
                return true;
            }
        }
        return false;
    })();

    // Handle cell click - mark any drawn number
    const handleCellClick = (row: number, col: number) => {
        const cellValue = myPlayer?.ticket?.[row]?.[col];
        const drawnNumbers = game?.drawnNumbers || [];

        // Allow marking if cell contains a drawn number
        if (cellValue !== null && cellValue !== undefined && drawnNumbers.includes(cellValue)) {
            vibrate(50);
            onMark(row, col);
        }
    };

    return (
        <>
            <div className="animate-fadeInUp relative">
                {/* BINGO Banner - Only shows when canBingo is true */}
                {canBingo && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                        <button
                            onClick={() => {
                                vibrate(200);
                                onBingo();
                            }}
                            className="
                                px-12 py-6 
                                bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400
                                text-4xl md:text-5xl font-black text-white
                                rounded-2xl
                                shadow-[0_0_60px_rgba(251,191,36,0.8)]
                                animate-pulse
                                hover:scale-110 active:scale-95
                                transition-transform duration-200
                                border-4 border-yellow-300
                            "
                        >
                            HÔ BINGO!
                        </button>
                    </div>
                )}

                {/* Mobile Layout */}
                <div className="md:hidden flex flex-col items-center">
                    {/* Số hiện tại - không có card background */}
                    <div className="w-full flex justify-center">
                        <CurrentNumber
                            number={displayNumber}
                            turnId={displayTurnId}
                        />
                    </div>

                    {/* Ticket - điều chỉnh padding cho mobile */}
                    <div
                        className="relative w-full max-w-[420px] mx-auto mt-2"
                        style={{
                            backgroundImage: 'url(/frame.svg)',
                            backgroundSize: '100% 100%',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                        }}
                    >
                        <div className="p-8 pt-10 pb-12 flex justify-center">
                            <TicketGrid
                                ticket={myPlayer?.ticket}
                                marked={myPlayer?.marked}
                                currentNumber={displayNumber}
                                drawnNumbers={drawnNumbers}
                                onCellClick={handleCellClick}
                            />
                        </div>
                    </div>

                </div>

                {/* Desktop Layout */}
                <div className="hidden md:flex gap-6 justify-center">
                    {/* Left: Ticket */}
                    <div
                        className="relative w-full max-w-lg"
                        style={{
                            backgroundImage: 'url(/frame.svg)',
                            backgroundSize: '100% 100%',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                        }}
                    >
                        <div className="p-8 sm:p-10 md:p-12 flex justify-center">
                            <TicketGrid
                                ticket={myPlayer?.ticket}
                                marked={myPlayer?.marked}
                                currentNumber={displayNumber}
                                drawnNumbers={drawnNumbers}
                                onCellClick={handleCellClick}
                            />
                        </div>
                    </div>

                    {/* Right: Sidebar - same width as ticket, with frame */}
                    <aside
                        className="w-full max-w-lg"
                        style={{
                            backgroundImage: 'url(/frame.svg)',
                            backgroundSize: '100% 100%',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                        }}
                    >
                        {/* Current Number - Centered */}
                        <div className="p-8 sm:p-10 md:p-12 h-full flex flex-col items-center justify-center min-h-[400px]">
                            {/* Số hiện tại */}
                            <CurrentNumber
                                number={displayNumber}
                                turnId={displayTurnId}
                            />
                        </div>

                    </aside>
                </div>
            </div>

            {/* Toast Notification - Top Left (below header) - OUTSIDE animated div */}
            {toastEntries.length > 0 && (
                <div
                    className="fixed top-16 left-4 z-40 max-w-sm animate-fadeInDown"
                >
                    <div className="space-y-2">
                        {toastEntries.slice(0, 3).map((entry, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg"
                                style={{
                                    background: 'linear-gradient(90deg, rgba(60, 0, 0, 0.95) 0%, rgba(80, 10, 10, 0.9) 100%)',
                                    border: '2px solid #d4a000',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                                }}
                            >
                                <span className={cn(
                                    'font-medium text-sm truncate max-w-[120px]',
                                    entry.playerId === myPlayer?.id ? 'text-amber-300' : 'text-amber-100'
                                )}>
                                    {entry.playerId === myPlayer?.id ? 'Bạn' : entry.playerName}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-amber-200/60 text-sm">chờ</span>
                                    <span className="bg-amber-500/30 px-3 py-1 rounded text-amber-200 font-mono text-sm font-bold">
                                        {entry.waitingNumbers.join(', ')}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {toastEntries.length > 3 && (
                            <div
                                className="text-xs text-amber-200/60 text-center py-1.5 px-3 rounded-lg"
                                style={{
                                    background: 'rgba(60, 0, 0, 0.8)',
                                    border: '1px solid rgba(212, 160, 0, 0.5)',
                                }}
                            >
                                +{toastEntries.length - 3} người khác
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
