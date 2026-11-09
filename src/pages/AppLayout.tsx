// ARCHITECT: Основной layout приложения с сайдбаром

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';

export function AppLayout() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen bg-black text-[#f0f0f5]">
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            <main
                className={cn(
                    'min-h-screen flex-1 transition-all duration-300',
                    isSidebarCollapsed ? 'ml-[72px]' : 'ml-[280px]'
                )}
            >
                <Outlet />
            </main>
        </div>
    );
}