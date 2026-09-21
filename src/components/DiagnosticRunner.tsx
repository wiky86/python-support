"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Course, Track, DiagnosticData, DiagnosticQuestion } from "@/types/content";
import { UserDiagnosticRow, DiagnosticRetakeGrantRow } from "@/types/database";
import { useAuth } from "@/lib/auth-context";
import { getDiagnosticGrade, DIAGNOSTIC_STRONG_THRESHOLD, DIAGNOSTIC_FAIR_THRESHOLD } from "@/lib/progress";
import {
  Sparkles,
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  BookOpen,
  Layers,
  ShieldCheck,
  Check,
  ShieldAlert,
} from "lucide-react";
import { MarkdownViewer } from "./MarkdownViewer";
import { createClient } from "@/lib/supabase/client";

interface DiagnosticRunnerProps {
  course: Course;
  diagnostic: DiagnosticData;
  tracks: Track[];
}

export function DiagnosticRunner({
  course,
  diagnostic,
  tracks,
}: DiagnosticRunnerProps) {
  const { user, isConfigured } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const [isPending, startTransition] = useTransition();

  // State management
  const [loading, setLoading] = useState(true);
  const [savedResult, setSavedResult] = useState<UserDiagnosticRow | null>(null);
  const [grant, setGrant] = useState<DiagnosticRetakeGrantRow | null>(null);

  // Runner state
  const [mode, setMode] = useState<"intro" | "test" | "result">("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  // selected answers map: questionId -> selected option index (-1 for don't know)
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [showExplanations, setShowExplanations] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Map tracks by ID for easy title lookup
  const trackMap = React.useMemo(() => {
    const map: Record<string, Track> = {};
    tracks.forEach((t) => {
      map[t.id] = t;
    });
    return map;
  }, [tracks]);

  // Load existing diagnostic result and grant on mount
  useEffect(() => {
    async function loadData() {
      if (!user) {
        // Guest mode: check localStorage fallback
        const localSaved = localStorage.getItem(`guest_diag_${course.id}`);
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            setSavedResult(parsed);
            setMode("result");
          } catch {
            setMode("intro");
          }
        } else {
          setMode("intro");
        }
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [diagRes, grantRes] = await Promise.all([
          supabase
            .from("user_diagnostics")
            .select("*")
            .eq("user_id", user.id)
            .eq("course", course.id)
            .maybeSingle(),
          supabase
            .from("diagnostic_retake_grants")
            .select("*")
            .eq("user_id", user.id)
            .eq("course", course.id)
            .maybeSingle(),
        ]);

        const diagData = diagRes.data as UserDiagnosticRow | null;
        const grantData = grantRes.data as DiagnosticRetakeGrantRow | null;

        setSavedResult(diagData);
        setGrant(grantData);

        // If diagnostic already completed and no active unused grant -> show result
        if (diagData && (!grantData || grantData.consumed)) {
          setMode("result");
        } else {
          setMode("intro");
        }
      } catch (err) {
        console.error("Error loading diagnostic:", err);
        setMode("intro");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, course.id, supabase]);

  const questions = diagnostic.questions || [];
  const currentQuestion: DiagnosticQuestion | undefined = questions[currentIndex];

  // Handle answer selection
  const handleSelectOption = (idx: number) => {
    if (!currentQuestion) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: idx,
    }));
  };

  // Submit and grade diagnostic
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    // Calculate score
    let totalCorrect = 0;
    const trackCounts: Record<string, { total: number; correct: number }> = {};
    const recordedAnswers: Record<string, { selectedIndex: number; isCorrect: boolean; isDontKnow: boolean }> = {};

    questions.forEach((q) => {
      const selected = userAnswers[q.id];
      const isDontKnow = selected === -1 || selected === undefined;
      const isCorrect = !isDontKnow && selected === q.answer;

      if (isCorrect) totalCorrect += 1;

      if (!trackCounts[q.trackId]) {
        trackCounts[q.trackId] = { total: 0, correct: 0 };
      }
      trackCounts[q.trackId].total += 1;
      if (isCorrect) trackCounts[q.trackId].correct += 1;

      recordedAnswers[q.id] = {
        selectedIndex: selected !== undefined ? selected : -1,
        isCorrect,
        isDontKnow,
      };
    });

    const totalScore = questions.length > 0 ? Number((totalCorrect / questions.length).toFixed(3)) : 0;
    const trackScores: Record<string, number> = {};

    Object.entries(trackCounts).forEach(([trackId, count]) => {
      trackScores[trackId] = count.total > 0 ? Number((count.correct / count.total).toFixed(3)) : 0;
    });

    const newResult: UserDiagnosticRow = {
      user_id: user?.id || "guest",
      course: course.id,
      total_score: totalScore,
      track_scores: trackScores,
      answers: recordedAnswers as any,
      taken_at: new Date().toISOString(),
    };

    if (!user) {
      // Save to localStorage for guest
      localStorage.setItem(`guest_diag_${course.id}`, JSON.stringify(newResult));
      setSavedResult(newResult);
      setMode("result");
      setSubmitting(false);
      return;
    }

    try {
      // 1. Upsert user_diagnostics
      const { error: upsertErr } = await (supabase.from("user_diagnostics") as any).upsert(
        {
          user_id: user.id,
          course: course.id,
          total_score: totalScore,
          track_scores: trackScores,
          answers: recordedAnswers,
          taken_at: new Date().toISOString(),
        },
        { onConflict: "user_id,course" }
      );

      if (upsertErr) {
        console.error("Diagnostic save error:", upsertErr);
        setSavedResult(newResult);
        setMode("result");
        setSubmitting(false);
        return;
      }

      // 2. If retake grant was active, consume it
      if (grant && !grant.consumed) {
        await (supabase.from("diagnostic_retake_grants") as any)
          .update({ consumed: true })
          .eq("user_id", user.id)
          .eq("course", course.id);
        setGrant({ ...grant, consumed: true });
      }

      setSavedResult(newResult);
      setMode("result");
    } catch (err: any) {
      console.error("Diagnostic submit error:", err);
      setSavedResult(newResult);
      setMode("result");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading spinner
  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          진단 정보를 불러오는 중입니다...
        </p>
      </div>
    );
  }

  // VIEW 1: INTRO SCREEN
  if (mode === "intro") {
    const isRetake = savedResult && grant && !grant.consumed;

    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fadeIn">
        <div>
          <Link
            href={`/${course.id}`}
            prefetch={false}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{course.title} 학습 로드맵으로 돌아가기</span>
          </Link>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-10 border border-indigo-500/20 shadow-xl relative overflow-hidden">
          <div className="space-y-4 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>사전 학습 진단 테스트</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              {diagnostic.title}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              {diagnostic.description}
            </p>

            {isRetake && (
              <div className="p-3.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>관리자로부터 <strong>1회 재응시 권한</strong>이 부여되었습니다. 제출 시 기존 진단 결과가 갱신됩니다.</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> 문항 구성
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              총 {questions.length}문항 (MCQ)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              전체 {tracks.length}개 트랙의 핵심 선수 지식을 고루 커버합니다.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-500" /> 트랙 강약 지도
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              영역별 강약 진단
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              제출 즉시 나의 트랙별 선수 이해도를 3단계(강함/보통/약함)로 분석합니다.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> 원칙 및 주의사항
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              순차 학습 순서 유지
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              진단 결과는 현황 파악용이며, 실제 학습은 트랙 1부터 순서대로 진행됩니다.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-500" />
            진단 응시 전 안내사항
          </h3>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
            <li>{diagnostic.instruction}</li>
            {diagnostic.allowDontKnow && (
              <li>
                모르는 문항은 무리하게 찍지 않고 <strong>&apos;모르겠음&apos;</strong>을 선택하면 더 정확한 선수 이해도 진단이 가능합니다.
              </li>
            )}
            <li>진단은 기본 <strong>1회만 응시</strong>할 수 있으며, 제출 후에는 결과 화면과 문항별 해설을 다시 볼 수 있습니다.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {!user ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                * 비로그인(게스트) 상태에서는 브라우저에 임시 저장됩니다.
              </span>
            ) : (
              <span>로그인 계정({user.email?.split("@")[0].toUpperCase()})으로 진단 결과가 기록됩니다.</span>
            )}
          </div>

          <button
            onClick={() => setMode("test")}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
          >
            <span>진단 테스트 시작하기</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // VIEW 2: QUESTION RUNNER SCREEN
  if (mode === "test" && currentQuestion) {
    const isAnswered = userAnswers[currentQuestion.id] !== undefined;
    const selectedChoice = userAnswers[currentQuestion.id];
    const targetTrack = trackMap[currentQuestion.trackId];
    const answeredCount = Object.keys(userAnswers).length;
    const isLastQuestion = currentIndex === questions.length - 1;

    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              문항 {currentIndex + 1} / {questions.length}
            </span>
            {targetTrack && (
              <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                {targetTrack.title}
              </span>
            )}
          </div>
          <span className="font-mono">응답 완료: {answeredCount}/{questions.length}</span>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
              Question {currentIndex + 1}
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              <MarkdownViewer content={currentQuestion.q} />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {currentQuestion.options.map((opt, optIdx) => {
              const isSelected = selectedChoice === optIdx;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full text-left p-4 rounded-2xl border text-sm font-medium transition-all flex items-start gap-3.5 group ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm"
                      : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-slate-300"
                    }`}
                  >
                    {optIdx + 1}
                  </div>
                  <span className="flex-1 leading-relaxed">{opt}</span>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />}
                </button>
              );
            })}

            {diagnostic.allowDontKnow && (
              <button
                type="button"
                onClick={() => handleSelectOption(-1)}
                className={`w-full text-left p-3.5 rounded-2xl border text-xs font-medium transition-all flex items-center gap-3 ${
                  selectedChoice === -1
                    ? "bg-slate-200 dark:bg-slate-800 border-slate-400 text-slate-900 dark:text-white"
                    : "bg-transparent border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400"
                }`}
              >
                <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>잘 모르겠습니다 (찍지 않고 건너뛰기)</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>이전 문항</span>
          </button>

          <div className="flex items-center gap-2">
            {!isLastQuestion ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <span>다음 문항</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>채점 및 저장 중...</span>
                  </>
                ) : (
                  <>
                    <span>진단 완료 및 제출</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 mb-2">문항 바로 이동</div>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, idx) => {
              const isCurr = idx === currentIndex;
              const isAns = userAnswers[q.id] !== undefined;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${
                    isCurr
                      ? "bg-emerald-600 text-white ring-2 ring-emerald-400/40"
                      : isAns
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // VIEW 3: RESULT SCREEN (트랙별 강약 지도 — 현황 표시 전용)
  if (mode === "result" && savedResult) {
    const totalScorePct = Math.round((savedResult.total_score || 0) * 100);
    const overallGrade = getDiagnosticGrade(savedResult.total_score || 0);

    const trackStrengthList = tracks.map((track) => {
      const score = savedResult.track_scores?.[track.id] ?? 0;
      const grade = getDiagnosticGrade(score);
      return {
        track,
        score,
        grade,
        pct: Math.round(score * 100),
      };
    });

    const isRetakeActive = grant && !grant.consumed;

    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fadeIn">
        <div>
          <Link
            href={`/${course.id}`}
            prefetch={false}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{course.title} 학습 로드맵으로 돌아가기</span>
          </Link>
        </div>

        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 border border-indigo-500/20 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  사전 진단 완료 리포트
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(savedResult.taken_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {course.title} 사전 진단 결과
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                나의 영역별 선수 이해도 현황입니다. 이 결과는 학습 순서를 바꾸지 않으며, 트랙별 학습 시 집중 포인트를 확인하는 참고 자료입니다.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-center flex-shrink-0 w-full sm:w-44">
              <div className="text-xs text-slate-300 font-medium">종합 정답률</div>
              <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                {totalScorePct}%
              </div>
              <div className="mt-1.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${overallGrade.badgeClass}`}>
                  전체 이해도 {overallGrade.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                트랙별 강약 지도 (현황 분석)
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> 강함 (≥80%)
              </span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> 보통 (40~79%)
              </span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> 약함 (&lt;40%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {trackStrengthList.map(({ track, score, grade, pct }, idx) => {
              return (
                <div
                  key={track.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${grade.bgClass} ${grade.borderClass}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold font-mono text-slate-500 dark:text-slate-400">
                          TRACK {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {track.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {track.description}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${grade.badgeClass}`}
                      >
                        {grade.label} ({pct}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-3">
                    <div
                      className={`h-full ${grade.barClass} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-sm text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4" />
            <span>학습 진행 안내 (순차 잠금 구조 유지)</span>
          </div>
          <p className="leading-relaxed">
            • 본 진단 결과는 <strong>참고용</strong>입니다. 특정 트랙으로 바로 이동하지 않으며, 실제 학습은 <strong>트랙 1부터 순서대로 잠금을 해제</strong>하며 진행됩니다.
          </p>
          <p className="leading-relaxed">
            • 약함으로 표시된 트랙은 해당 순서가 왔을 때 개념과 실습을 조금 더 꼼꼼히 학습해 보세요.
          </p>
          <p className="leading-relaxed">
            • <strong>진단은 1회 응시로 마감되었습니다.</strong> 재응시가 필요한 경우 담당 강사/관리자에게 문의해 권한을 부여받으시기 바랍니다.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                문항별 해설 및 정답 확인
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowExplanations(!showExplanations)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>{showExplanations ? "해설 접기" : "전체 해설 보기"}</span>
              {showExplanations ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showExplanations && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              {questions.map((q, qIdx) => {
                const ansMeta = (savedResult.answers as any)?.[q.id];
                const selectedIdx = ansMeta?.selectedIndex ?? -1;
                const isCorrect = ansMeta?.isCorrect ?? (selectedIdx === q.answer);
                const isDontKnow = ansMeta?.isDontKnow ?? (selectedIdx === -1);
                const targetTrack = trackMap[q.trackId];

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-500">
                          Q{qIdx + 1}.
                        </span>
                        {targetTrack && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {targetTrack.title}
                          </span>
                        )}
                      </div>

                      <div>
                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 정답
                          </span>
                        ) : isDontKnow ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                            <HelpCircle className="w-3.5 h-3.5" /> 모르겠음
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                            <XCircle className="w-3.5 h-3.5" /> 오답
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                      <MarkdownViewer content={q.q} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, optIdx) => {
                        const isThisSelected = selectedIdx === optIdx;
                        const isThisCorrect = q.answer === optIdx;

                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-between ${
                              isThisCorrect
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200 font-bold"
                                : isThisSelected
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
                                : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            <span>
                              {optIdx + 1}. {opt}
                            </span>
                            {isThisCorrect && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                (정답)
                              </span>
                            )}
                            {isThisSelected && !isThisCorrect && (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                                (선택함)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explain && (
                      <div className="p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                        <strong>💡 해설:</strong> {q.explain}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link
            href={`/${course.id}`}
            prefetch={false}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs text-center shadow hover:opacity-95 transition-all"
          >
            {course.title} 학습 로드맵으로 가기
          </Link>

          {isRetakeActive && (
            <button
              type="button"
              onClick={() => {
                setUserAnswers({});
                setCurrentIndex(0);
                setMode("test");
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>부여된 재응시 권한으로 다시 풀기</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
