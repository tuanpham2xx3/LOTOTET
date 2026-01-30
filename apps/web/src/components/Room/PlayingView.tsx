'use client';

import { TicketGrid } from '@/components/Ticket';
import { CurrentNumber, WaitingBoard, DrawnNumbers, ActionButtons } from '@/components/Game';
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
    const hasResponded = myPlayer?.respondedTurnId === currentTurn?.turnId;
    const isPending = pendingPlayerIds.includes(myPlayer?.id || '');
    const betAmount = roomState.betAmount || 0;
    const totalPot = betAmount * roomState.players.length;

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

    // Handle cell click - find current number and mark
    const handleCellClick = (row: number, col: number) => {
        if (!currentTurn || hasResponded) return;

        const cellValue = myPlayer?.ticket?.[row]?.[col];
        if (cellValue === currentTurn.number) {
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
            <div className="md:hidden space-y-4">
                {/* Current Number + Action Buttons + Drawn Numbers - All in one */}
                <div className="card p-4">
                    {/* Số hiện tại */}
                    <CurrentNumber
                        number={currentTurn?.number ?? null}
                        turnId={currentTurn?.turnId}
                    />

                    {/* Action Buttons - ngay dưới số */}
                    <div className="mt-4">
                        <ActionButtons
                            onDraw={onDraw}
                            onNoNumber={onNoNumber}
                            isHost={isHost}
                            hasResponded={hasResponded}
                            currentNumber={currentTurn?.number}
                        />
                    </div>

                    {/* Drawn Numbers */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <DrawnNumbers
                            numbers={game?.drawnNumbers || []}
                            currentNumber={currentTurn?.number}
                        />
                    </div>
                </div>

                {/* Ticket */}
                <div
                    className="relative w-full max-w-md mx-auto"
                    style={{
                        backgroundImage: 'url(/frame.svg)',
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                    }}
                >
                    <div className="p-6 sm:p-8 flex justify-center">
                        <TicketGrid
                            ticket={myPlayer?.ticket}
                            marked={myPlayer?.marked}
                            currentNumber={currentTurn?.number}
                            onCellClick={handleCellClick}
                            readonly={hasResponded}
                        />
                    </div>
                </div>

                {/* Waiting Board - Collapsible */}
                {game?.waitingBoard && game.waitingBoard.length > 0 && (
                    <details className="card p-3">
                        <summary className="cursor-pointer text-amber-400 text-sm font-medium">
                            ⚠️ Sắp BINGO ({game.waitingBoard.length})
                        </summary>
                        <div className="mt-2">
                            <WaitingBoard
                                waitingBoard={game.waitingBoard}
                                myPlayerId={myPlayer?.id}
                            />
                        </div>
                    </details>
                )}


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
                            currentNumber={currentTurn?.number}
                            onCellClick={handleCellClick}
                            readonly={hasResponded}
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
                    {/* Current Number + Action Buttons + Drawn Numbers - All in one */}
                    <div className="p-8 sm:p-10 md:p-12">
                        {/* Số hiện tại */}
                        <CurrentNumber
                            number={currentTurn?.number ?? null}
                            turnId={currentTurn?.turnId}
                        />

                        {/* Action Buttons - ngay dưới số */}
                        <div className="mt-4">
                            <ActionButtons
                                onDraw={onDraw}
                                onNoNumber={onNoNumber}
                                isHost={isHost}
                                hasResponded={hasResponded}
                                currentNumber={currentTurn?.number}
                            />
                        </div>

                        {/* Drawn Numbers */}
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <DrawnNumbers
                                numbers={game?.drawnNumbers || []}
                                currentNumber={currentTurn?.number}
                            />
                        </div>
                    </div>

                    {/* Waiting Board */}
                    {game?.waitingBoard && game.waitingBoard.length > 0 && (
                        <div className="card p-4">
                            <WaitingBoard
                                waitingBoard={game.waitingBoard}
                                myPlayerId={myPlayer?.id}
                            />
                        </div>
                    )}

                    {/* Pending Players */}
                    {pendingPlayerIds.length > 0 && (
                        <div className="card p-4">
                            <h3 className="text-sm font-medium text-slate-400 mb-2">
                                Đợi phản hồi ({pendingPlayerIds.length})
                            </h3>
                            <div className="flex flex-wrap gap-1">
                                {roomState.players
                                    .filter((p) => pendingPlayerIds.includes(p.id))
                                    .map((p) => (
                                        <span key={p.id} className="badge">
                                            {p.name}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
