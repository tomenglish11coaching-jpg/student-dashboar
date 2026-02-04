import { ReactNode } from 'react';
import Link from 'next/link';
import clsx from 'clsx';

export function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-[#0F1214] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Branding Header */}
                <div className="flex items-center gap-4 py-8 mb-4">
                    <img
                        src="/tom-nash-logo.png"
                        alt="Tom English Logo"
                        className="h-16 w-auto object-contain"
                    />
                    <span className="text-2xl font-bold tracking-tight text-white">Tom English</span>
                </div>

                {/* Main Content */}
                <main className="transition-all duration-200 ease-in-out">
                    {children}
                </main>
            </div>
        </div>
    );
}

function NavItem({ href, icon, children, active }: { href: string; icon: ReactNode; children: ReactNode; active?: boolean }) {
    return (
        <Link href={href} className={clsx(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
            active ? "bg-[#1A1F37] text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"
        )}>
            <div className={clsx("p-2 rounded-lg", active ? "bg-blue-500 shadow-blue-500/50" : "bg-[#1A1F37] group-hover:bg-blue-500/20")}>
                {icon}
            </div>
            <span className="font-medium text-sm">{children}</span>
        </Link>
    );
}
