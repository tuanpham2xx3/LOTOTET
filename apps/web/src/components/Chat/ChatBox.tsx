'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatMessages, useSocket, useMyPlayerId, useRoomState } from '@/stores/gameStore';
import { ChatMessageItem } from './ChatMessage';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import type { ChatMessage } from '@lototet/shared';
import './Chat.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ltapi.iceteadev.site';

// Floating message with fade effect
interface FloatingMessage extends ChatMessage {
    fadeOut: boolean;
}

export function ChatBox() {
    const socket = useSocket();
    const roomState = useRoomState();
    const myPlayerId = useMyPlayerId();
    const messages = useChatMessages();
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [floatingMessages, setFloatingMessages] = useState<FloatingMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { isRecording, startRecording, stopRecording } = useAudioRecorder();
    const lastMessageCountRef = useRef(0);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // Handle new messages for floating display
    useEffect(() => {
        if (messages.length > lastMessageCountRef.current) {
            // Get new messages
            const newMessages = messages.slice(lastMessageCountRef.current);

            newMessages.forEach((msg) => {
                // Add new message to floating
                const floatingMsg: FloatingMessage = { ...msg, fadeOut: false };
                setFloatingMessages(prev => {
                    const updated = [...prev, floatingMsg].slice(-2); // Keep only last 2
                    return updated;
                });

                // Start fade out after 2 seconds
                setTimeout(() => {
                    setFloatingMessages(prev =>
                        prev.map(m => m.id === msg.id ? { ...m, fadeOut: true } : m)
                    );
                }, 2000);

                // Remove after fade animation (0.5s)
                setTimeout(() => {
                    setFloatingMessages(prev => prev.filter(m => m.id !== msg.id));
                }, 2500);
            });
        }
        lastMessageCountRef.current = messages.length;
    }, [messages]);

    const handleSend = () => {
        if (!socket || !input.trim()) return;

        socket.emit('chat:send', { content: input.trim() });
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleRecordToggle = async () => {
        // Clear previous errors
        setUploadError(null);

        if (isRecording) {
            // Stop recording and upload
            const blob = await stopRecording();
            if (blob && socket) {
                setIsUploading(true);
                try {
                    const formData = new FormData();
                    formData.append('file', blob, 'voice-message.webm');
                    formData.append('roomId', roomState?.roomId || '');
                    formData.append('socketId', socket.id || '');

                    const response = await fetch(`${API_URL}/upload/audio`, {
                        method: 'POST',
                        body: formData,
                    });

                    if (response.ok) {
                        const data = await response.json();
                        // Send voice message
                        socket.emit('chat:send', {
                            content: '🎤 Tin nhắn thoại',
                            audioUrl: `${API_URL}${data.audioUrl}`,
                        });
                    } else {
                        const errorText = await response.text();
                        setUploadError('Upload thất bại: ' + errorText);
                        setTimeout(() => setUploadError(null), 3000);
                    }
                } catch (error) {
                    setUploadError('Lỗi upload: ' + (error as Error).message);
                    setTimeout(() => setUploadError(null), 3000);
                } finally {
                    setIsUploading(false);
                }
            }
        } else {
            // Start recording
            try {
                await startRecording();
            } catch {
                setUploadError('Không thể truy cập microphone. Vui lòng cấp quyền.');
                setTimeout(() => setUploadError(null), 3000);
            }
        }
    };

    const unreadCount = messages.length;

    return (
        <div className={`chat-container ${isOpen ? 'open' : ''}`}>
            {/* Error Toast */}
            {uploadError && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
                    <div className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium shadow-lg">
                        {uploadError}
                    </div>
                </div>
            )}
            {/* Floating messages - show when chat is closed */}
            {!isOpen && floatingMessages.length > 0 && (
                <div className="chat-floating-messages">
                    {floatingMessages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`chat-floating-msg ${msg.fadeOut ? 'fade-out' : ''}`}
                        >
                            <span className="chat-floating-name">{msg.playerName}:</span>
                            <span className="chat-floating-content">{msg.content}</span>
                        </div>
                    ))}
                </div>
            )}

            <button
                className="chat-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                💬 Chat
                {!isOpen && unreadCount > 0 && (
                    <span className="chat-badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="chat-panel">
                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <p className="chat-empty">Chưa có tin nhắn</p>
                        ) : (
                            messages.map((msg) => (
                                <ChatMessageItem
                                    key={msg.id}
                                    message={msg}
                                    isOwnMessage={msg.playerId === myPlayerId}
                                />
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-area">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập tin nhắn..."
                            className="chat-input"
                            disabled={isRecording || isUploading}
                        />
                        <button
                            onClick={handleRecordToggle}
                            className={`chat-record-btn ${isRecording ? 'recording' : ''}`}
                            disabled={isUploading}
                            title={isRecording ? 'Dừng ghi âm' : 'Ghi âm'}
                        >
                            {isUploading ? '⏳' : isRecording ? '⏹️' : '🎤'}
                        </button>
                        <button
                            onClick={handleSend}
                            className="chat-send-btn"
                            disabled={!input.trim() || isRecording || isUploading}
                        >
                            Gửi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
