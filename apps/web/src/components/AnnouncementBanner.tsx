import { useEffect, useState, useRef } from 'react';
import './AnnouncementBanner.css';

interface AnnouncementBannerProps {
    message: string;
    onComplete?: () => void;
}

/**
 * Announcement banner that slides down from top with scrolling marquee text.
 * Auto-hides after text completes one full scroll.
 */
export default function AnnouncementBanner({ message, onComplete }: AnnouncementBannerProps) {
    const [visible, setVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const textRef = useRef<HTMLSpanElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Trigger slide-down animation
        setVisible(true);

        // Small delay to allow DOM to render and get accurate widths
        const startTimer = setTimeout(() => {
            setIsAnimating(true);

            if (textRef.current && containerRef.current) {
                const textWidth = textRef.current.offsetWidth;
                const containerWidth = containerRef.current.offsetWidth;

                // Total distance = container width + text width (right edge to left exit)
                const totalDistance = containerWidth + textWidth;

                // Speed: ~300 pixels per second
                const pixelsPerSecond = 300;
                const duration = Math.max(8, totalDistance / pixelsPerSecond);

                textRef.current.style.animationDuration = `${duration}s`;

                // Hide after animation completes
                const hideTimer = setTimeout(() => {
                    setIsAnimating(false);
                    setVisible(false);
                    setTimeout(() => onComplete?.(), 400);
                }, duration * 1000);

                return () => clearTimeout(hideTimer);
            }
        }, 100);

        return () => clearTimeout(startTimer);
    }, [message, onComplete]);

    return (
        <div className={`announcement-banner ${visible ? 'visible' : ''}`}>
            <div className="announcement-content">
                <span className="announcement-icon">📢</span>
                <div className="marquee-container" ref={containerRef}>
                    <span
                        ref={textRef}
                        className={`marquee-text ${isAnimating ? 'animating' : ''}`}
                    >
                        {message}
                    </span>
                </div>
            </div>
        </div>
    );
}


