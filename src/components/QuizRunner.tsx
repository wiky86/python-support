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
  courseId?: string;
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
  courseId = "python",
  allBadges,
  allTrackTopicsCount,
  totalTopicsCount,
  totalTracksCount,
  onNextTopic,
  nextTopicTitle,
}: QuizRunnerProps) {
  const {
    progress,
    courseProgressMap,
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

  const existingProgress = progress[`${courseId}:${topicId}`] || progress[topicId];
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
      // topicComplete: 50 XP, quizPass: 30 XP, quizPerfectBonus: 20 XP
      let xpToAdd = 0;
      const isFirstPass = !existingProgress?.quiz_passed;

      if (isFirstPass) {
        xpToAdd += 30; // quizPass
        xpToAdd += 50; // topicComplete
        if (isPerfect) {
          xpToAdd += 20; // quizPerfectBonus
        }
      }

      setGainedXp(xpToAdd);

      // Save progress to Supabase / LocalStorage
      await updateTopicProgress(
        topicId,
        "completed",
        true,
        scoreRatio,
        courseId
      );

      if (xpToAdd > 0) {
        await recordStudyActivity(xpToAdd);
      }

      // Check newly unlocked badges
      const simulatedRow = {
        user_id: stats.user_id,
        course: courseId,
        topic_id: topicId,
        status: "completed" as const,
        quiz_passed: true,
        quiz_score: existingProgress?.quiz_score ?? scoreRatio,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const simulatedProgress = {
        ...progress,
        [topicId]: simulatedRow,
        [`${courseId}:${topicId}`]: simulatedRow,
      };

      const simulatedCourseMap = {
        ...courseProgressMap,
        [courseId]: {
          ...(courseProgressMap[courseId] || {}),
          [topicId]: simulatedRow,
        },
      };

      const simulatedStats = {
        ...stats,
        xp: stats.xp + xpToAdd,
      };

      const newBadgeIds = evaluateBadges({
        stats: simulatedStats,
        allProgress: simulatedProgress,
        courseProgressMap: simulatedCourseMap,
        existingBadges: badges,
        allBadges,
        courseTrackTopicsCount: { [courseId]: allTrackTopicsCount },
        courseTotalTopicsCount: { [courseId]: totalTopicsCount },
        courseTotalTracksCount: { [courseId]: totalTracksCount },
        currentCourseId: courseId,
      });

      if (newBadgeIds.length > 0) {
        setNewlyEarnedBadges(newBadgeIds);
        await saveEarnedBadges(newBadgeIds, courseId);
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
          통과 기준: {Math.round(quiz.passThreshold * 100)}% 이상 ({Math.ceil(quiz.questions.length * quiz.passThreshold)}/{quiz.questions.length} 정답)
        </div>
      </div>

      {/* Result Banner when submitted */}
      {submitted && (
        <div
          className={`p-6 rounded-3xl border transition-all ${
            isPassed
              ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-sm"
              : "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 shadow-sm"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
                  isPassed ? "bg-emerald-600 shadow-emerald-500/30" : "bg-rose-600 shadow-rose-500/30"
                }`}
              >
                {isPassed ? (
                  <Trophy className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {isPassed
                    ? correctCount === quiz.questions.length
                      ? "🎉 축하합니다! 만점 통과입니다!"
                      : "🎉 축하합니다! 퀴즈를 통과했습니다!"
                    : "아쉽게도 통과 기준에 미달했습니다."}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  총 {quiz.questions.length}문제 중 {correctCount}문제 정답 ({Math.round(scoreRatio * 100)}%)
                  {gainedXp > 0 && ` · +${gainedXp} XP 획득!`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {!isPassed ? (
                <button
                  onClick={handleRetry}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>다시 풀기</span>
                </button>
              ) : onNextTopic ? (
                <button
                  onClick={onNextTopic}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>{nextTopicTitle ? `${nextTopicTitle}으로 이동` : "다음 학습 진행"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Newly earned badge celebration banner */}
          {newlyEarnedBadges.length > 0 && (
            <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800/80 flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
              <Sparkles className="w-4 h-4 text-amber-500 animate-bounce" />
              <span>새로운 배지({newlyEarnedBadges.length}개)를 획득했습니다! 배지 도감에서 확인하세요.</span>
            </div>
          )}
        </div>
      )}

      {/* Question List */}
      <div className="space-y-6">
        {quiz.questions.map((q, qIdx) => {
          const selectedOption = selectedAnswers[q.id];
          const isAnswerSelected = selectedOption !== undefined;
          const isCorrect = submitted && selectedOption === q.answer;
          const isWrong = submitted && selectedOption !== q.answer;

          return (
            <div
              key={q.id}
              className={`p-6 rounded-2xl border transition-all ${
                submitted
                  ? isCorrect
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80"
                    : "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/80"
                  : "bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800"
              }`}
            >
              {/* Question Header */}
              <div className="flex items-start gap-3 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex-shrink-0">
                  {qIdx + 1}
                </span>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                  {q.q}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2.5 pl-9">
                {q.options.map((opt, optIdx) => {
                  const isThisSelected = selectedOption === optIdx;
                  const isThisCorrectAnswer = submitted && optIdx === q.answer;
                  const isThisWrongSelected = submitted && isThisSelected && optIdx !== q.answer;

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={submitted}
                      onClick={() => handleSelectOption(q.id, optIdx)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm font-medium border transition-all flex items-center justify-between ${
                        submitted
                          ? isThisCorrectAnswer
                            ? "bg-emerald-100 dark:bg-emerald-950/80 border-emerald-400 text-emerald-900 dark:text-emerald-100 font-bold"
                            : isThisWrongSelected
                            ? "bg-rose-100 dark:bg-rose-950/80 border-rose-400 text-rose-900 dark:text-rose-100 font-semibold"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
                          : isThisSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isThisSelected
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>

                      {submitted && isThisCorrectAnswer && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      )}
                      {submitted && isThisWrongSelected && (
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation (Shown only after submission) */}
              {submitted && q.explain && (
                <div className="mt-4 ml-9 p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
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

      {/* Submit Button */}
      {!submitted && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {allAnswered
              ? "모든 문제의 보기를 선택했습니다. 제출하여 채점하세요."
              : "모든 문제에 답안을 선택해 주세요."}
          </span>
          <button
            onClick={handleGradeQuiz}
            disabled={!allAnswered}
            className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all ${
              allAnswered
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 cursor-pointer"
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
          >
            퀴즈 제출 및 채점
          </button>
        </div>
      )}
    </div>
  );
}
