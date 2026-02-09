'use client';

import { ReactNode } from 'react';
import { PageLoader } from '@/components/UI/PageLoader';

interface ClientLayoutProps {
    children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
    return (
        <PageLoader>
            {children}
        </PageLoader>
    );
}

export default ClientLayout;
