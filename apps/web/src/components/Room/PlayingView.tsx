'use client';

import { useEffect, useRef, useState } from 'react';
import { TicketGrid } from '@/components/Ticket';
import { CurrentNumber, WaitingBoard } from '@/components/Game';
import { cn, vibrate, formatNumber } from '@/lib/utils';
import type { RoomState, Player } from '@lototet/shared';

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

    // Toast state for "Sắp BINGO" notification
    const [showWaitingToast, setShowWaitingToast] = useState(false);
    const waitingToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Show toast when waiting board updates
    useEffect(() => {
        if (game?.waitingBoard && game.waitingBoard.length > 0) {
            setShowWaitingToast(true);

            // Clear existing timeout
            if (waitingToastTimeoutRef.current) {
                clearTimeout(waitingToastTimeoutRef.current);
            }

            // Hide after 5 seconds
            waitingToastTimeoutRef.current = setTimeout(() => {
                setShowWaitingToast(false);
            }, 5000);
        } else {
            setShowWaitingToast(false);
        }

        return () => {
            if (waitingToastTimeoutRef.current) {
                clearTimeout(waitingToastTimeoutRef.current);
            }
        };
    }, [game?.waitingBoard]);

    // Auto-respond "noNumber" if player doesn't have the current number
    useEffect(() => {
        if (!currentTurn?.number || !currentTurn?.turnId || !myPlayer?.ticket) return;
        if (hasResponded) return;
        // Prevent double response for same turn
        if (lastAutoRespondedTurnRef.current === currentTurn.turnId) return;

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
    }, [currentTurn?.number, currentTurn?.turnId, hasResponded, myPlayer?.ticket, myPlayer?.marked, onNoNumber]);

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
                        🎉 HÔ BINGO! 🎉
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

                    {/* Host: First draw button when no numbers drawn yet */}
                    {isHost && drawnNumbers.length === 0 && (
                        <div className="mt-4">
                            <button
                                onClick={onDraw}
                                className="w-full py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:from-indigo-400 hover:to-purple-400 transition-all shadow-lg"
                            >
                                🎲 Quay số đầu tiên
                            </button>
                        </div>
                    )}
                </div>

                {/* Ticket - điều chỉnh padding cho mobile */}
                <div
                    className="relative w-full max-w-sm mx-auto mt-2"
                    style={{
                        backgroundImage: 'url(/frame.svg)',
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                    }}
                >
                    <div className="p-4 pt-6 pb-8 flex justify-center">
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

                        {/* Host: First draw button when no numbers drawn yet */}
                        {isHost && drawnNumbers.length === 0 && (
                            <div className="mt-4">
                                <button
                                    onClick={onDraw}
                                    className="w-full py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:from-indigo-400 hover:to-purple-400 transition-all shadow-lg"
                                >
                                    🎲 Quay số đầu tiên
                                </button>
                            </div>
                        )}
                    </div>

                </aside>
            </div>

            {/* Toast Notification - Bottom Left */}
            {showWaitingToast && game?.waitingBoard && game.waitingBoard.length > 0 && (
                <div
                    className="fixed bottom-4 left-4 z-40 max-w-xs animate-slideInLeft"
                    onClick={() => setShowWaitingToast(false)}
                >
                    <div className="bg-slate-800/95 backdrop-blur-sm border border-amber-500/50 rounded-xl p-4 shadow-lg">
                        <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                            <span>⚠️</span>
                            <span>Sắp BINGO!</span>
                        </div>
                        <div className="space-y-2">
                            {game.waitingBoard.slice(0, 3).map((entry, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        'text-sm flex items-center gap-2',
                                        entry.playerId === myPlayer?.id ? 'text-amber-400' : 'text-slate-300'
                                    )}
                                >
                                    <span className="font-medium">
                                        {entry.playerId === myPlayer?.id ? '🎯 Bạn' : entry.playerName}
                                    </span>
                                    <span className="text-slate-500">chờ</span>
                                    <span className="bg-amber-500/20 px-2 py-0.5 rounded font-mono">
                                        {entry.waitingNumbers.join(', ')}
                                    </span>
                                </div>
                            ))}
                            {game.waitingBoard.length > 3 && (
                                <div className="text-xs text-slate-500">
                                    +{game.waitingBoard.length - 3} người khác
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
