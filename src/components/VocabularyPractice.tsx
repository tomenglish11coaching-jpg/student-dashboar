import React, { useState, useMemo, useEffect } from 'react';
import { Play, CheckCircle, XCircle, RefreshCw, Trophy, ArrowRight, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Card } from './Card';

interface VocabItem {
    'Correct Answer': string;
    'Question text': string;
    'Date'?: string;
    [key: string]: any;
}

interface VocabularyPracticeProps {
    vocabList: VocabItem[];
}

interface Question {
    id: number;
    word: string; // The correct answer
    context: string; // The sentence
    options: string[];
}

type TestState = 'idle' | 'testing' | 'results';

export function VocabularyPractice({ vocabList }: VocabularyPracticeProps) {
    const [status, setStatus] = useState<TestState>('idle');
    const [questionCount, setQuestionCount] = useState<number>(10);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [score, setScore] = useState(0);

    // Filter valid vocab (must have answer and context)
    const validVocab = useMemo(() => {
        return vocabList.filter(v =>
            v['Correct Answer'] &&
            v['Correct Answer'].trim() !== '' &&
            v['Question text'] &&
            v['Question text'].trim() !== ''
        );
    }, [vocabList]);

    const canPlay = validVocab.length >= 4; // need at least 4 words for options

    const startTest = (count: number) => {
        const actualCount = Math.min(count, validVocab.length);
        if (actualCount < 4) return;

        // Shuffle and pick target words
        const shuffled = [...validVocab].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, actualCount);

        // Generate questions
        const newQuestions: Question[] = selected.map((item, idx) => {
            const answer = item['Correct Answer'];
            const context = item['Question text'];

            // Generate Distractors
            const otherWords = validVocab
                .filter(v => v['Correct Answer'] !== answer)
                .map(v => v['Correct Answer']);

            const distractors = otherWords
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);

            const options = [...distractors, answer].sort(() => 0.5 - Math.random());

            return {
                id: idx,
                word: answer,
                context: context,
                options
            };
        });

        setQuestions(newQuestions);
        setQuestionCount(actualCount);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setScore(0);
        setStatus('testing');
    };

    const handleAnswer = (option: string) => {
        const currentQ = questions[currentQuestionIndex];
        const isCorrect = option === currentQ.word;

        setUserAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: option
        }));

        if (isCorrect) {
            setScore(prev => prev + 1);
        }

        // Delay slightly for feedback before moving next? 
        // Or just let user click next. Let's auto-advance or show next button.
        // For speed, let's wait 500ms then next.
        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                setStatus('results');
            }
        }, 600);
    };

    const reset = () => {
        setStatus('idle');
        setScore(0);
        setCurrentQuestionIndex(0);
    };

    if (!canPlay) return null;

    return (
        <Card title="Luyện tập từ vựng" className="mb-6 border-blue-500/20 bg-blue-500/5">
            <div className="min-h-[200px] flex flex-col items-center justify-center p-4">
                <AnimatePresence mode="wait">
                    {/* IDLE STATE */}
                    {status === 'idle' && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-center w-full"
                        >
                            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                                <BookOpen size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Check Your Knowledge!</h3>
                            <p className="text-gray-400 mb-6 max-w-md mx-auto">
                                Ôn tập lại {validVocab.length} từ vựng đã học thông qua bài kiểm tra trắc nghiệm nhanh.
                            </p>

                            <div className="flex flex-wrap gap-3 justify-center">
                                {[10, 20, 30].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => startTest(num)}
                                        disabled={validVocab.length < 4}
                                        className="group relative px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="flex items-center gap-2">
                                            <span>{num} Câu</span>
                                            {num > validVocab.length && <span className="text-xs font-normal opacity-70">(Max {validVocab.length})</span>}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* TESTING STATE */}
                    {status === 'testing' && questions[currentQuestionIndex] && (
                        <motion.div
                            key="test"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full max-w-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                    Question {currentQuestionIndex + 1} / {questions.length}
                                </span>
                                <div className="text-sm font-bold text-blue-400">
                                    Score: {score}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-1.5 bg-gray-800 rounded-full mb-8 overflow-hidden">
                                <motion.div
                                    className="h-full bg-blue-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                                />
                            </div>

                            <div className="mb-8">
                                <h4 className="text-xl md:text-2xl font-medium text-white text-center leading-relaxed">
                                    {/* Replace blank if exists, else append blank */}
                                    {questions[currentQuestionIndex].context.includes('___')
                                        ? questions[currentQuestionIndex].context.split('___').map((part, i, arr) => (
                                            <React.Fragment key={i}>
                                                {part}
                                                {i < arr.length - 1 && <span className="inline-block w-16 border-b-2 border-blue-500 mx-1"></span>}
                                            </React.Fragment>
                                        ))
                                        : (
                                            <>
                                                {questions[currentQuestionIndex].context} <span className="inline-block w-16 border-b-2 border-blue-500 mx-1"></span>
                                            </>
                                        )
                                    }
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {questions[currentQuestionIndex].options.map((option, idx) => {
                                    const isSelected = userAnswers[currentQuestionIndex] === option;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => !userAnswers[currentQuestionIndex] && handleAnswer(option)}
                                            disabled={!!userAnswers[currentQuestionIndex]}
                                            className={clsx(
                                                "p-4 rounded-xl text-left font-semibold transition-all border-2",
                                                isSelected
                                                    ? (option === questions[currentQuestionIndex].word
                                                        ? "bg-green-500/20 border-green-500 text-green-500"
                                                        : "bg-red-500/20 border-red-500 text-red-500")
                                                    : "bg-white/5 border-transparent hover:bg-white/10 text-gray-300 hover:text-white",
                                                !!userAnswers[currentQuestionIndex] && option === questions[currentQuestionIndex].word && !isSelected
                                                    ? "bg-green-500/10 border-green-500/50 text-green-400" // Show correct answer if missed
                                                    : ""
                                            )}
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* RESULTS STATE */}
                    {status === 'results' && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full text-center"
                        >
                            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-500">
                                <Trophy size={40} />
                            </div>

                            <h3 className="text-3xl font-bold text-white mb-2">
                                {Math.round((score / questions.length) * 100)}%
                            </h3>
                            <p className="text-gray-400 mb-8">
                                Bạn đã trả lời đúng {score} / {questions.length} câu hỏi.
                            </p>

                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={reset}
                                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
                                >
                                    <ArrowRight className="rotate-180" size={20} />
                                    Back to Menu
                                </button>
                                <button
                                    onClick={() => startTest(questionCount)}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/25"
                                >
                                    <RefreshCw size={20} />
                                    Try Again
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Card>
    );
}
