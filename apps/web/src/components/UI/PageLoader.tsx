'use client';

import { useState, useEffect, ReactNode } from 'react';
import { LoadingOverlay } from '@/components/UI/LoadingSpinner';

interface PageLoaderProps {
    children: ReactNode;
    minLoadTime?: number; // Thời gian loading tối thiểu (ms)
}

export function PageLoader({ children, minLoadTime = 1500 }: PageLoaderProps) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Đợi tất cả assets load xong
        const handleLoad = () => {
            // Đảm bảo loading hiển thị ít nhất minLoadTime
            setTimeout(() => {
                setIsLoading(false);
            }, minLoadTime);
        };

        // Kiểm tra nếu document đã load xong
        if (document.readyState === 'complete') {
            handleLoad();
        } else {
            window.addEventListener('load', handleLoad);
            return () => window.removeEventListener('load', handleLoad);
        }
    }, [minLoadTime]);

    if (isLoading) {
        return <LoadingOverlay text="Đang kết nối..." />;
    }

    return <>{children}</>;
}

export default PageLoader;
