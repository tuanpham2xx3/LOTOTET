'use client';

import { TicketGrid } from '@/components/Ticket';
import { vibrate } from '@/lib/utils';
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
    roomState,
    myPlayer,
    isHost,
    onReroll,
    onReady,
    onStartGame,
}: LobbyViewProps) {
    // Check if all players are ready
    const allPlayersReady = roomState.players.length >= 2 &&
        roomState.players.every(player => player.ready);

    // Check if there are pending join requests
    const hasPendingRequests = roomState.pendingRequests.length > 0;

    return (
        <div className="animate-fadeInUp flex justify-center">
            {/* Floating Start Banner - Only for host when all ready AND no pending requests */}
            {isHost && allPlayersReady && !hasPendingRequests && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <button
                        onClick={() => {
                            vibrate(200);
                            onStartGame();
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
                        BẮT ĐẦU!
                    </button>
                </div>
            )}

            {/* Lobby with frame */}
            <div
                className="relative w-full max-w-lg py-4 sm:py-0"
                style={{
                    backgroundImage: 'url(/frame.svg)',
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                }}
            >
                {/* Content inside frame with padding */}
                <div className="p-5 pt-8 pb-8 sm:p-6 sm:pt-10 sm:pb-10 md:p-8 md:pt-12 md:pb-12">
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
                    {myPlayer?.ready && !isHost && (
                        <p className="text-center text-emerald-400 text-sm mt-4">
                            Đợi Host bắt đầu trò chơi...
                        </p>
                    )}
                    {myPlayer?.ready && isHost && !allPlayersReady && (
                        <p className="text-center text-amber-400 text-sm mt-4">
                            Đợi tất cả người chơi sẵn sàng...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
