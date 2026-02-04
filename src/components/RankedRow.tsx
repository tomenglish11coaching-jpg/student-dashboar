"use client";
import React from 'react';
import { Trophy, Crown, MoreHorizontal, HelpCircle, Ticket, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface RankedRowProps {
    student: any;
    idx: number;
    isSelected?: boolean;
    onClick?: () => void;
}

export function RankedRow({ student, idx, isSelected, onClick }: RankedRowProps) {
    const isRank1 = idx === 0;
    const isRank2 = idx === 1;
    const isRank3 = idx === 2;
    const isTop3 = isRank1 || isRank2 || isRank3;

    const rankColor = isRank1 ? "text-yellow-500" : isRank2 ? "text-gray-400" : isRank3 ? "text-orange-500" : "text-gray-500";
    const glowClass = isRank1 ? "glow-gold" : isRank2 ? "glow-silver" : isRank3 ? "glow-bronze" : "";
    const borderClass = isRank1 ? "border-gold-metallic" : isRank2 ? "border-slate-400/30" : isRank3 ? "border-orange-500/30" : "border-gray-800";

    // Particles for Rank 1 & 2 - Positioned further out around the circle
    const sparkles = Array.from({ length: idx === 0 ? 12 : 6 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 55 + Math.random() * 20; // 55-75% distance from center
        const x = 50 + Math.cos(angle) * distance;
        const y = 50 + Math.sin(angle) * distance;
        return {
            id: i,
            top: `${y}%`,
            left: `${x}%`,
            delay: Math.random() * 2,
            size: Math.random() * 2 + 1.5
        };
    });

    return (
        <motion.tr
            initial={false}
            onClick={onClick}
            whileHover={{ scale: 1.005, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
            className={clsx(
                "transition-all duration-300 cursor-pointer group relative",
                isRank1 ? "bg-[#0a0e1a] my-2 shadow-2xl" :
                    isRank2 ? "bg-[#0f121a] my-1 shadow-xl" :
                        isRank3 ? "bg-[#141210] my-1 shadow-lg" : "border-b border-gray-800",
                isSelected && "bg-blue-500/10"
            )}
            style={isTop3 ? {
                borderRadius: '12px 12px 0 0',
                display: 'table-row',
                borderTop: isRank1 ? '0.5px solid rgba(255, 215, 0, 0.3)' :
                    isRank2 ? '0.5px solid rgba(148, 163, 184, 0.3)' :
                        '0.5px solid rgba(234, 88, 12, 0.3)',
                borderLeft: isRank1 ? '0.5px solid rgba(255, 215, 0, 0.3)' :
                    isRank2 ? '0.5px solid rgba(148, 163, 184, 0.3)' :
                        '0.5px solid rgba(234, 88, 12, 0.3)',
            } : {}}
        >
            <td className="p-4 relative">
                {isTop3 && (
                    <motion.div
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                        className={clsx("absolute inset-0 blur-xl pointer-events-none",
                            isRank1 ? "bg-yellow-500/5" : isRank2 ? "bg-slate-400/5" : "bg-orange-500/5"
                        )}
                    />
                )}
                <div className="flex items-center gap-3 relative z-10">
                    <span className={clsx("font-bold w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300",
                        isRank1 ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30" :
                            isRank2 ? "bg-gray-400/20 text-gray-400 border border-gray-400/30" :
                                isRank3 ? "bg-orange-500/20 text-orange-500 border border-orange-500/30" :
                                    "text-gray-500"
                    )}>
                        #{idx + 1}
                    </span>

                    {/* Rank Change Indicator */}
                    {student.rankChange !== 0 && (
                        <div className="flex flex-col items-center justify-center">
                            {student.rankChange > 0 ? (
                                <div className="flex items-center gap-0.5 text-green-500 text-[10px] font-bold">
                                    <ArrowUp size={12} strokeWidth={3} />
                                    <span>{student.rankChange}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-0.5 text-red-500 text-[10px] font-bold">
                                    <ArrowDown size={12} strokeWidth={3} />
                                    <span>{Math.abs(student.rankChange)}</span>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </td>

            <td className="p-4">
                <div className="flex items-center gap-4 relative">
                    {/* Avatar Container */}
                    <div className="relative">
                        {isRank1 && (
                            <motion.div
                                className="absolute -top-6 -left-3 z-20 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]"
                                animate={{ y: [0, -4, 0], x: [0, -2, 0] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                            >
                                <Crown size={24} fill="currentColor" className="rotate-[-15deg]" />
                            </motion.div>
                        )}

                        {/* Sparkles for Rank 1 & 2 */}
                        {(isRank1 || isRank2) && sparkles.map((p) => (
                            <div
                                key={p.id}
                                className={clsx("absolute rounded-full animate-sparkle pointer-events-none z-30",
                                    isRank1 ? "bg-yellow-400" : "bg-slate-300"
                                )}
                                style={{
                                    top: p.top,
                                    left: p.left,
                                    width: p.size,
                                    height: p.size,
                                    animationDelay: `${p.delay}s`,
                                    boxShadow: isRank1 ? '0 0 10px 2px rgba(255, 215, 0, 0.8), 0 0 4px rgba(255, 255, 255, 0.9)' :
                                        '0 0 14px 4px rgba(226, 232, 240, 0.9), 0 0 6px rgba(255, 255, 255, 0.9)'
                                }}
                            />
                        ))}

                        {/* Avatar Image */}
                        <div className={clsx(
                            "w-12 h-12 rounded-full relative z-10 p-[2px] transition-all duration-500",
                            student.isRainbow ? "rainbow-frame" : (
                                isRank1 ? "bg-gradient-to-tr from-yellow-600 via-yellow-200 to-yellow-600 shadow-[0_0_20px_rgba(255,215,0,0.6)] animate-breathe" :
                                    isRank2 ? "bg-gradient-to-tr from-slate-500 via-slate-100 to-slate-500 shadow-[0_0_25px_rgba(226,232,240,0.7)]" :
                                        isRank3 ? "bg-gradient-to-tr from-orange-600 via-orange-200 to-orange-600 shadow-[0_0_20px_rgba(249,115,22,0.6)]" : "bg-gray-700"
                            )
                        )}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 flex items-center justify-center">
                                {student.avatarUrl ? (
                                    <img
                                        src={student.avatarUrl}
                                        alt={student.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                            if (fallback) fallback.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div
                                    className="w-full h-full flex items-center justify-center text-white font-bold text-lg"
                                    style={{ display: student.avatarUrl ? 'none' : 'flex' }}
                                >
                                    {student.name[0]}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className={clsx("font-bold text-base transition-colors",
                                student.isRainbow ? "rainbow-text" : (isRank1 ? "text-white" : "text-gray-200")
                            )}>
                                {student.name}
                            </span>
                            {student.isLoading ? (
                                <div className="h-6 w-24 bg-white/10 animate-pulse rounded-md" />
                            ) : (
                                <div className="flex items-center gap-1">
                                    {student.badges?.map((badge: any) => {
                                        const IconComponent = badge.icon;
                                        const level = badge.level || 1;

                                        // Visual settings based on level
                                        const size = badge.id === 'veteran' ? 14 : 12 + (level - 1) * 4;
                                        const glowIntensity = level === 1 ? 5 : level * 10; // Stronger glow
                                        const hasSparkles = level >= 3;
                                        const isLevel4 = level >= 4;

                                        const shadowColor = badge.color.includes('purple') ? '#a855f7' :
                                            badge.color.includes('blue') ? '#3b82f6' :
                                                badge.color.includes('yellow') ? '#eab308' :
                                                    badge.color.includes('orange') ? '#f97316' :
                                                        badge.color.includes('green') ? '#22c55e' : '#9ca3af';

                                        return (
                                            <div key={badge.id} className="group/badge relative">
                                                <motion.div
                                                    className={clsx(
                                                        "p-1 rounded-full bg-white/5 hover:bg-white/10 transition-all cursor-help relative",
                                                        badge.color,
                                                        isLevel4 && "animate-pulse"
                                                    )}
                                                    animate={isLevel4 ? { rotate: [0, 5, -5, 0] } : {}}
                                                    transition={isLevel4 ? { repeat: Infinity, duration: 4, ease: "easeInOut" } : {}}
                                                    style={{
                                                        boxShadow: `0 0 ${glowIntensity}px ${shadowColor}`,
                                                        // Removed drop-shadow filter to avoid double shadowing artifact
                                                    }}
                                                >
                                                    <IconComponent size={size} />

                                                    {/* Sparkles for Level 3+ */}
                                                    {hasSparkles && (
                                                        <div className="absolute inset-0 pointer-events-none">
                                                            {[...Array(level * 2)].map((_, i) => (
                                                                <motion.div
                                                                    key={i}
                                                                    className="absolute w-0.5 h-0.5 bg-white rounded-full"
                                                                    initial={{
                                                                        x: "50%",
                                                                        y: "50%",
                                                                        opacity: 1,
                                                                        scale: 0
                                                                    }}
                                                                    animate={{
                                                                        x: `${50 + (Math.random() - 0.5) * 150}%`,
                                                                        y: `${50 + (Math.random() - 0.5) * 150}%`,
                                                                        opacity: 0,
                                                                        scale: 1.5
                                                                    }}
                                                                    transition={{
                                                                        repeat: Infinity,
                                                                        duration: 1 + Math.random(),
                                                                        delay: Math.random() * 2
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </motion.div>
                                                <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-gray-900/95 backdrop-blur text-white text-[10px] font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/badge:opacity-100 transition-all pointer-events-none z-[100] shadow-xl border border-white/10">
                                                    {badge.tooltip}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {/* Voucher Badge for Top 3 */}
                                    {isTop3 && (
                                        <div className="group/badge relative">
                                            <div className={clsx(
                                                "p-1 rounded-full bg-white/5 hover:bg-white/10 transition-all cursor-help relative",
                                                isRank1 ? "text-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" :
                                                    isRank2 ? "text-gray-400 shadow-[0_0_8px_rgba(156,163,175,0.5)]" :
                                                        "text-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                                            )}>
                                                <Ticket size={12 + (3 - idx) * 2} />
                                            </div>
                                            <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-gray-900/95 backdrop-blur text-white text-[10px] font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/badge:opacity-100 transition-all pointer-events-none z-[100] shadow-xl border border-white/10">
                                                Phần thưởng Top {idx + 1}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {isRank1 && !student.isLoading && <span className="text-[10px] text-yellow-500/80 font-bold uppercase tracking-wider">Lesson Champion</span>}
                        {isRank2 && !student.isLoading && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Exceptional Student</span>}
                        {isRank3 && !student.isLoading && <span className="text-[10px] text-orange-500/80 font-bold uppercase tracking-wider">Rising Star</span>}
                    </div>
                </div>
            </td>

            <td className="p-4 text-center">
                {student.isLoading ? (
                    <div className="h-6 w-12 bg-white/10 animate-pulse rounded mx-auto" />
                ) : (
                    <span className={clsx("font-bold text-lg transition-colors",
                        isRank1 ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]" : "text-gray-300"
                    )}>
                        {student.quizzesDone}
                    </span>
                )}
            </td>

            <td className="p-4 text-center">
                {student.isLoading ? (
                    <div className="h-6 w-12 bg-white/10 animate-pulse rounded mx-auto" />
                ) : (
                    <span className={clsx("font-bold text-lg",
                        isRank1 ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]" : "text-blue-400"
                    )}>
                        {student.wordsLearnt}
                    </span>
                )}
            </td>

            <td className="p-4 text-center">
                {student.isLoading ? (
                    <div className="flex flex-col items-center gap-1">
                        <div className="h-2 w-24 bg-white/10 animate-pulse rounded-full" />
                        <div className="h-3 w-16 bg-white/10 animate-pulse rounded" />
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((student.totalAssigned > 0 ? student.quizzesDone / student.totalAssigned : 0) * 100, 100)}%` }}
                                className={clsx("h-full", isRank1 ? "bg-yellow-500" : "bg-blue-500")}
                            />
                        </div>
                        <span className="text-[10px] text-gray-500 font-medium">
                            {student.totalAssigned > 0 ? Math.round((student.quizzesDone / student.totalAssigned) * 100) : 0}% Submissions
                        </span>
                    </div>
                )}
            </td>

            <td className="p-4 text-right">
                <button className="p-2 hover:bg-white/10 rounded-lg text-gray-500 transition-colors">
                    <MoreHorizontal size={16} />
                </button>
            </td>
        </motion.tr>
    );
}
