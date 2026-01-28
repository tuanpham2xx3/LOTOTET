'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';

export default function HomePage() {
  const router = useRouter();
  const { connect, socket, connected } = useGameStore();

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState(100000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize socket connection
  const ensureConnected = () => {
    if (!connected) {
      connect();
    }
    return useGameStore.getState().socket;
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const s = ensureConnected();
      if (!s) {
        setError('Không thể kết nối server');
        return;
      }

      // Wait for socket to connect
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
        if (s.connected) {
          clearTimeout(timeout);
          resolve();
        } else {
          s.once('connect', () => {
            clearTimeout(timeout);
            resolve();
          });
        }
      });

      // Create room with name and balance
      s.emit('room:create', { name, balance }, (response) => {
        if (response.roomId) {
          router.push(`/room/${response.roomId}`);
        } else {
          setError('Không thể tạo phòng');
          setLoading(false);
        }
      });
    } catch (err) {
      setError('Lỗi kết nối');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên');
      return;
    }
    if (!roomId.trim()) {
      setError('Vui lòng nhập Room ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const s = ensureConnected();
      if (!s) {
        setError('Không thể kết nối server');
        return;
      }

      // Wait for socket to connect
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
        if (s.connected) {
          clearTimeout(timeout);
          resolve();
        } else {
          s.once('connect', () => {
            clearTimeout(timeout);
            resolve();
          });
        }
      });

      // Join room
      s.emit('room:join', { roomId: roomId.toUpperCase(), name, balance }, (response) => {
        if (response.success) {
          router.push(`/room/${roomId.toUpperCase()}`);
        } else {
          setError(response.error?.message || 'Không thể vào phòng');
          setLoading(false);
        }
      });
    } catch (err) {
      setError('Lỗi kết nối');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 gradient-dark texture-grid">
      <div className="w-full max-w-md animate-fadeInUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-2">
            🎲 LOTOTET
          </h1>
          <p className="text-slate-400">Game Lô Tô Online</p>
        </div>

        {/* Card */}
        <div className="card p-6 glass shadow-glow">
          {/* Mode Toggle */}
          <div className="flex rounded-lg bg-slate-800/50 p-1 mb-6">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'create'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              Tạo phòng
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'join'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              Vào phòng
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="input-label">Tên của bạn</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên..."
                className="input"
                maxLength={20}
              />
            </div>

            {mode === 'join' && (
              <div>
                <label className="input-label">Room ID</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="input font-mono uppercase"
                  maxLength={6}
                />
              </div>
            )}

            <div>
              <label className="input-label">Số dư (VND)</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(Number(e.target.value))}
                placeholder="100000"
                className="input"
                min={10000}
                step={10000}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading}
              className="w-full btn btn-primary btn-lg disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </span>
              ) : mode === 'create' ? (
                '🏠 Tạo phòng mới'
              ) : (
                '🚀 Vào phòng'
              )}
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="mt-4 text-center text-xs text-slate-500">
          {connected ? (
            <span className="text-emerald-400">● Đã kết nối</span>
          ) : (
            <span className="text-slate-500">○ Chưa kết nối</span>
          )}
        </div>
      </div>
    </main>
  );
}
