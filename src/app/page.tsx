"use client";
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/Card';
import { StudentDetailModal } from '@/components/StudentDetailModal';
import { Trophy, BookOpen, Crown as CrownIcon, Ticket, HelpCircle, Gem } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { convertToDirectImageUrl } from '@/utils/imageUtils';
import { RankedRow } from '@/components/RankedRow';

interface Badge {
  id: string;
  name: string;
  icon: any;
  color: string;
  tooltip: string;
  level?: number;
}

interface Student {
  id: string;
  name: string;
  wordsLearnt: number;
  quizzesDone: number;
  totalAssigned: number;
  rankChange: number;
  summaryData: any[];
  vocabData: any[];
  badges: Badge[];
  hw2Done: number;
  hw2Total: number;
  hw3Done: number;
  hw3Total: number;
  avatarUrl?: string;
  videoLinks?: string[];
  isLoading?: boolean;
  isRainbow?: boolean;
}

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  // ... (keeping existing lines implicit by context, but I need to replace the interface first)
  // Actually, I should split this into two replacements if they are far apart.
  // The interface is at the top. The logic is deeper.
  // I will just do the interface first.

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const selectedStudent = students.find(s => s.id === selectedStudentId) || null;

  const RankingHelp = (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setIsHelpOpen(!isHelpOpen); }}
        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
      >
        <HelpCircle size={20} />
      </button>
      <AnimatePresence>
        {isHelpOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsHelpOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-72 bg-[#1A1D24] border border-gray-700 rounded-xl shadow-2xl p-4 z-50 text-left"
            >
              <h4 className="text-sm font-bold text-white mb-2 pb-2 border-b border-gray-700">
                Cách tính điểm xếp hạng
              </h4>
              <div className="text-xs space-y-3 text-gray-300">
                <div>
                  <p className="font-semibold text-blue-400 mb-1">Công thức tổng quát:</p>
                  <p className="bg-white/5 p-2 rounded border border-white/5 font-mono text-[10px]">
                    (Quiz + Từ Vựng/10) x Hệ Số
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-purple-400 mb-1">Hệ số chuyên cần:</p>
                  <ul className="space-y-1 list-disc pl-4">
                    <li>
                      <span className="text-white">x1.2</span>: Nộp 100% bài tập
                    </li>
                    <li>
                      <span className="text-white">x1.1</span>: Nộp &ge;90% bài tập
                    </li>
                    <li>
                      <span className="text-white">x1.0</span>: Dưới 90%
                    </li>
                  </ul>
                </div>
                <p className="italic text-[10px] text-gray-500 pt-1">
                  *Bài tập vừa giao (trong 48h) chưa nộp sẽ không bị tính là thiếu.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // 1. Fetch Master List immediately
        const masterRes = await fetch(`/api/sheets?type=master&t=${Date.now()}`, { next: { revalidate: 60 } });
        const masterJson = await masterRes.json();
        const roster = masterJson.data || [];

        // Identify active students immediately so we can show skeletons
        const initialStudents: Student[] = roster.map((row: any) => {
          const name = row['Student names'];
          let publishId = row['Publish ID'] || row['Link '];

          // Extract avatar URL
          const allKeys = Object.keys(row);
          const avatarKey = allKeys.find(k => {
            const low = k.toLowerCase().trim();
            return low.includes('avatar') || low.includes('photo') || low.includes('ảnh');
          }) || allKeys.find(k => k.toLowerCase().trim() === 'link' && !row[k]?.includes('2PACX'));

          const rawAvatarUrl = avatarKey ? row[avatarKey] : null;
          const avatarUrl = convertToDirectImageUrl(rawAvatarUrl);

          // Extract Progress Videos
          // Fuzzy match any column with 'video' in the name
          const videoKey = allKeys.find(k => k.toLowerCase().includes('video'));
          const videoStr = videoKey ? row[videoKey] : '';
          // split by comma, then handle url|label format
          const videoLinks = videoStr.split(',').map((item: string) => {
            const parts = item.trim().split('|');
            const url = parts[0]?.trim();
            const label = parts[1]?.trim();
            return { url, label };
          }).filter((v: any) => v.url && v.url.toLowerCase().includes('http'));

          // Cleanup publishId
          if (publishId && publishId.includes('2PACX-')) {
            const match = publishId.match(/2PACX-[a-zA-Z0-9_-]+/);
            if (match) publishId = match[0];
          }

          if (!publishId || !publishId.startsWith('2PACX-')) return null;

          return {
            id: publishId,
            name: name || 'Unnamed Student',
            wordsLearnt: 0,
            quizzesDone: 0,
            totalAssigned: 0,
            rankChange: 0,
            summaryData: [],
            vocabData: [],
            badges: [],
            hw2Done: 0,
            hw2Total: 0,
            hw3Done: 0,
            hw3Total: 0,
            avatarUrl: avatarUrl || undefined,
            videoLinks: videoLinks.length > 0 ? videoLinks : undefined,
            isLoading: true // Mark as loading initially
          };
        }).filter((s: any) => s !== null);

        setStudents(initialStudents);
        setLoading(false); // Stop globally loading to show the UI

        // 2. Progressive Hydration - Fetch details for each student
        // We do this *after* setting the initial list to allow rendering to happen
        initialStudents.forEach(async (skeleton: Student) => {
          try {
            const [summaryRes, vocabRes] = await Promise.all([
              fetch(`/api/sheets?type=summary&sheetId=${skeleton.id}&gid=0`),
              fetch(`/api/sheets?type=vocab&sheetId=${skeleton.id}&sheetName=Sheet2`)
            ]);

            const summaryJson = await summaryRes.json();
            const vocabJson = await vocabRes.json();

            const summary = summaryJson.data || [];
            const vocab = vocabJson.data || [];

            const correctVocab = vocab.filter((r: any) => r['Is Correct']?.toString().trim().toUpperCase() === 'TRUE');
            const uniqueCurrentWords = new Set(correctVocab.map((r: any) => r['Correct Answer']?.toString().trim().toLowerCase()).filter((w: any) => w));
            const wordsLearnt = uniqueCurrentWords.size;

            // --- Calculate Metrics (Logic moved from prev block) ---
            let totalQuizzes = 0;
            let totalAssigned = 0;
            let hw2Done = 0, hw2Total = 0;
            let hw3Done = 0, hw3Total = 0;
            let totalScore = 0;
            let scoreCount = 0;

            summary.forEach((r: any) => {
              const getValue = (suffix: string) => {
                const key = Object.keys(r).find(k => k.trim().endsWith(suffix));
                return key ? r[key]?.toString().trim() : null;
              };

              const isNumeric = (val: string | null) => val !== null && val !== '' && !isNaN(Number(val));
              const isSubmittedText = (val: string | null) => val?.toLowerCase() === 'submitted';

              // Grace Period Logic: Ignore unsubmitted items if class was < 2 days ago
              const dateStr = r['Date']?.split('T')[0];
              const rowDate = dateStr ? new Date(dateStr) : null;
              const isRecent = rowDate ? (Date.now() - rowDate.getTime()) < 48 * 60 * 60 * 1000 : false;

              const processHomework = (contentKey: string, scoreKey: string, isNumericCheck: boolean) => {
                const content = getValue(contentKey);
                if (content && content !== '') {
                  const submissionVal = getValue(scoreKey);
                  const isDone = isNumericCheck ? isNumeric(submissionVal) : isSubmittedText(submissionVal);

                  if (isNumericCheck && isNumeric(submissionVal)) {
                    totalScore += Number(submissionVal);
                    scoreCount++;
                  }

                  if (isDone) {
                    totalQuizzes++;
                    totalAssigned++;
                    return true;
                  } else {
                    if (!isRecent) totalAssigned++;
                    return false;
                  }
                }
                return false;
              };

              processHomework('Vocab and 1st Homework', '1st Homework Submission', false);
              if (processHomework('2nd Homework', '2nd Homework Submission', true)) hw2Done++;
              if (getValue('2nd Homework')) hw2Total++;
              if (processHomework('3rd Homework', '3rd Homework Submission', true)) hw3Done++;
              if (getValue('3rd Homework')) hw3Total++;
            });

            // Calculate Badges immediately for this student
            const studentData = {
              ...skeleton,
              wordsLearnt,
              quizzesDone: totalQuizzes,
              totalAssigned,
              summaryData: summary,
              vocabData: vocab,
              hw2Done, hw2Total, hw3Done, hw3Total,
              isLoading: false
            };

            const badges: Badge[] = [];
            // Beast Badge
            const submissionRate = studentData.totalAssigned > 0 ? studentData.quizzesDone / studentData.totalAssigned : 0;
            if (studentData.totalAssigned > 0 && submissionRate >= 0.99) {
              let level = 1;
              if (studentData.quizzesDone >= 400 && studentData.wordsLearnt >= 4000) level = 4;
              else if (studentData.quizzesDone >= 120 && studentData.wordsLearnt >= 1000) level = 3;
              else if (studentData.quizzesDone >= 20 && studentData.wordsLearnt >= 200) level = 2;
              badges.push({
                id: 'beast',
                name: level > 1 ? `Beast Lvl ${level}` : 'Beast',
                icon: CrownIcon,
                color: 'text-purple-500',
                tooltip: `Quái vật học tập - Level ${level} (100% tỉ lệ nộp bài!)`,
                level
              });
            }
            // Vocab Badge
            let vocabLevel = 0;
            if (studentData.wordsLearnt >= 10000) vocabLevel = 4;
            else if (studentData.wordsLearnt >= 3000) vocabLevel = 3;
            else if (studentData.wordsLearnt >= 1000) vocabLevel = 2;
            else if (studentData.wordsLearnt >= 400) vocabLevel = 1;
            if (vocabLevel > 0) {
              badges.push({
                id: 'mọt-sách',
                name: vocabLevel > 1 ? `Mọt sách Lvl ${vocabLevel}` : 'Mọt sách',
                icon: BookOpen,
                color: 'text-blue-500',
                tooltip: `Mọt sách từ vựng - Level ${vocabLevel} (${studentData.wordsLearnt} từ đã học!)`,
                level: vocabLevel
              });
            }
            // 3. Học giả ưu tú System
            // (Average score already calculated in the consolidated loop above)

            const advancedAvg = scoreCount > 0 ? totalScore / scoreCount : 0;
            let eliteLevel = 0;
            if (advancedAvg >= 95) {
              if (studentData.quizzesDone >= 400) eliteLevel = 4;
              else if (studentData.quizzesDone >= 120) eliteLevel = 3;
              else if (studentData.quizzesDone >= 20) eliteLevel = 2;
              else eliteLevel = 1;
            }

            if (eliteLevel > 0) {
              badges.push({
                id: 'elite-scholar',
                name: eliteLevel > 1 ? `Học giả Lvl ${eliteLevel}` : 'Học giả ưu tú',
                icon: Trophy,
                color: 'text-yellow-500',
                tooltip: `Học giả ưu tú - Level ${eliteLevel} (Điểm TB: ${advancedAvg.toFixed(1)}%)`,
                level: eliteLevel
              });
            }

            // --- Special Logic for "Loan" ---
            let isRainbow = false;
            // Normalize name to check
            const normName = skeleton.name.toLowerCase();
            if (normName.includes('loan') || normName.includes('bùi thị phương loan')) {
              isRainbow = true;
              badges.push({
                id: 'veteran',
                name: 'Học viên kỳ cựu',
                icon: Gem,
                color: 'text-pink-500',
                tooltip: 'Học viên kỳ cựu!',
                level: 5 // Special level
              });
            }

            studentData.badges = badges;
            studentData.isRainbow = isRainbow;

            // Update State Incrementally
            setStudents(prev => {
              const updated = prev.map(p => p.id === skeleton.id ? studentData : p);

              // New Ranking Algorithm
              const sorted = updated.sort((a, b) => {
                const calculateScore = (s: Student) => {
                  // 1. Base Points
                  const quizPoints = s.quizzesDone;
                  const vocabPoints = Math.floor(s.wordsLearnt / 10);
                  const basePoints = quizPoints + vocabPoints;

                  // 2. Submission Rate Multiplier
                  const rate = s.totalAssigned > 0 ? s.quizzesDone / s.totalAssigned : 0;
                  let multiplier = 1.0;
                  if (rate >= 1) multiplier = 1.2;
                  else if (rate >= 0.9) multiplier = 1.1;

                  // 3. Final Score
                  return basePoints * multiplier;
                };

                const scoreA = calculateScore(a);
                const scoreB = calculateScore(b);

                // Sort Descending
                return scoreB - scoreA;
              });

              // --- Historical Ranking Logic (7 Days Ago) ---
              const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

              const historyScores = sorted.map(s => {
                // Filter data for history
                const validSummary = s.summaryData?.filter((r: any) => r['Date'] && new Date(r['Date']).getTime() <= oneWeekAgo) || [];
                const validVocab = s.vocabData?.filter((r: any) => r['Date'] && new Date(r['Date']).getTime() <= oneWeekAgo) || [];

                // Re-calculate Metrics for history
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

                // Quiz Score & Submission Rate
                validSummary.forEach((r: any) => {
                  const process = (k1: string, k2: string, numeric: boolean) => {
                    const val = r[Object.keys(r).find(k => k.trim().endsWith(k2)) || ''];
                    // Check if assignment exists
                    if (r[Object.keys(r).find(k => k.trim().endsWith(k1)) || '']) {
                      const checkIsDone = (v: any) => v && (v.toString().toLowerCase() === 'submitted' || !isNaN(Number(v)));
                      const done = numeric ? !isNaN(Number(val)) : checkIsDone(val);

                      // Grace Period Logic (Relative to History Date)
                      // If assignment is NOT done, but was assigned within 48hrs of the target history date, ignore it.
                      const rowDateStr = r['Date']?.split('T')[0];
                      const rowDateTs = rowDateStr ? new Date(rowDateStr).getTime() : 0;
                      const isRecent = (oneWeekAgo - rowDateTs) < 172800000;

                      if (done) {
                        quizzesDone++;
                        totalAssigned++;
                      } else {
                        if (!isRecent) totalAssigned++;
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

              // Sort historical scores to find ranks
              historyScores.sort((a, b) => b.score - a.score);

              // Assign rank changes
              return sorted.map((s, currentIdx) => {
                const currentRank = currentIdx + 1;
                const historyIndex = historyScores.findIndex(h => h.id === s.id);
                // If historyIndex is -1 (new student not present then), assume they were last or treat as 0 change? 
                // Let's treat as rank = totalStudents + 1 for now, or just 0 change if no data.
                // Better: If no history data, change is 0.

                let change = 0;
                if (historyIndex !== -1) {
                  const historyRank = historyIndex + 1;
                  change = historyRank - currentRank; // Positive = Improved (e.g. 5 - 2 = 3)
                }

                return { ...s, rankChange: change };
              });
            });

          } catch (err) {
            console.error(`Failed to load details for ${skeleton.name}`);
          }
        });

      } catch (err) {
        console.error("Failed to load dashboard", err);
      }
    }
    fetchData();
  }, []);

  if (loading) return (
    <DashboardLayout>
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    </DashboardLayout>
  );

  const top3 = students.slice(0, 3);
  const others = students.slice(3);

  return (
    <DashboardLayout>
      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {top3.map((student, idx) => (
          <div key={student.id} onClick={() => setSelectedStudentId(student.id)} className="cursor-pointer relative group">
            {/* Rank Glow Effect */}
            <div className={clsx(
              "absolute inset-0 rounded-2xl transition-opacity opacity-50 group-hover:opacity-100",
              idx === 0 ? "glow-gold" : idx === 1 ? "glow-silver" : "glow-bronze"
            )}></div>

            <Card className={clsx(
              "transform hover:-translate-y-1 transition-all duration-300 light-sweep-container premium-glass border-opacity-30",
              idx === 0 ? "border-yellow-500" :
                idx === 1 ? "border-slate-400" :
                  "border-orange-500"
            )}>
              {/* Prize Voucher Badge */}
              <div className="absolute top-3 right-3 z-20">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={clsx(
                    "flex flex-col items-center justify-center px-2 py-1.5 rounded-xl shadow-2xl border border-white/20 backdrop-blur-md",
                    idx === 0 ? "bg-gradient-to-br from-yellow-400/90 to-orange-500/90" :
                      idx === 1 ? "bg-gradient-to-br from-slate-300/90 to-slate-500/90" :
                        "bg-gradient-to-br from-orange-400/90 to-red-500/90"
                  )}
                >
                  <div className="flex items-center gap-1 text-[8px] font-black text-white uppercase tracking-wider opacity-90 mb-0.5">
                    <Ticket size={10} fill="currentColor" fillOpacity={0.4} />
                    Phần thưởng
                  </div>
                  <div className="text-lg font-black text-white leading-none flex items-baseline gap-0.5">
                    {idx === 0 ? '50' : idx === 1 ? '40' : '30'}
                    <span className="text-xs opacity-70">%</span>
                  </div>
                </motion.div>
              </div>

              {/* Animation Sweep with Rank-Specific Colors */}
              <div className={clsx("light-sweep",
                idx === 0 ? "sweep-gold" : idx === 1 ? "sweep-silver" : "sweep-bronze"
              )}></div>

              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={clsx("p-0.5 rounded-2xl overflow-hidden border-2",
                  idx === 0 ? "border-yellow-400" :
                    idx === 1 ? "border-gray-300" :
                      "border-orange-400"
                )}>
                  {student.avatarUrl ? (
                    <img
                      src={student.avatarUrl}
                      alt={student.name}
                      className="w-12 h-12 rounded-xl object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={clsx("w-12 h-12 rounded-xl flex items-center justify-center",
                      idx === 0 ? "bg-gradient-to-br from-yellow-400 to-orange-500" :
                        idx === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500" :
                          "bg-gradient-to-br from-orange-400 to-red-500"
                    )}
                    style={{ display: student.avatarUrl ? 'none' : 'flex' }}
                  >
                    <Trophy size={20} className="text-white" />
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1 relative z-10">{student.name}</h3>
              <p className="text-gray-400 text-sm mb-4 relative z-10">Rank #{idx + 1}</p>

              <div className="flex justify-between items-center text-sm relative z-10">
                <div>
                  <span className="block text-gray-500 text-xs uppercase">Quizzes</span>
                  <span className="font-bold text-white text-lg">{student.quizzesDone}</span>
                </div>
                <div className="text-right">
                  <span className="block text-gray-500 text-xs uppercase">Words</span>
                  <span className="font-bold text-white text-lg">{student.wordsLearnt}</span>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Leaderboard Table */}
      <Card title="Student Leaderboard" action={RankingHelp} className="min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead className="text-gray-400 text-xs uppercase font-semibold">
              <tr>
                <th className="p-4">Rank</th>
                <th className="p-4">Tên</th>
                <th className="p-4 text-center">Quiz đã nộp</th>
                <th className="p-4 text-center">Từ học được</th>
                <th className="p-4 text-center">Tỉ lệ nộp</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {students.map((student, idx) => (
                <RankedRow
                  key={student.id}
                  student={student}
                  idx={idx}
                  isSelected={selectedStudentId === student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card >

      <StudentDetailModal
        isOpen={!!selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        student={selectedStudent}
        vocabData={selectedStudent?.vocabData || []}
        summaryData={selectedStudent?.summaryData || []}
        rank={students.findIndex(s => s.id === selectedStudentId) + 1}
        allStudents={students}
      />
    </DashboardLayout >
  );
}
