'use client';

import { useState } from 'react';
import { cn, formatBalance } from '@/lib/utils';
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

    // State for edit balance modal
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [balanceInput, setBalanceInput] = useState('');

    // State for kick confirmation modal
    const [kickingPlayer, setKickingPlayer] = useState<Player | null>(null);

    const handleBetChange = (value: string) => {
        // Only allow digits
        let numericValue = value.replace(/[^0-9]/g, '');
        // Limit to max 6 digits (999999)
        if (numericValue.length > 6) {
            numericValue = numericValue.slice(0, 6);
        }

        let num = parseInt(numericValue, 10);
        if (isNaN(num)) num = 0;

        // Calculate max allowed bet:
        // 1. Cannot exceed host's balance
        // 2. Cannot exceed any ready player's balance
        const hostBalance = myPlayer?.balance ?? 0;
        const readyPlayers = roomState.players.filter(p => p.ready);
        const minReadyBalance = readyPlayers.length > 0
            ? Math.min(...readyPlayers.map(p => p.balance))
            : Infinity;
        const maxAllowed = Math.min(hostBalance, minReadyBalance, 999999);

        if (num > maxAllowed) {
            num = maxAllowed;
        }

        setBetInput(num === 0 && numericValue === '' ? '' : String(num));
        onSetBet(num);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Allow: backspace, delete, tab, escape, enter, arrows
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
        if (allowedKeys.includes(e.key)) return;
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
        // Block non-digit keys
        if (!/^\d$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const openEditBalance = (player: Player) => {
        setEditingPlayer(player);
        setBalanceInput(String(player.balance));
    };

    const confirmEditBalance = () => {
        if (editingPlayer) {
            const parsed = parseInt(balanceInput, 10);
            if (!isNaN(parsed) && parsed >= 0) {
                onUpdateBalance(editingPlayer.id, parsed);
            }
        }
        setEditingPlayer(null);
        setBalanceInput('');
    };

    const cancelEditBalance = () => {
        setEditingPlayer(null);
        setBalanceInput('');
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
                        <img src="/menu_btn.svg" alt="Đóng" className="w-8 h-8" />
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
                                <div className="text-xs text-[#d4a000] mb-1 flex items-center gap-1">
                                    <img src="/your_balance.svg" alt="" className="w-4 h-4" />
                                    Số dư
                                </div>
                                <div className="text-amber-400 font-bold text-lg flex items-center gap-1">
                                    {formatBalance(myPlayer?.balance ?? 0)}
                                    <img src="/coin.svg" alt="" className="w-5 h-5" />
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-[#d4a000] mb-1 flex items-center gap-1">
                                    <img src="/money_bag.svg" alt="" className="w-4 h-4" />
                                    Tổng cược
                                </div>
                                <div className="text-emerald-400 font-bold text-lg flex items-center gap-1">
                                    {formatBalance((roomState.betAmount || 0) * roomState.players.length)}
                                    <img src="/coin.svg" alt="" className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bet Amount - Host Only */}
                    {isHost && (() => {
                        // Calculate max allowed bet for display
                        const hostBalance = myPlayer?.balance ?? 0;
                        const readyPlayers = roomState.players.filter(p => p.ready);
                        const minReadyBalance = readyPlayers.length > 0
                            ? Math.min(...readyPlayers.map(p => p.balance))
                            : Infinity;
                        const maxAllowed = Math.min(hostBalance, minReadyBalance, 999999);
                        const limitingPlayer = readyPlayers.find(p => p.balance === maxAllowed && p.balance < hostBalance);

                        return (
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
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={betInput}
                                        onChange={(e) => handleBetChange(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="input-traditional flex-1"
                                        placeholder="0"
                                    />
                                    <img src="/coin.svg" alt="" className="w-8 h-8" />
                                </div>
                                {/* Show max limit info */}
                                {maxAllowed < 999999 && (
                                    <p className="text-xs text-amber-200/60 mt-2">
                                        Tối đa: {maxAllowed.toLocaleString()}
                                        {limitingPlayer && (
                                            <span className="text-amber-400"> (giới hạn bởi {limitingPlayer.name})</span>
                                        )}
                                    </p>
                                )}
                            </div>
                        );
                    })()}

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
                                    className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10"
                                >
                                    <div className="flex items-center gap-2">
                                        {player.isHost && (
                                            <img src="/crown.svg" alt="Chủ phòng" className="w-5 h-5" />
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
                                                onClick={() => openEditBalance(player)}
                                                className="text-xs text-indigo-400 hover:text-indigo-300"
                                            >
                                                <span className="flex items-center gap-0.5">
                                                    {formatBalance(player.balance)}
                                                    <img src="/coin.svg" alt="" className="w-3 h-3" />
                                                </span>
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                                {formatBalance(player.balance)}
                                                <img src="/coin.svg" alt="" className="w-3 h-3" />
                                            </span>
                                        )}
                                        {player.ready ? (
                                            <span className="text-emerald-400 text-xs">✓</span>
                                        ) : (
                                            <span className="text-slate-500 text-xs">Chờ</span>
                                        )}
                                        {isHost && !player.isHost && (
                                            <button
                                                onClick={() => setKickingPlayer(player)}
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
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{req.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                                {formatBalance(req.balance)}
                                                <img src="/coin.svg" alt="" className="w-3 h-3" />
                                            </span>
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
            </div>

            {/* Edit Balance Modal */}
            {editingPlayer && (
                <>
                    {/* Modal Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/70 z-[60] animate-fadeIn"
                        onClick={cancelEditBalance}
                    />
                    {/* Modal */}
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fadeInUp">
                        <div
                            className="w-full max-w-sm rounded-xl overflow-hidden"
                            style={{
                                background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.98) 0%, rgba(60, 0, 0, 1) 100%)',
                                border: '3px solid #d4a000',
                                boxShadow: '0 0 40px rgba(212, 160, 0, 0.4)',
                            }}
                        >
                            {/* Header */}
                            <div
                                className="flex items-center justify-between px-4 py-3"
                                style={{
                                    background: 'rgba(74, 4, 4, 0.9)',
                                    borderBottom: '2px solid #d4a000',
                                }}
                            >
                                <h3 className="text-lg font-bold text-amber-400">
                                    Chỉnh số dư
                                </h3>
                                <button
                                    onClick={cancelEditBalance}
                                    className="text-amber-200/60 hover:text-amber-200 text-xl"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-5">
                                {/* Player Info */}
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xl">
                                        {editingPlayer.isHost ? '👑' : <img src="/players.svg" alt="" className="w-6 h-6 inline" />}
                                    </span>
                                    <span className="text-amber-100 font-medium">
                                        {editingPlayer.name}
                                    </span>
                                </div>

                                {/* Balance Input */}
                                <div className="flex items-center gap-2">
                                    <div
                                        className="rounded-lg p-1 flex-1 transition-all focus-within:border-[#ffd700] focus-within:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_0_10px_rgba(212,160,0,0.4)]"
                                        style={{
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            border: '2px solid #d4a000',
                                        }}
                                    >
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={balanceInput}
                                            onChange={(e) => {
                                                // Only allow digits, max 6 characters
                                                let val = e.target.value.replace(/[^0-9]/g, '');
                                                if (val.length > 6) {
                                                    val = val.slice(0, 6);
                                                }
                                                const num = parseInt(val, 10);
                                                if (!isNaN(num) && num > 999999) {
                                                    setBalanceInput('999999');
                                                } else {
                                                    setBalanceInput(val);
                                                }
                                            }}
                                            className="w-full bg-transparent border-none outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none text-amber-100 text-xl font-bold px-3 py-2"
                                            placeholder="0"
                                            autoFocus
                                        />
                                    </div>
                                    <img src="/coin.svg" alt="" className="w-8 h-8" />
                                </div>

                                {/* Quick Add Buttons */}
                                <div className="flex gap-2 mt-4">
                                    {[10000, 50000, 100000].map((amount) => (
                                        <button
                                            key={amount}
                                            onClick={() => {
                                                const currentVal = parseInt(balanceInput || '0', 10);
                                                const newVal = Math.min(currentVal + amount, 999999);
                                                setBalanceInput(String(newVal));
                                            }}
                                            className="flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all"
                                            style={{
                                                background: 'rgba(212, 160, 0, 0.2)',
                                                border: '1px solid #d4a000',
                                                color: '#d4a000',
                                            }}
                                        >
                                            +{(amount / 1000)}k
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div
                                className="flex gap-3 p-4"
                                style={{
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    borderTop: '1px solid rgba(212, 160, 0, 0.3)',
                                }}
                            >
                                <button
                                    onClick={cancelEditBalance}
                                    className="flex-1 py-3 rounded-lg font-bold transition-all"
                                    style={{
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: '2px solid rgba(212, 160, 0, 0.5)',
                                        color: '#d4a000',
                                    }}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={confirmEditBalance}
                                    className="flex-1 py-3 rounded-lg font-bold transition-all btn-traditional-red"
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Kick Confirmation Modal */}
            {kickingPlayer && (
                <>
                    {/* Modal Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/70 z-[60] animate-fadeIn"
                        onClick={() => setKickingPlayer(null)}
                    />
                    {/* Modal */}
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fadeInUp">
                        <div
                            className="w-full max-w-sm rounded-xl overflow-hidden"
                            style={{
                                background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.98) 0%, rgba(60, 0, 0, 1) 100%)',
                                border: '3px solid #d4a000',
                                boxShadow: '0 0 40px rgba(212, 160, 0, 0.4)',
                            }}
                        >
                            {/* Header */}
                            <div
                                className="flex items-center justify-between px-4 py-3"
                                style={{
                                    background: 'rgba(74, 4, 4, 0.9)',
                                    borderBottom: '2px solid #d4a000',
                                }}
                            >
                                <h3 className="text-lg font-bold text-amber-400">
                                    Xác nhận đuổi
                                </h3>
                                <button
                                    onClick={() => setKickingPlayer(null)}
                                    className="text-amber-200/60 hover:text-amber-200 text-xl"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-5 text-center">
                                <div className="mb-4"><img src="/players.svg" alt="" className="w-12 h-12 mx-auto" /></div>
                                <p className="text-amber-100 mb-2">
                                    Bạn có chắc muốn đuổi
                                </p>
                                <p className="text-xl font-bold text-amber-400">
                                    {kickingPlayer.name}?
                                </p>
                            </div>

                            {/* Footer */}
                            <div
                                className="flex gap-3 p-4"
                                style={{
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    borderTop: '1px solid rgba(212, 160, 0, 0.3)',
                                }}
                            >
                                <button
                                    onClick={() => setKickingPlayer(null)}
                                    className="flex-1 py-3 rounded-lg font-bold transition-all"
                                    style={{
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: '2px solid rgba(212, 160, 0, 0.5)',
                                        color: '#d4a000',
                                    }}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={() => {
                                        onKickPlayer(kickingPlayer.id);
                                        setKickingPlayer(null);
                                    }}
                                    className="flex-1 py-3 rounded-lg font-bold transition-all btn-traditional-red"
                                >
                                    Đuổi
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
