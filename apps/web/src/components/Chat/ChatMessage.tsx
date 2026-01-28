'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@lototet/shared';

interface Props {
    message: ChatMessage;
    isOwnMessage: boolean;
}

export function ChatMessageItem({ message, isOwnMessage }: Props) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState('0:00');
    const audioRef = useRef<HTMLAudioElement>(null);

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (audioRef.current && message.audioUrl) {
            audioRef.current.onloadedmetadata = () => {
                setDuration(formatDuration(audioRef.current!.duration));
            };
            audioRef.current.onended = () => {
                setIsPlaying(false);
            };
        }
    }, [message.audioUrl]);

    const handlePlayPause = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div className={`chat-message ${isOwnMessage ? 'own' : ''}`}>
            <div className="chat-message-header">
                <span className="chat-message-name">{message.playerName}</span>
                <span className="chat-message-time">{formatTime(message.timestamp)}</span>
            </div>
            {message.audioUrl ? (
                <>
                    <audio ref={audioRef} src={message.audioUrl} preload="metadata" />
                    <div className="chat-audio-player">
                        <button
                            className="chat-audio-play-btn"
                            onClick={handlePlayPause}
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                        <div className="chat-audio-waveform">
                            {[...Array(8)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`chat-audio-bar ${!isPlaying ? 'paused' : ''}`}
                                />
                            ))}
                        </div>
                        <span className="chat-audio-duration">{duration}</span>
                    </div>
                </>
            ) : (
                <p className="chat-message-content">{message.content}</p>
            )}
        </div>
    );
}
