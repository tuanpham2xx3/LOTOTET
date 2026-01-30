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
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fadeInUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="LOTOTET"
            className="w-56 h-32 md:w-64 md:h-40 mx-auto"
          />
        </div>

        {/* Card */}
        <div className="card-traditional p-6">
          {/* Mode Toggle */}
          <div className={`toggle-traditional mb-6 ${mode === 'join' ? 'join' : ''}`}>
            <button
              onClick={() => setMode('create')}
              className={`toggle-traditional-btn ${mode === 'create' ? 'active' : ''}`}
            >
              Tạo phòng
            </button>
            <button
              onClick={() => setMode('join')}
              className={`toggle-traditional-btn ${mode === 'join' ? 'active' : ''}`}
            >
              Vào phòng
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="input-label-traditional">Tên của bạn</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên..."
                className="input-traditional"
                maxLength={20}
              />
            </div>

            {mode === 'join' && (
              <div>
                <label className="input-label-traditional">Room ID</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="input-traditional font-mono uppercase"
                  maxLength={6}
                />
              </div>
            )}

            <div>
              <label className="input-label-traditional">Số dư (🧧)</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(Number(e.target.value))}
                placeholder="100000"
                className="input-traditional"
                min={10000}
                step={10000}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/50 border border-red-500/50 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading}
              className="w-full btn-traditional-red py-4 text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </span>
              ) : mode === 'create' ? (
                'Tạo phòng mới'
              ) : (
                'Vào phòng'
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
