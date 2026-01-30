'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { RoomState, Player, JoinRequest } from '@lototet/shared';

interface GameMenuProps {
    isOpen: boolean;
    onClose: () => void;
    roomState: RoomState;
    myPlayer: Player | null;
    isHost: boolean;
    canStart: boolean;
    onSetBet: (amount: number) => void;
    onApprove: (requestId: string) => void;
    onReject: (requestId: string) => void;
    onStartGame: () => void;
    onUpdateBalance: (playerId: string, balance: number) => void;
    onKickPlayer: (playerId: string) => void;
}

export function GameMenu({
    isOpen,
    onClose,
    roomState,
    myPlayer,
    isHost,
    canStart,
    onSetBet,
    onApprove,
    onReject,
    onStartGame,
    onUpdateBalance,
    onKickPlayer,
}: GameMenuProps) {
    const [betInput, setBetInput] = useState(String(roomState.betAmount ?? 0));

    const handleBetChange = (value: string) => {
        setBetInput(value);
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 0) {
            onSetBet(num);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 bg-black/60 z-40 transition-opacity duration-300',
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    'fixed top-0 right-0 h-full w-80 max-w-[85vw] z-50',
                    'transform transition-transform duration-300 ease-out',
                    'flex flex-col overflow-hidden',
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                )}
                style={{
                    backgroundColor: 'rgba(74, 4, 4, 0.85)',
                    borderLeft: '3px solid #d4a000',
                }}
            >
                {/* Header - same style as web header */}
                <div
                    className="flex items-center justify-end px-4 py-3"
                    style={{
                        backgroundColor: 'rgba(74, 4, 4, 0.85)',
                        borderBottom: '2px solid #d4a000'
                    }}
                >
                    <button
                        onClick={onClose}
                        className="hover:opacity-80 transition-opacity p-1"
                    >
                        <img src="/menu_btn.png" alt="Đóng" className="w-8 h-8" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Balance Info */}
                    <div
                        className="rounded-lg p-3"
                        style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            border: '2px solid #d4a000'
                        }}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="text-xs text-[#d4a000] mb-1">💰 Số dư của bạn</div>
                                <div className="text-amber-400 font-bold text-lg">
                                    {myPlayer?.balance.toLocaleString() ?? 0}đ
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-[#d4a000] mb-1">🏆 Tổng pot</div>
                                <div className="text-emerald-400 font-bold text-lg">
                                    {((roomState.betAmount || 0) * roomState.players.length).toLocaleString()}đ
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bet Amount - Host Only */}
                    {isHost && (
                        <div
                            className="rounded-lg p-3"
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                border: '2px solid #d4a000'
                            }}
                        >
                            <label className="block text-sm text-[#d4a000] mb-2">
                                Mức cược
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={betInput}
                                    onChange={(e) => handleBetChange(e.target.value)}
                                    className="input-traditional flex-1"
                                    placeholder="0"
                                    min="0"
                                />
                                <span className="text-[#d4a000]">🧧</span>
                            </div>
                        </div>
                    )}

                    {/* Players List */}
                    <div
                        className="rounded-lg p-3"
                        style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            border: '2px solid #d4a000'
                        }}
                    >
                        <h3 className="text-sm font-medium text-[#d4a000] mb-3">
                            Người chơi ({roomState.players.length})
                        </h3>
                        <div className="space-y-2">
                            {roomState.players.map((player) => (
                                <div
                                    key={player.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-slate-700/50"
                                >
                                    <div className="flex items-center gap-2">
                                        {player.isHost && (
                                            <span className="text-amber-400">👑</span>
                                        )}
                                        <span className="font-medium text-sm">
                                            {player.name}
                                        </span>
                                        {player.id === myPlayer?.id && (
                                            <span className="text-xs text-indigo-400">(Bạn)</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isHost ? (
                                            <button
                                                onClick={() => {
                                                    const newBalance = prompt(
                                                        `Nhập số dư mới cho ${player.name}:`,
                                                        String(player.balance)
                                                    );
                                                    if (newBalance !== null) {
                                                        const parsed = parseInt(newBalance, 10);
                                                        if (!isNaN(parsed) && parsed >= 0) {
                                                            onUpdateBalance(player.id, parsed);
                                                        }
                                                    }
                                                }}
                                                className="text-xs text-indigo-400 hover:text-indigo-300"
                                            >
                                                {player.balance.toLocaleString()}đ
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-400">
                                                {player.balance.toLocaleString()}đ
                                            </span>
                                        )}
                                        {player.ready ? (
                                            <span className="text-emerald-400 text-xs">✓</span>
                                        ) : (
                                            <span className="text-slate-500 text-xs">Chờ</span>
                                        )}
                                        {isHost && !player.isHost && (
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Đuổi ${player.name} khỏi phòng?`)) {
                                                        onKickPlayer(player.id);
                                                    }
                                                }}
                                                className="text-red-400 hover:text-red-300 text-sm"
                                                title="Đuổi"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pending Requests - Host Only */}
                    {isHost && roomState.pendingRequests.length > 0 && (
                        <div className="bg-amber-500/10 rounded-lg p-3">
                            <h3 className="text-sm font-medium text-amber-400 mb-3">
                                Yêu cầu tham gia ({roomState.pendingRequests.length})
                            </h3>
                            <div className="space-y-2">
                                {roomState.pendingRequests.map((req: JoinRequest) => (
                                    <div
                                        key={req.requestId}
                                        className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10"
                                    >
                                        <div>
                                            <span className="font-medium text-sm">{req.name}</span>
                                            <span className="text-xs text-slate-400 ml-2">
                                                {req.balance.toLocaleString()}đ
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onApprove(req.requestId)}
                                                className="text-emerald-400 hover:text-emerald-300 text-lg"
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={() => onReject(req.requestId)}
                                                className="text-red-400 hover:text-red-300 text-lg"
                                            >
                                                ✗
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer - Start Game Button */}
                {isHost && (
                    <div
                        className="p-4"
                        style={{ borderTop: '2px solid #d4a000' }}
                    >
                        <button
                            onClick={onStartGame}
                            disabled={!canStart}
                            className="w-full btn-traditional-red py-3 text-lg"
                        >
                            Bắt đầu trò chơi
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
