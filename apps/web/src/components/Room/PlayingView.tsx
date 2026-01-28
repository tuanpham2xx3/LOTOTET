'use client';

import { TicketGrid } from '@/components/Ticket';
import { CurrentNumber, WaitingBoard, DrawnNumbers, ActionButtons } from '@/components/Game';
import { cn, vibrate } from '@/lib/utils';
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
        <div className="animate-fadeInUp">
            {/* Mobile Layout */}
            <div className="md:hidden space-y-4">
                {/* Current Number - Top */}
                <div className="card p-4 text-center">
                    <CurrentNumber
                        number={currentTurn?.number ?? null}
                        turnId={currentTurn?.turnId}
                    />
                    {!hasResponded && currentTurn && (
                        <p className="text-sm text-amber-400 animate-pulse mt-2">
                            Kiểm tra vé của bạn!
                        </p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="px-2">
                    <ActionButtons
                        onMark={() => {
                            // Find and mark the current number automatically
                            if (!currentTurn || !myPlayer?.ticket) return;
                            for (let r = 0; r < 9; r++) {
                                for (let c = 0; c < 9; c++) {
                                    if (myPlayer.ticket[r][c] === currentTurn.number) {
                                        onMark(r, c);
                                        return;
                                    }
                                }
                            }
                        }}
                        onNoNumber={onNoNumber}
                        onBingo={onBingo}
                        canMark={!hasResponded && !!currentTurn}
                        canBingo={canBingo}
                        hasResponded={hasResponded}
                    />
                </div>

                {/* Ticket */}
                <div className="card p-3 flex justify-center">
                    <TicketGrid
                        ticket={myPlayer?.ticket}
                        marked={myPlayer?.marked}
                        currentNumber={currentTurn?.number}
                        onCellClick={handleCellClick}
                        readonly={hasResponded}
                    />
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

                {/* Drawn Numbers */}
                <div className="card p-3">
                    <DrawnNumbers
                        numbers={game?.drawnNumbers || []}
                        currentNumber={currentTurn?.number}
                    />
                </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex gap-6">
                {/* Left: Ticket */}
                <div className="flex-1">
                    <div className="card p-4">
                        <h3 className="text-sm font-medium text-slate-400 mb-3">🎟️ Vé của bạn</h3>
                        <div className="flex justify-center">
                            <TicketGrid
                                ticket={myPlayer?.ticket}
                                marked={myPlayer?.marked}
                                currentNumber={currentTurn?.number}
                                onCellClick={handleCellClick}
                                readonly={hasResponded}
                            />
                        </div>
                    </div>

                    {/* Drawn Numbers */}
                    <div className="card p-4 mt-4">
                        <DrawnNumbers
                            numbers={game?.drawnNumbers || []}
                            currentNumber={currentTurn?.number}
                        />
                    </div>
                </div>

                {/* Right: Sidebar */}
                <aside className="w-72 lg:w-80 space-y-4">
                    {/* Current Number */}
                    <div className="card p-4">
                        <CurrentNumber
                            number={currentTurn?.number ?? null}
                            turnId={currentTurn?.turnId}
                        />

                        {/* Host: Draw button */}
                        {isHost && (
                            <button
                                onClick={onDraw}
                                className="w-full btn btn-primary mt-4"
                            >
                                🎱 Quay số
                            </button>
                        )}

                        {/* Response status */}
                        {currentTurn && (
                            <div className="mt-3 text-center text-sm">
                                {hasResponded ? (
                                    <span className="text-emerald-400">✓ Đã phản hồi</span>
                                ) : (
                                    <span className="text-amber-400 animate-pulse">
                                        Đợi bạn phản hồi...
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="card p-4">
                        <ActionButtons
                            onMark={() => {
                                if (!currentTurn || !myPlayer?.ticket) return;
                                for (let r = 0; r < 9; r++) {
                                    for (let c = 0; c < 9; c++) {
                                        if (myPlayer.ticket[r][c] === currentTurn.number) {
                                            onMark(r, c);
                                            return;
                                        }
                                    }
                                }
                            }}
                            onNoNumber={onNoNumber}
                            onBingo={onBingo}
                            canMark={!hasResponded && !!currentTurn}
                            canBingo={canBingo}
                            hasResponded={hasResponded}
                        />
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
