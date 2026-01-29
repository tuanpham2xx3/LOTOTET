'use client';

import { TicketGrid } from '@/components/Ticket';
import { cn } from '@/lib/utils';
import type { RoomState, Player } from '@lototet/shared';

interface LobbyViewProps {
    roomState: RoomState;
    myPlayer: Player | null;
    isHost: boolean;
    onReroll: () => void;
    onReady: () => void;
    onApprove: (requestId: string) => void;
    onReject: (requestId: string) => void;
    onStartGame: () => void;
    onSetBet: (amount: number) => void;
    onUpdateBalance: (playerId: string, balance: number) => void;
    onKickPlayer: (playerId: string) => void;
}

export function LobbyView({
    myPlayer,
    onReroll,
    onReady,
}: LobbyViewProps) {
    return (
        <div className="animate-fadeInUp flex justify-center">
            {/* Ticket Preview - Centered */}
            <div className="card p-4 w-full max-w-md">
                <h3 className="text-sm font-medium text-slate-400 mb-3 text-center">
                    Vé của bạn
                </h3>
                <div className="flex justify-center">
                    <TicketGrid
                        ticket={myPlayer?.ticket}
                        marked={myPlayer?.marked}
                        readonly={true}
                    />
                </div>
                <div className="mt-4 flex gap-2">
                    <button
                        onClick={onReroll}
                        disabled={myPlayer?.ready}
                        className="btn btn-secondary flex-1"
                    >
                        Đổi vé
                    </button>
                    <button
                        onClick={onReady}
                        disabled={myPlayer?.ready}
                        className={cn(
                            'btn flex-1',
                            myPlayer?.ready ? 'btn-success' : 'btn-primary',
                        )}
                    >
                        {myPlayer?.ready ? '✅ Đã sẵn sàng' : 'Sẵn sàng'}
                    </button>
                </div>

                {/* Waiting message for non-hosts */}
                {!myPlayer?.ready && (
                    <p className="text-center text-slate-500 text-sm mt-4">
                        Chọn vé và ấn "Sẵn sàng" để bắt đầu
                    </p>
                )}
                {myPlayer?.ready && (
                    <p className="text-center text-emerald-400 text-sm mt-4">
                        Đợi Host bắt đầu trò chơi...
                    </p>
                )}
            </div>
        </div>
    );
}

