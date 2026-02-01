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
            {/* Lobby with frame */}
            <div
                className="relative w-full max-w-lg"
                style={{
                    backgroundImage: 'url(/frame.svg)',
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                }}
            >
                {/* Content inside frame with padding */}
                <div className="p-8 sm:p-10 md:p-12">
                    {/* Ticket */}
                    <div className="flex justify-center">
                        <TicketGrid
                            ticket={myPlayer?.ticket}
                            marked={myPlayer?.marked}
                        />
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={onReroll}
                            disabled={myPlayer?.ready}
                            className="flex-1 py-3 px-4 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '2px solid #d4a000',
                                color: '#d4a000',
                            }}
                        >
                            Đổi vé
                        </button>
                        <button
                            onClick={onReady}
                            disabled={myPlayer?.ready}
                            className="flex-1 py-3 px-4 rounded-lg font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed btn-traditional-red"
                        >
                            {myPlayer?.ready ? 'Đã sẵn sàng' : 'Sẵn sàng'}
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
        </div>
    );
}
