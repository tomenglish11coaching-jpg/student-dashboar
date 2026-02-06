import React, { useState, useMemo } from 'react';
import { X, Trophy, BookOpen, Crown, ChevronDown, ChevronUp, Gift, Ticket } from 'lucide-react';
import clsx from 'clsx';
import { Card } from './Card';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { VocabularyPractice } from './VocabularyPractice';

interface StudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    vocabData: any[]; // Array of rows from Sheet 2
    summaryData: any[]; // Array of rows from Sheet 1 (filtered for this student)
    rank?: number;
    allStudents?: any[];
}

const COLORS = ['#0075FF', '#2D3748']; // Blue (Submitted), Gray (Not)

const getEmbedUrl = (url: string) => {
    try {
        if (!url) return null;
        if (url.includes('/embed/')) return url;

        let videoId = '';
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split(/[?&]/)[0];
        } else if (url.includes('youtube.com/watch')) {
            const match = url.match(/[?&]v=([^&]+)/);
            if (match) videoId = match[1];
        }

        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch (e) {
        return null;
    }
};

function StudentDetailContent({ isOpen, onClose, student, vocabData, summaryData, rank, allStudents = [] }: StudentModalProps) {
    // Logic moved to wrapper: if (!isOpen || !student) return null;

    // --- Logic: Unique Vocabulary Filter ---
    const uniqueVocabList = useMemo(() => {
        const seen = new Set<string>();
        // Ensure chronological order to count the "first" time a word was learnt
        const sorted = [...vocabData].sort((a, b) => {
            const dA = a['Date'] ? new Date(a['Date']).getTime() : 0;
            const dB = b['Date'] ? new Date(b['Date']).getTime() : 0;
            return dA - dB;
        });

        return sorted.filter(row => {
            if (row['Is Correct']?.toString().trim().toUpperCase() !== 'TRUE') return false;
            const word = row['Correct Answer']?.toString().trim().toLowerCase();
            if (!word || seen.has(word)) return false;
            seen.add(word);
            return true;
        });
    }, [vocabData]);

    // --- Logic: Submission Rates (Pie Charts) ---
    const submissions = {
        hw1: { submitted: 0, total: 0 },
        hw2: { submitted: 0, total: 0 },
        hw3: { submitted: 0, total: 0 },
    };

    summaryData.forEach(row => {
        // Helper to get value by matching key endsWith (to handle trailing spaces)
        const getValue = (keySuffix: string) => {
            const actualKey = Object.keys(row).find(k => k.trim().endsWith(keySuffix));
            return actualKey ? row[actualKey] : null;
        };

        const isNumeric = (val: string | null) => val !== null && val !== '' && !isNaN(Number(val));
        const isSubmittedText = (val: string | null) => val?.trim().toLowerCase() === 'submitted';

        // Grace Period Logic: Ignore unsubmitted items if class was < 2 days ago
        const dateStr = row['Date']?.split('T')[0];
        const rowDate = dateStr ? new Date(dateStr) : null;
        const isRecent = rowDate ? (Date.now() - rowDate.getTime()) < 48 * 60 * 60 * 1000 : false;

        const processHomework = (contentKey: string, submissionVal: string | null, isNumericCheck: boolean, statsKey: 'hw1' | 'hw2' | 'hw3') => {
            const content = getValue(contentKey);
            if (content && content.toString().trim() !== '') {
                const isDone = isNumericCheck ? isNumeric(submissionVal) : isSubmittedText(submissionVal);
                if (isDone) {
                    submissions[statsKey].total++;
                    submissions[statsKey].submitted++;
                } else {
                    // Not done. Only count as assigned (total) if NOT recent.
                    if (!isRecent) {
                        submissions[statsKey].total++;
                    }
                }
            }
        };

        // 1st Homework
        processHomework('Vocab and 1st Homework', getValue('1st Homework Submission'), false, 'hw1');

        // 2nd Homework
        processHomework('2nd Homework', getValue('2nd Homework Submission'), true, 'hw2');

        // 3rd Homework
        processHomework('3rd Homework', getValue('3rd Homework Submission'), true, 'hw3');
    });

    const getPieData = (hwKey: 'hw1' | 'hw2' | 'hw3') => [
        { name: 'Submitted', value: submissions[hwKey].submitted },
        { name: 'Missing', value: submissions[hwKey].total - submissions[hwKey].submitted },
    ];

    // --- Logic: Vocabulary Cumulative Graph ---
    // Group by Date, using the UNIQUE list
    const vocabByDate: Record<string, number> = {};
    uniqueVocabList.forEach(row => {
        const date = row['Date']?.split('T')[0] || 'Unknown'; // Simple YYYY-MM-DD
        vocabByDate[date] = (vocabByDate[date] || 0) + 1;
    });

    const sortedDates = Object.keys(vocabByDate).sort();
    let cumulativeCount = 0;
    const vocabChartData = sortedDates.map(date => {
        cumulativeCount += vocabByDate[date];
        return { date, words: cumulativeCount };
    });

    // --- Logic: Score Trends (HW2 & HW3) ---
    const scoreChartData = summaryData
        .map(row => {
            const getValue = (keyPrefix: string) => {
                const actualKey = Object.keys(row).find(k => k.trim().startsWith(keyPrefix));
                return actualKey ? row[actualKey] : null;
            };
            const hw2 = getValue('2nd Homework Submission');
            const hw3 = getValue('3rd Homework Submission');
            return {
                date: row['Date']?.split('T')[0],
                hw2: parseInt(hw2?.toString() || '0') || 0,
                hw3: parseInt(hw3?.toString() || '0') || 0,
            };
        })
        .filter(row => row.hw2 > 0 || row.hw3 > 0)
        .filter(row => row.hw2 > 0 || row.hw3 > 0)
        .sort((a, b) => a.date.localeCompare(b.date));

    // --- Logic: Ranking History ---
    // Reconstruct rankings for every past date
    const rankingHistoryData = useMemo(() => {
        if (!allStudents || allStudents.length === 0) return [];

        // 1. Collect all relevant dates (from everyone's history)
        const allDates = new Set<string>();
        allStudents.forEach(s => {
            s.summaryData?.forEach((r: any) => { if (r['Date']) allDates.add(r['Date'].split('T')[0]); });
            s.vocabData?.forEach((r: any) => { if (r['Date']) allDates.add(r['Date'].split('T')[0]); });
        });
        const dates = Array.from(allDates).sort();

        // 2. Iterate through time to build history
        return dates.map(date => {
            const dateObj = new Date(date).getTime();

            // Calculate scores for ALL students on this specific date
            const dailyScores = allStudents.map(s => {
                // Filter student's data up to this date
                const validSummary = s.summaryData?.filter((r: any) => r['Date'] && new Date(r['Date']).getTime() <= dateObj) || [];
                const validVocab = s.vocabData?.filter((r: any) => r['Date'] && new Date(r['Date']).getTime() <= dateObj) || [];

                // Re-calculate Metrics
                let quizzesDone = 0;
                let totalAssigned = 0;
                const uniqueWords = new Set();

                // Vocab Score
                validVocab.forEach((r: any) => {
                    if (r['Is Correct']?.toString().toUpperCase() === 'TRUE') {
                        uniqueWords.add(r['Correct Answer']?.toString().toLowerCase());
                    }
                });
                const wordsLearnt = uniqueWords.size;

                // Quiz Score
                validSummary.forEach((r: any) => {
                    const process = (k1: string, k2: string, numeric: boolean) => {
                        const val = r[Object.keys(r).find(k => k.trim().endsWith(k2)) || ''];

                        // Check if assignment exists
                        if (r[Object.keys(r).find(k => k.trim().endsWith(k1)) || '']) {
                            // Helper to check standard Done status
                            const checkIsDone = (v: any) => v && (v.toString().toLowerCase() === 'submitted' || !isNaN(Number(v)));
                            const done = numeric ? !isNaN(Number(val)) : checkIsDone(val);

                            // Grace Period: Calculate relative to this historical date
                            const rowDateStr = r['Date']?.split('T')[0];
                            const rowDateTs = rowDateStr ? new Date(rowDateStr).getTime() : 0;
                            // If the assignment date is within 48 hours of the historical snapshot date
                            const isRecent = (dateObj - rowDateTs) < 172800000; // 48 * 60 * 60 * 1000

                            if (done) {
                                quizzesDone++;
                                totalAssigned++;
                            } else {
                                // Only count as missed if it's NOT recent
                                if (!isRecent) {
                                    totalAssigned++;
                                }
                            }
                        }
                    };
                    process('Vocab and 1st Homework', '1st Homework Submission', false);
                    process('2nd Homework', '2nd Homework Submission', true);
                    process('3rd Homework', '3rd Homework Submission', true);
                });

                // Formula
                const basePoints = quizzesDone + Math.floor(wordsLearnt / 10);
                const rate = totalAssigned > 0 ? quizzesDone / totalAssigned : 0;
                let multiplier = 1.0;
                if (rate >= 1) multiplier = 1.2;
                else if (rate >= 0.9) multiplier = 1.1;

                return { id: s.id, score: basePoints * multiplier };
            });

            // Sort to find rank
            dailyScores.sort((a, b) => b.score - a.score);
            const myRank = dailyScores.findIndex(x => x.id === student.id) + 1;

            return { date, rank: myRank };
        });
    }, [allStudents, student]);

    // --- Logic: Achievement Progress (Beast) ---
    const beastBadge = student.badges?.find((b: any) => b.id === 'beast');
    const currentLevel = beastBadge?.level || 0;
    const nextLevel = currentLevel < 4 ? currentLevel + 1 : 4;

    const thresholds = {
        1: { quizzes: 0, words: 0 },
        2: { quizzes: 20, words: 200 },
        3: { quizzes: 120, words: 1000 },
        4: { quizzes: 400, words: 4000 }
    };

    const currentThreshold = thresholds[currentLevel as keyof typeof thresholds] || { quizzes: 0, words: 0 };
    const nextThreshold = thresholds[nextLevel as keyof typeof thresholds];

    const quizProgress = currentLevel === 4 ? 100 : Math.min(((student.quizzesDone - currentThreshold.quizzes) / (nextThreshold.quizzes - currentThreshold.quizzes)) * 100, 100);
    const wordProgress = currentLevel === 4 ? 100 : Math.min(((student.wordsLearnt - currentThreshold.words) / (nextThreshold.words - currentThreshold.words)) * 100, 100);

    const isBeast = student.quizzesDone / (student.totalAssigned || 1) >= 0.99;

    // --- Logic: Achievement Progress (Mọt sách) ---
    const motSachBadge = student.badges?.find((b: any) => b.id === 'mọt-sách');
    const currentVocabLevel = motSachBadge?.level || 0;
    const nextVocabLevel = currentVocabLevel < 4 ? currentVocabLevel + 1 : 4;

    const vocabThresholds = {
        1: { words: 0 },
        2: { words: 400 },
        3: { words: 1000 },
        4: { words: 3000 },
        5: { words: 10000 } // Level 4 target
    };

    const vocabNextThreshold = currentVocabLevel === 0 ? 400 : currentVocabLevel === 1 ? 1000 : currentVocabLevel === 2 ? 3000 : 10000;
    const vocabPrevThreshold = currentVocabLevel === 0 ? 0 : currentVocabLevel === 1 ? 400 : currentVocabLevel === 2 ? 1000 : 3000;
    const vocabProgress = currentVocabLevel === 4 ? 100 : Math.min(((student.wordsLearnt - vocabPrevThreshold) / (vocabNextThreshold - vocabPrevThreshold)) * 100, 100);

    // --- Logic: Achievement Progress (Học giả ưu tú) ---
    const eliteBadge = student.badges?.find((b: any) => b.id === 'elite-scholar');
    const currentEliteLevel = eliteBadge?.level || 0;
    const nextEliteLevel = currentEliteLevel < 4 ? currentEliteLevel + 1 : 4;

    // Condition: Avg > 95. Progress towards 95 if level 0, then progress towards next level quizzes.

    // Calculate Average Score directly from '2nd Homework Submission' and '3rd Homework Submission'
    let totalScore = 0;
    let scoreCount = 0;

    summaryData.forEach((r: any) => {
        const getValue = (keySuffix: string) => {
            const actualKey = Object.keys(r).find(k => k.trim().endsWith(keySuffix));
            return actualKey ? r[actualKey] : null;
        };
        const isNumeric = (val: string | null) => val !== null && val !== '' && !isNaN(Number(val));

        // Check 2nd Homework Score
        const score2 = getValue('2nd Homework Submission');
        if (isNumeric(score2)) {
            totalScore += Number(score2);
            scoreCount++;
        }

        // Check 3rd Homework Score
        const score3 = getValue('3rd Homework Submission');
        if (isNumeric(score3)) {
            totalScore += Number(score3);
            scoreCount++;
        }
    });

    const currentAvg = scoreCount > 0 ? totalScore / scoreCount : 0;
    const avgProgress = Math.min((currentAvg / 95) * 100, 100);

    const eliteThresholds = {
        1: { quizzes: 0 },
        2: { quizzes: 20 },
        3: { quizzes: 120 },
        4: { quizzes: 400 }
    };
    const eliteNextThreshold = eliteThresholds[nextEliteLevel as keyof typeof eliteThresholds];
    const elitePrevThreshold = eliteThresholds[currentEliteLevel as keyof typeof eliteThresholds] || { quizzes: 0 };
    const eliteQuizProgress = currentEliteLevel === 4 ? 100 : Math.min(((student.quizzesDone - elitePrevThreshold.quizzes) / (eliteNextThreshold.quizzes - elitePrevThreshold.quizzes)) * 100, 100);


    const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
    const [viewedLevel, setViewedLevel] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isDayModalOpen, setIsDayModalOpen] = useState(false);

    // Synchronize viewedLevel when selectedBadge changes
    const actualBadge = useMemo(() => {
        const id = selectedBadgeId || student.badges?.[0]?.id || 'beast';
        const earned = student.badges?.find((b: any) => b.id === id);
        return { id, level: earned?.level || 0 };
    }, [selectedBadgeId, student.badges]);

    // Reset viewedLevel to current level when badge changes
    React.useEffect(() => {
        const current = actualBadge.level > 0 ? actualBadge.level : 1;
        setViewedLevel(current);
    }, [actualBadge.id, actualBadge.level]);

    const achievementData = useMemo(() => {
        const earned = [];
        const locked = [];

        // --- Helpers for Details Rendering ---
        const getBeastDetails = (targetLvl: number) => {
            const targetThreshold = thresholds[targetLvl as keyof typeof thresholds];
            const qp = Math.min((student.quizzesDone / targetThreshold.quizzes) * 100, 100);
            const wp = Math.min((student.wordsLearnt / targetThreshold.words) * 100, 100);

            return (
                <div className="space-y-4">
                    {!isBeast && <p className="text-[10px] text-red-400 italic mb-2">Nộp 100% bài tập để mở khóa huy hiệu này</p>}
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-gray-400 uppercase">Quizzes: {student.quizzesDone}/{targetThreshold.quizzes}</span>
                                <span className="text-white font-bold">{Math.round(qp)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${qp}%` }} className="h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-gray-400 uppercase">Words: {student.wordsLearnt}/{targetThreshold.words}</span>
                                <span className="text-white font-bold">{Math.round(wp)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${wp}%` }} className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const getMotSachDetails = (targetLvl: number) => {
            const targetVal = targetLvl === 1 ? 400 : targetLvl === 2 ? 1000 : targetLvl === 3 ? 3000 : 10000;
            const p = Math.min((student.wordsLearnt / targetVal) * 100, 100);
            return (
                <div>
                    <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-gray-400 uppercase">Vocab: {student.wordsLearnt}/{targetVal}</span>
                        <span className="text-white font-bold">{Math.round(p)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${p}%` }} className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                    </div>
                </div>
            );
        };

        const getEliteDetails = (targetLvl: number) => {
            const targetThreshold = eliteThresholds[targetLvl as keyof typeof eliteThresholds];
            const ap = Math.min((currentAvg / 95) * 100, 100);
            const qp = targetThreshold.quizzes === 0 ? 100 : Math.min((student.quizzesDone / targetThreshold.quizzes) * 100, 100);

            return (
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-gray-400 uppercase">Average Score: {currentAvg.toFixed(1)}%/95%</span>
                            <span className="text-white font-bold">{Math.round(ap)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${ap}%` }} className="h-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                        </div>
                    </div>
                    {targetThreshold.quizzes > 0 && (
                        <div>
                            <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-gray-400 uppercase">Quizzes: {student.quizzesDone}/{targetThreshold.quizzes}</span>
                                <span className="text-white font-bold">{Math.round(qp)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${qp}%` }} className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                            </div>
                        </div>
                    )}
                </div>
            );
        };



        // --- Leveled Badges Core Mapping ---
        const currentPreviewLevel = viewedLevel || 1;

        if (currentLevel > 0 || actualBadge.id === 'beast') {
            earned.push({ id: 'beast', label: 'Beast', color: 'purple', icon: Crown, details: getBeastDetails(currentPreviewLevel) });
        }
        if (currentVocabLevel > 0 || actualBadge.id === 'mọt-sách') {
            earned.push({ id: 'mọt-sách', label: 'Mọt sách', color: 'blue', icon: BookOpen, details: getMotSachDetails(currentPreviewLevel) });
        }
        if (currentEliteLevel > 0 || actualBadge.id === 'elite-scholar') {
            earned.push({ id: 'elite-scholar', label: 'Học giả ưu tú', color: 'yellow', icon: Trophy, details: getEliteDetails(currentPreviewLevel) });
        }

        return {
            earnedBadges: earned
        };
    }, [currentLevel, currentVocabLevel, currentEliteLevel, student, isBeast, viewedLevel, currentAvg, actualBadge.id]);

    const { earnedBadges } = achievementData;

    const allLeveled = earnedBadges;
    const activeBadge = allLeveled.find(b => b.id === actualBadge.id) || earnedBadges[0];

    const alternates = earnedBadges.filter(b => b.id !== activeBadge?.id);

    const ALL_POTENTIAL_BADGES = [
        { id: 'beast', label: 'Beast', icon: Crown, color: 'purple' },
        { id: 'mọt-sách', label: 'Mọt sách', icon: BookOpen, color: 'blue' },
        { id: 'elite-scholar', label: 'Học giả ưu tú', icon: Trophy, color: 'yellow' },
    ];


    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#0F1214] border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl relative shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-[#0F1214]/90 backdrop-blur z-10 p-6 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            {student.avatarUrl ? (
                                <img
                                    src={student.avatarUrl}
                                    alt={student.name}
                                    className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500/50"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div
                                className="w-14 h-14 bg-blue-500/20 rounded-2xl text-blue-500 flex items-center justify-center border-2 border-blue-500/20"
                                style={{ display: student.avatarUrl ? 'none' : 'flex' }}
                            >
                                <Trophy size={28} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-white">
                                    {student['Student names'] || student['Student names '] || student.name}
                                </h2>
                                <div className="flex items-center gap-1">
                                    {ALL_POTENTIAL_BADGES.map((potential) => {
                                        const earned = student.badges?.find((b: any) => b.id === potential.id);
                                        const IconComponent = potential.icon;
                                        const level = earned?.level || 1;
                                        const isLocked = !earned;

                                        const size = 14 + (level - 1) * 4;
                                        const glowIntensity = isLocked ? 0 : (level === 1 ? 5 : level * 10);
                                        const hasSparkles = level >= 3 && !isLocked;
                                        const isLevel4 = level >= 4 && !isLocked;

                                        const colorClass = potential.color === 'purple' ? 'text-purple-500' :
                                            potential.color === 'blue' ? 'text-blue-500' :
                                                potential.color === 'yellow' ? 'text-yellow-500' :
                                                    potential.color === 'orange' ? 'text-orange-500' :
                                                        potential.color === 'green' ? 'text-green-500' : 'text-gray-400';

                                        const shadowHex = potential.color === 'purple' ? '#a855f7' :
                                            potential.color === 'blue' ? '#3b82f6' :
                                                potential.color === 'yellow' ? '#eab308' :
                                                    potential.color === 'orange' ? '#f97316' :
                                                        potential.color === 'green' ? '#22c55e' : '#9ca3af';

                                        return (
                                            <div
                                                key={potential.id}
                                                className="group/header-badge relative cursor-pointer"
                                                onClick={() => setSelectedBadgeId(potential.id)}
                                            >
                                                <motion.div
                                                    className={clsx(
                                                        "p-1.5 rounded-full transition-all relative",
                                                        isLocked ? "bg-white/5 opacity-20 grayscale" : "bg-white/5 hover:bg-white/10",
                                                        !isLocked && colorClass,
                                                        isLevel4 && "animate-pulse"
                                                    )}
                                                    animate={isLevel4 ? { rotate: [0, 5, -5, 0] } : {}}
                                                    transition={isLevel4 ? { repeat: Infinity, duration: 4, ease: "easeInOut" } : {}}
                                                    style={{
                                                        boxShadow: isLocked ? 'none' : `0 0 ${glowIntensity}px ${shadowHex}`
                                                    }}
                                                >
                                                    <IconComponent size={size} />

                                                    {hasSparkles && (
                                                        <div className="absolute inset-0 pointer-events-none">
                                                            {[...Array(level * 2)].map((_, i) => (
                                                                <motion.div
                                                                    key={i}
                                                                    className="absolute w-1 h-1 bg-white rounded-full"
                                                                    initial={{ x: "50%", y: "50%", opacity: 1, scale: 0 }}
                                                                    animate={{
                                                                        x: `${50 + (Math.random() - 0.5) * 150}%`,
                                                                        y: `${50 + (Math.random() - 0.5) * 150}%`,
                                                                        opacity: 0,
                                                                        scale: 1.5
                                                                    }}
                                                                    transition={{ repeat: Infinity, duration: 1 + Math.random(), delay: Math.random() * 2 }}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </motion.div>
                                                <div className="absolute bottom-full left-0 mb-3 px-3 py-1.5 bg-gray-900/95 backdrop-blur text-white text-[11px] font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/header-badge:opacity-100 transition-all pointer-events-none z-[150] shadow-xl border border-white/10">
                                                    {earned ? earned.tooltip : `Locked: ${potential.label}`}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm">Performance Analysis & Progress</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Top Prize Section (Only for Top 3) */}
                    {rank && rank <= 3 && (
                        <div className="col-span-1 lg:col-span-2">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className={clsx(
                                    "relative overflow-hidden rounded-3xl p-6 border",
                                    rank === 1 ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-yellow-500/30" :
                                        rank === 2 ? "bg-gradient-to-br from-slate-400/20 to-slate-600/10 border-slate-400/30" :
                                            "bg-gradient-to-br from-orange-500/20 to-red-500/10 border-orange-500/30"
                                )}
                            >
                                {/* Decorative Background Elements */}
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-white/5 rounded-full blur-2xl" />

                                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className={clsx(
                                            "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg",
                                            rank === 1 ? "bg-yellow-500 text-white" :
                                                rank === 2 ? "bg-slate-400 text-white" :
                                                    "bg-orange-500 text-white"
                                        )}>
                                            <Ticket size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">
                                                Hội Viên Ưu Tú - Quà Tặng Top {rank}
                                            </h3>
                                            <p className="text-gray-400 text-sm max-w-md">
                                                Duy trì vị trí trong <b>Top 3</b> để nhận ưu đãi đặc biệt khi đăng ký khóa học tiếp theo.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center justify-center min-w-[120px]">
                                        <div className="flex items-baseline gap-2">
                                            <span className={clsx(
                                                "text-4xl font-black",
                                                rank === 1 ? "text-yellow-400" :
                                                    rank === 2 ? "text-slate-300" :
                                                        "text-orange-400"
                                            )}>
                                                -{rank === 1 ? "50%" : rank === 2 ? "40%" : "30%"}
                                            </span>
                                        </div>
                                        <div className="bg-white/10 px-3 py-1 rounded-full border border-white/10 mt-2">
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                                                Ưu đãi học thêm
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Conditions Banner */}
                                <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        Áp dụng khi đăng ký khóa học mới bất kỳ
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        Giảm trực tiếp vào gói 10 buổi học thêm
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                        Chỉ dành cho học viên xuất sắc nhất
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Row 1: Achievement & Submissions */}
                    <div className="col-span-1 lg:col-span-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Achievement Section */}
                        <Card className="lg:col-span-1 overflow-visible" title="Huy hiệu">
                            <div className="space-y-6">
                                {/* Current Badges Inventory */}
                                <div className="flex flex-wrap gap-3">
                                    {ALL_POTENTIAL_BADGES.map((potential) => {
                                        const earned = student.badges?.find((b: any) => b.id === potential.id);
                                        const IconComponent = potential.icon;
                                        const level = earned?.level || 1;
                                        const isLocked = !earned;
                                        const iconSize = 24 + (level - 1) * 4; // 24, 28, 32, 36
                                        const glowIntensity = isLocked ? 0 : (level === 1 ? 5 : level * 10);

                                        const colorClass = potential.color === 'purple' ? 'text-purple-500' :
                                            potential.color === 'blue' ? 'text-blue-500' :
                                                potential.color === 'yellow' ? 'text-yellow-500' :
                                                    potential.color === 'orange' ? 'text-orange-500' :
                                                        potential.color === 'green' ? 'text-green-500' : 'text-gray-400';

                                        const shadowHex = potential.color === 'purple' ? '#a855f7' :
                                            potential.color === 'blue' ? '#3b82f6' :
                                                potential.color === 'yellow' ? '#eab308' :
                                                    potential.color === 'orange' ? '#f97316' :
                                                        potential.color === 'green' ? '#22c55e' : '#9ca3af';

                                        const isActive = activeBadge?.id === potential.id;

                                        return (
                                            <div
                                                key={potential.id}
                                                className="group/badge-modal relative cursor-pointer"
                                                onClick={() => setSelectedBadgeId(potential.id)}
                                            >
                                                <motion.div
                                                    className={clsx(
                                                        "p-3 rounded-2xl border transition-all",
                                                        isLocked ? "bg-white/5 border-white/5 opacity-20 grayscale" : "bg-white/5 border-white/10",
                                                        !isLocked && colorClass,
                                                        isActive && "ring-2 ring-offset-2 ring-offset-[#0F1214] border-transparent scale-110",
                                                        isActive && (potential.color === 'purple' ? 'ring-purple-500' :
                                                            potential.color === 'blue' ? 'ring-blue-500' :
                                                                potential.color === 'yellow' ? 'ring-yellow-500' :
                                                                    potential.color === 'orange' ? 'ring-orange-500' :
                                                                        potential.color === 'green' ? 'ring-green-500' : 'ring-white')
                                                    )}
                                                    style={{ boxShadow: isLocked ? 'none' : `0 0 ${glowIntensity}px ${shadowHex}` }}
                                                    whileHover={{ scale: isActive ? 1.1 : 1.05 }}
                                                >
                                                    <IconComponent size={iconSize} />
                                                </motion.div>
                                                <div className="absolute bottom-full left-0 mb-3 px-3 py-1.5 bg-gray-900/95 backdrop-blur text-white text-[11px] font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/badge-modal:opacity-100 transition-all pointer-events-none z-[150] shadow-xl border border-white/10">
                                                    {earned ? earned.tooltip : `Locked Achievement: ${potential.label}`}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Progress Trackers */}
                                <div className="space-y-4">
                                    {activeBadge ? (
                                        <>
                                            {/* Active Selection Details */}
                                            <motion.div
                                                key={`${activeBadge.id}-${viewedLevel}`}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={clsx("p-4 rounded-2xl border", activeBadge.color === 'purple' ? "bg-purple-500/5 border-purple-500/10" : activeBadge.color === 'yellow' ? "bg-yellow-500/5 border-yellow-500/10" : "bg-blue-500/5 border-blue-500/10")}
                                            >
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            {/* Dynamic Visual Icon based on viewedLevel */}
                                                            {(() => {
                                                                const IconComp = activeBadge.icon;
                                                                const level = viewedLevel || 1;
                                                                const size = 20 + (level - 1) * 4;
                                                                const glowIntensity = level === 1 ? 5 : level * 12;
                                                                const hasSparkles = level >= 3;
                                                                const isLvl4 = level >= 4;
                                                                const shadowHex = activeBadge.color === 'purple' ? '#a855f7' : activeBadge.color === 'blue' ? '#3b82f6' : activeBadge.color === 'yellow' ? '#eab308' : '#9ca3af';

                                                                return (
                                                                    <motion.div
                                                                        animate={isLvl4 ? { scale: [1, 1.1, 1] } : {}}
                                                                        transition={isLvl4 ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
                                                                        style={{
                                                                            boxShadow: `0 0 ${glowIntensity}px ${shadowHex}`,
                                                                            border: isLvl4 ? `1px solid ${shadowHex}` : 'none',
                                                                            width: 44, height: 44
                                                                        }}
                                                                        className={clsx(
                                                                            "rounded-xl flex items-center justify-center bg-white/5 relative overflow-visible",
                                                                            activeBadge.color === 'purple' ? "text-purple-500" : activeBadge.color === 'yellow' ? "text-yellow-500" : "text-blue-500"
                                                                        )}
                                                                    >
                                                                        <IconComp size={size} />
                                                                        {hasSparkles && (
                                                                            <div className="absolute inset-0 pointer-events-none">
                                                                                {/* Fairy Dust / Halo Effect - Positioned around the icon */}
                                                                                {[...Array(level * 4)].map((_, i) => {
                                                                                    const angle = (i / (level * 4)) * Math.PI * 2;
                                                                                    // Distribute sparkles in a halo slightly larger than the container
                                                                                    const distance = 120 + Math.random() * 40; // 120-160% from center
                                                                                    const x = 50 + Math.cos(angle) * 35; // ~35px radius
                                                                                    const y = 50 + Math.sin(angle) * 35;

                                                                                    return (
                                                                                        <motion.div
                                                                                            key={i}
                                                                                            className={clsx(
                                                                                                "absolute rounded-full z-10",
                                                                                                activeBadge.color === 'purple' ? "bg-purple-300" : activeBadge.color === 'yellow' ? "bg-yellow-200" : "bg-blue-300"
                                                                                            )}
                                                                                            initial={{ opacity: 0, scale: 0 }}
                                                                                            animate={{
                                                                                                opacity: [0, 1, 0, 0],
                                                                                                scale: [0, 1, 0.5, 0]
                                                                                            }}
                                                                                            transition={{
                                                                                                repeat: Infinity,
                                                                                                duration: 2 + Math.random(),
                                                                                                delay: Math.random() * 2,
                                                                                                ease: "easeInOut"
                                                                                            }}
                                                                                            style={{
                                                                                                top: `${y}%`,
                                                                                                left: `${x}%`,
                                                                                                width: Math.random() * 3 + 2, // 2-5px size
                                                                                                height: Math.random() * 3 + 2,
                                                                                                boxShadow: activeBadge.color === 'purple' ? '0 0 6px 1px rgba(168, 85, 247, 0.8)' :
                                                                                                    activeBadge.color === 'yellow' ? '0 0 6px 1px rgba(234, 179, 8, 0.8)' :
                                                                                                        '0 0 6px 1px rgba(59, 130, 246, 0.8)'
                                                                                            }}
                                                                                        />
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </motion.div>
                                                                );
                                                            })()}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-white">
                                                                {activeBadge.label} Level {viewedLevel}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">
                                                                {viewedLevel! <= actualBadge.level ? 'Already Achieved ✓' : 'Future Achievement'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Level Selector */}
                                                    <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                                                        <button
                                                            disabled={viewedLevel === 1}
                                                            onClick={(e) => { e.stopPropagation(); setViewedLevel(prev => Math.max(1, prev! - 1)); }}
                                                            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 disabled:opacity-20"
                                                        >
                                                            <ChevronDown size={16} className="rotate-90" />
                                                        </button>
                                                        <span className="text-xs font-bold text-white w-4 text-center">{viewedLevel}</span>
                                                        <button
                                                            disabled={viewedLevel === 4}
                                                            onClick={(e) => { e.stopPropagation(); setViewedLevel(prev => Math.min(4, prev! + 1)); }}
                                                            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 disabled:opacity-20"
                                                        >
                                                            <ChevronDown size={16} className="-rotate-90" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {activeBadge.details}

                                                {/* Level 4 Reward Banner */}
                                                <div className="mt-5 p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 flex items-center gap-3 relative overflow-hidden group/reward">
                                                    <div className="absolute inset-0 bg-yellow-500/5 translate-x-[-100%] group-hover/reward:translate-x-[100%] transition-transform duration-1000"></div>
                                                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                                                        <Gift size={18} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wide">Phần thưởng cấp 4</span>
                                                        <span className="text-xs text-gray-300 font-medium">Mỗi huy hiệu cấp 4 sẽ được <span className="text-yellow-400 font-bold">tặng 5 buổi học miễn phí!</span></span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </>

                                    ) : (
                                        <div className="p-8 text-center bg-white/5 rounded-3xl border border-dashed border-gray-700">
                                            <Trophy size={32} className="mx-auto text-gray-600 mb-3" />
                                            <p className="text-gray-400 text-sm">Earn your first Level 1 badge to see achievement progress!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        <Card className="lg:col-span-2 min-h-[300px]" title="Submission Rates">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                                {(['hw1', 'hw2', 'hw3'] as const).map((key, idx) => (
                                    <div key={key} className="flex flex-col items-center">
                                        <h4 className="text-sm font-semibold text-gray-400 mb-2">
                                            {idx === 0 ? '1st Homework' : idx === 1 ? '2nd Homework' : '3rd Homework'}
                                        </h4>
                                        <div className="h-[180px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={getPieData(key)}
                                                        innerRadius={50}
                                                        outerRadius={70}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {getPieData(key).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ backgroundColor: '#111C44', borderRadius: '12px', borderColor: '#2D3748' }} itemStyle={{ color: '#fff' }} />
                                                    <Legend verticalAlign="bottom" height={36} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="text-2xl font-bold text-white mt-[-10px]">
                                            {Math.round((submissions[key].submitted / (submissions[key].total || 1)) * 100)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>




                    {/* Row 2: Charts */}
                    <Card title="Vocabulary Growth (Cumulative)" className="min-h-[350px]">
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={vocabChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
                                    <XAxis dataKey="date" stroke="#A0AEC0" fontSize={12} tickFormatter={(tick) => tick.slice(5)} />
                                    <YAxis stroke="#A0AEC0" fontSize={12} />
                                    <Tooltip contentStyle={{ backgroundColor: '#111C44', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="words"
                                        stroke="#0075FF"
                                        strokeWidth={3}
                                        dot={{ fill: '#0075FF', r: 4 }}
                                        activeDot={(props: any) => {
                                            const { cx, cy, stroke, fill, payload } = props;
                                            return (
                                                <circle
                                                    cx={cx}
                                                    cy={cy}
                                                    r={8}
                                                    fill={fill}
                                                    stroke={stroke}
                                                    className="cursor-pointer hover:scale-125 transition-transform"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (payload && payload.date) {
                                                            setSelectedDate(payload.date);
                                                            setIsDayModalOpen(true);
                                                        }
                                                    }}
                                                />
                                            );
                                        }}
                                    />
                                </LineChart>

                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Daily Vocabulary Modal */}
                    <AnimatePresence>
                        {isDayModalOpen && selectedDate && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                                onClick={() => setIsDayModalOpen(false)}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                    className="bg-[#1A1D24] border border-gray-700 w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1A1D24]">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Vocabulary List</h3>
                                            <p className="text-sm text-blue-400">{selectedDate}</p>
                                        </div>
                                        <button
                                            onClick={() => setIsDayModalOpen(false)}
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="overflow-y-auto p-4 custom-scrollbar">
                                        <div className="space-y-3">
                                            {uniqueVocabList
                                                .filter(item => item['Date']?.startsWith(selectedDate))
                                                .map((item, idx) => (
                                                    <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-bold text-white text-base">{item['Correct Answer']}</span>
                                                            <span className="text-[10px] text-gray-500 bg-black/30 px-2 py-0.5 rounded-full border border-gray-800">
                                                                #{idx + 1}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-400 italic">
                                                            {item['Question text']}
                                                        </p>
                                                    </div>
                                                ))}

                                            {uniqueVocabList.filter(item => item['Date']?.startsWith(selectedDate)).length === 0 && (
                                                <div className="text-center py-8 text-gray-500">
                                                    No vocabulary found for this date.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 border-t border-gray-800 bg-[#1A1D24] text-center">
                                        <p className="text-xs text-gray-500">
                                            Total: <span className="text-white font-bold">{uniqueVocabList.filter(item => item['Date']?.startsWith(selectedDate)).length}</span> words learned
                                        </p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Card title="Score Trends (HW2 vs HW3)" className="min-h-[350px]">
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={scoreChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
                                    <XAxis dataKey="date" stroke="#A0AEC0" fontSize={12} tickFormatter={(tick) => tick.slice(5)} />
                                    <YAxis stroke="#A0AEC0" fontSize={12} />
                                    <Tooltip contentStyle={{ backgroundColor: '#111C44', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                                    <Legend />
                                    <Line type="monotone" name="2nd HW" dataKey="hw2" stroke="#4FD1C5" strokeWidth={3} dot={false} />
                                    <Line type="monotone" name="3rd HW" dataKey="hw3" stroke="#F6AD55" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card title="Ranking History" className="min-h-[350px]">
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={rankingHistoryData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
                                    <XAxis dataKey="date" stroke="#A0AEC0" fontSize={12} tickFormatter={(tick) => tick.slice(5)} />
                                    {/* Reversed Y-Axis for Rank (1 is top) */}
                                    <YAxis stroke="#A0AEC0" fontSize={12} reversed domain={[1, 'dataMax']} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111C44', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(value: any) => [`Rank #${value}`, 'Rank']}
                                        labelFormatter={(label) => `Date: ${label}`}
                                    />
                                    <Line
                                        type="stepAfter"
                                        dataKey="rank"
                                        stroke="#F6E05E"
                                        strokeWidth={3}
                                        dot={{ fill: '#F6E05E', r: 4, strokeWidth: 0 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Video Progress Section */}
                    {student.videoLinks && student.videoLinks.length > 0 && (
                        <Card title="Tiến trình học tập" className="col-span-1 lg:col-span-2">
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {student.videoLinks.map((link: { url: string, label?: string }, idx: number) => {
                                    const embedUrl = getEmbedUrl(link.url);
                                    if (!embedUrl) return null;
                                    return (
                                        <div key={idx} className="flex-shrink-0 w-[300px] bg-[#1A1D24] rounded-xl overflow-hidden shadow-lg border border-gray-800 group">
                                            <div className="relative aspect-video">
                                                <iframe
                                                    src={embedUrl}
                                                    title={link.label || `Video bài học ${idx + 1}`}
                                                    className="w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                            <div className="p-3 bg-white/5">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{link.label || `Video buổi học ${idx + 1}`}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Row 3: Vocabulary List */}
                    <div className="col-span-1 lg:col-span-2">
                        <VocabularyPractice vocabList={uniqueVocabList} />

                        <Card title="Learned Vocabulary">
                            <div className="overflow-x-auto max-h-[300px]">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white/5 text-gray-400 text-xs uppercase sticky top-0 backdrop-blur-md">
                                        <tr>
                                            <th className="p-3 rounded-tl-lg">Date</th>
                                            <th className="p-3">Word/Phrase</th>
                                            <th className="p-3 rounded-tr-lg">Sentence (Context)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-gray-300 divide-y divide-gray-700">
                                        {uniqueVocabList.map((row, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                <td className="p-3">{row.Date?.split('T')[0]}</td>
                                                <td className="p-3 font-semibold text-white">{row['Correct Answer']}</td>
                                                <td className="p-3 text-gray-400 italic">{row['Question text']}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export function StudentDetailModal(props: StudentModalProps) {
    return (
        <AnimatePresence>
            {props.isOpen && props.student && (
                <StudentDetailContent {...props} key="student-modal-content" />
            )}
        </AnimatePresence>
    );
}
