'use client';

import { useState, useEffect, useRef } from 'react';
import type { JoinRequest } from '@lototet/shared';

interface PendingRequestsFloatProps {
    requests: JoinRequest[];
    onApprove: (requestId: string) => void;
    onReject: (requestId: string) => void;
}

interface VisibleRequest extends JoinRequest {
    fadeOut: boolean;
    timestamp: number;
}

export function PendingRequestsFloat({
    requests,
    onApprove,
    onReject,
}: PendingRequestsFloatProps) {
    const [visibleRequests, setVisibleRequests] = useState<VisibleRequest[]>([]);
    const processedIds = useRef<Set<string>>(new Set());

    // Handle new requests
    useEffect(() => {
        requests.forEach((req) => {
            if (!processedIds.current.has(req.requestId)) {
                processedIds.current.add(req.requestId);

                // Add new request
                setVisibleRequests(prev => {
                    const newReq: VisibleRequest = { ...req, fadeOut: false, timestamp: Date.now() };
                    let updated = [...prev, newReq];

                    // If more than 5, remove oldest
                    if (updated.length > 5) {
                        updated = updated.slice(-5);
                    }
                    return updated;
                });

                // Start fade out after 9.5 seconds
                setTimeout(() => {
                    setVisibleRequests(prev =>
                        prev.map(r => r.requestId === req.requestId ? { ...r, fadeOut: true } : r)
                    );
                }, 9500);

                // Remove after 10 seconds
                setTimeout(() => {
                    setVisibleRequests(prev => prev.filter(r => r.requestId !== req.requestId));
                }, 10000);
            }
        });

        // Clean up processed IDs for requests that no longer exist
        const currentIds = new Set(requests.map(r => r.requestId));
        processedIds.current.forEach(id => {
            if (!currentIds.has(id)) {
                processedIds.current.delete(id);
                setVisibleRequests(prev => prev.filter(r => r.requestId !== id));
            }
        });
    }, [requests]);

    if (visibleRequests.length === 0) return null;

    return (
        <div className="fixed right-4 top-20 z-30 space-y-2 w-72">
            {visibleRequests.map((req) => (
                <div
                    key={req.requestId}
                    className={`flex items-center justify-between p-3 rounded-lg shadow-lg transition-all duration-500 ${req.fadeOut ? 'opacity-0 translate-x-4' : 'opacity-100 animate-fadeIn'}`}
                    style={{
                        background: 'linear-gradient(180deg, rgba(139, 0, 0, 0.95) 0%, rgba(92, 0, 0, 0.98) 100%)',
                        border: '2px solid #d4a000',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                    }}
                >
                    {/* Player Name */}
                    <div className="font-medium text-amber-200 truncate">
                        {req.name}
                    </div>

                    {/* Balance & Action Buttons */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-200/60 flex items-center gap-1">
                            {req.balance.toLocaleString()}
                            <img src="/coin.svg" alt="" className="w-3 h-3" />
                        </span>
                        <button
                            onClick={() => onApprove(req.requestId)}
                            className="text-emerald-400 hover:text-emerald-300 text-lg transition-all hover:scale-110"
                            title="Duyệt"
                        >
                            ✓
                        </button>
                        <button
                            onClick={() => onReject(req.requestId)}
                            className="text-red-400 hover:text-red-300 text-lg transition-all hover:scale-110"
                            title="Từ chối"
                        >
                            ✗
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
