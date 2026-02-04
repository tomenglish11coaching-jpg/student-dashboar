import clsx from 'clsx';
import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    title?: string;
    action?: ReactNode;
}

export function Card({ children, className, title, action }: CardProps) {
    return (
        <div className={clsx("glass-card p-5 relative flex flex-col", className)}>
            {/* Background Gradient Mesh (Optional subtle effect) */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>

            {(title || action) && (
                <div className="flex justify-between items-center mb-4 z-20">
                    {title && <h3 className="text-white font-bold text-lg">{title}</h3>}
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
}
