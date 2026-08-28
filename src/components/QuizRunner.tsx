"use client";

import React, { useState } from "react";
import { Quiz, Question, BadgeDefinition } from "@/types/content";
import { useAuth } from "@/lib/auth-context";
import { evaluateBadges } from "@/lib/gamification";
import confetti from "canvas-confetti";
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Trophy,
  RotateCcw,
  ArrowRight,
  Award,
} from "lucide-react";

interface QuizRunnerProps {
  quiz: Quiz;
  topicId: string;
  trackId: string;
  allBadges: BadgeDefinition[];
  allTrackTopicsCount: Record<string, number>;
  totalTopicsCount: number;
  totalTracksCount: number;
  onNextTopic?: () => void;
  nextTopicTitle?: string | null;
}

export function QuizRunner({
  quiz,
  topicId,
  trackId,
  allBadges,
  allTrackTopicsCount,
  totalTopicsCount,
  totalTracksCount,
  onNextTopic,
  nextTopicTitle,
}: QuizRunnerProps) {
  const {
    progress,
    stats,
    badges,
    updateTopicProgress,
    saveEarnedBadges,
    recordStudyActivity,
  } = useAuth();

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState<string[]>([]);
  const [gainedXp, setGainedXp] = useState<number>(0);

  const existingProgress = progress[topicId];
  const isAlreadyPassed = existingProgress?.quiz_passed;

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (submitted) return; // Locked after submit until retry
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleGradeQuiz = async () => {
    let correctCount = 0;
    quiz.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.answer) {
        correctCount++;
      }
    });

    const scoreRatio = correctCount / quiz.questions.length;
    const isPassed = scoreRatio >= quiz.passThreshold;
    const isPerfect = correctCount === quiz.questions.length;

    setSubmitted(true);

    if (isPassed) {
      // Fire confetti animation
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore if not supported
      }

      // Calculate XP gains according to rules:
      // topicComplete: 15 XP, quizPass: 20 XP, quizPerfectBonus: 10 XP
      let xpToAdd = 0;
      const isFirstPass = !existingProgress?.quiz_passed;

      if (isFirstPass) {
        xpToAdd += 20; // quizPass
        xpToAdd += 15; // topicComplete
        if (isPerfect) {
          xpToAdd += 10; // quizPerfectBonus
        }
      }

      setGainedXp(xpToAdd);

      // Save progress to Supabase / LocalStorage
      await updateTopicProgress(
        topicId,
        "completed",
        true,
        scoreRatio
      );

      if (xpToAdd > 0) {
        await recordStudyActivity(xpToAdd);
      }

      // Check newly unlocked badges
      const simulatedProgress = {
        ...progress,
        [topicId]: {
          user_id: stats.user_id,
          topic_id: topicId,
          status: "completed" as const,
          quiz_passed: true,
          quiz_score: existingProgress?.quiz_score ?? scoreRatio,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      const simulatedStats = {
        ...stats,
        xp: stats.xp + xpToAdd,
      };

      const newBadgeIds = evaluateBadges({
        stats: simulatedStats,
        progress: simulatedProgress,
        existingBadges: badges,
        allBadges,
        allTrackTopicsCount,
        totalTopicsCount,
        totalTracksCount,
      });

      if (newBadgeIds.length > 0) {
        setNewlyEarnedBadges(newBadgeIds);
        await saveEarnedBadges(newBadgeIds);
      }
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setNewlyEarnedBadges([]);
    setGainedXp(0);
  };

  const allAnswered = quiz.questions.every(
    (q) => selectedAnswers[q.id] !== undefined
  );

  const correctCount = quiz.questions.filter(
    (q) => selectedAnswers[q.id] === q.answer
  ).length;
  const scoreRatio = correctCount / quiz.questions.length;
  const isPassed = scoreRatio >= quiz.passThreshold;

  return (
    <div className="space-y-8 w-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            복습 퀴즈
          </h3>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          통과 기준: {Math.round(quiz.passThreshold * 100)}% 이상
        </div>
      </div>

      {/* Sequential Questions List (SPEC 3.3: In exact file order) */}
      <div className="space-y-6">
        {quiz.questions.map((q, idx) => {
          const selected = selectedAnswers[q.id];
          const isCorrect = selected === q.answer;

          return (
            <div
              key={q.id}
              className={`p-5 sm:p-6 rounded-2xl border transition-all w-full ${
                submitted
                  ? isCorrect
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                    : "bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800"
                  : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800/80 shadow-none"
              }`}
            >
              {/* Question title */}
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  Q{idx + 1}
                </span>
                <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white whitespace-pre-line leading-relaxed flex-1">
                  {q.q}
                </div>
              </div>

              {/* 4-Choice Options (Full width) */}
              <div className="space-y-2.5 w-full">
                {q.options.map((option, optIdx) => {
                  const isThisSelected = selected === optIdx;
                  const isThisAnswer = q.answer === optIdx;

                  let optionStyle =
                    "border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/60";

                  if (submitted) {
                    if (isThisAnswer) {
                      optionStyle =
                        "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-medium";
                    } else if (isThisSelected && !isCorrect) {
                      optionStyle =
                        "border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200";
                    } else {
                      optionStyle =
                        "border-slate-200 dark:border-slate-800 opacity-60";
                    }
                  } else if (isThisSelected) {
                    optionStyle =
                      "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20";
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={submitted}
                      onClick={() => handleSelectOption(q.id, optIdx)}
                      className={`w-full text-left p-3.5 rounded-lg border text-xs sm:text-sm flex items-center justify-between transition-all ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border ${
                            isThisSelected
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 dark:border-slate-600 text-slate-500"
                          }`}
                        >
                          {optIdx + 1}
                        </span>
                        <span className="font-mono">{option}</span>
                      </div>

                      {submitted && isThisAnswer && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {submitted && isThisSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation after submission */}
              {submitted && (
                <div className="mt-4 ml-9 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 mr-1.5">
                    💡 해설:
                  </span>
                  {q.explain}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quiz Submission Result Banner */}
      {submitted && (
        <div
          className={`p-6 rounded-2xl border ${
            isPassed
              ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-400 dark:border-emerald-700"
              : "bg-gradient-to-br from-rose-500/10 to-amber-500/10 border-rose-400 dark:border-rose-700"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isPassed
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                }`}
              >
                {isPassed ? (
                  <Trophy className="w-6 h-6" />
                ) : (
                  <RotateCcw className="w-6 h-6" />
                )}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {isPassed ? "퀴즈 통과 성공! 🎉" : "아쉽게 통과하지 못했어요"}
                  {isPassed && correctCount === quiz.questions.length && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-extrabold flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3" /> 만점 달성!
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  점수: {correctCount} / {quiz.questions.length} 문항 (
                  {Math.round(scoreRatio * 100)}%) —{" "}
                  {isPassed
                    ? "다음 토픽 잠금이 해제되었습니다!"
                    : "해설을 확인하고 다시 도전해보세요."}
                </p>
                {gainedXp > 0 && (
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> +{gainedXp} XP 획득!
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {!isPassed ? (
                <button
                  onClick={handleRetry}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 다시 풀기
                </button>
              ) : (
                onNextTopic && (
                  <button
                    onClick={onNextTopic}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 hover:translate-x-0.5"
                  >
                    <span>{nextTopicTitle ? `${nextTopicTitle}로 이동` : "다음 학습으로"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )
              )}
            </div>
          </div>

          {/* Newly earned badges banner */}
          {newlyEarnedBadges.length > 0 && (
            <div className="mt-4 pt-4 border-t border-emerald-300 dark:border-emerald-800/60">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 mb-2">
                <Award className="w-4 h-4 text-amber-500" />
                새로운 배지를 획득했습니다!
              </div>
              <div className="flex flex-wrap gap-2">
                {newlyEarnedBadges.map((badgeId) => {
                  const b = allBadges.find((x) => x.id === badgeId);
                  return (
                    <div
                      key={badgeId}
                      className="px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-300 dark:border-amber-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="text-amber-500">🏆</span>
                      <span>{b?.name || badgeId}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit Action Button */}
      {!submitted && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            disabled={!allAnswered}
            onClick={handleGradeQuiz}
            className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold text-sm shadow-md shadow-emerald-600/20 disabled:shadow-none transition-all"
          >
            퀴즈 채점 및 제출
          </button>
        </div>
      )}
    </div>
  );
}
