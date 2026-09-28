"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CodingTestProblem, CodingTestBlank, SampleDatabase } from "@/types/content";
import { CodingTestProgressRow } from "@/types/database";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { checkFillInBlank } from "@/lib/progress";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { SampleDbViewer } from "@/components/SampleDbViewer";
import {
  Code2,
  Terminal,
  Database,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Zap,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Layers,
  Send,
  Eye,
  Check,
  Play,
} from "lucide-react";

interface CodingTestRunnerProps {
  lang: "python" | "sql";
  problem: CodingTestProblem;
  allProblems: CodingTestProblem[];
  sampleDb?: SampleDatabase | null;
}

export function CodingTestRunner({
  lang,
  problem,
  allProblems,
  sampleDb,
}: CodingTestRunnerProps) {
  const router = useRouter();
  const { user, isConfigured, recordStudyActivity } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const [isPending, startTransition] = useTransition();

  const isPython = lang === "python";
  const isSql = lang === "sql";

  // Existing progress row
  const [progressRow, setProgressRow] = useState<CodingTestProgressRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Solving inputs
  const [resultInput, setResultInput] = useState<string>("");
  const [blankInputs, setBlankInputs] = useState<Record<string, string>>({});

  // Status
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [blankResults, setBlankResults] = useState<Record<string, boolean>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [newlyEarnedXp, setNewlyEarnedXp] = useState(false);

  // Load existing progress
  useEffect(() => {
    async function loadProblemProgress() {
      if (!user) {
        if (typeof window !== "undefined") {
          try {
            const local = localStorage.getItem(`guest_ct_progress_${lang}`);
            if (local) {
              const map = JSON.parse(local);
              const p = map[problem.id];
              if (p) {
                setProgressRow(p);
                if (p.solved) {
                  setStatus("correct");
                  setShowExplanation(true);
                }
              }
            }
          } catch {}
        }
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("coding_test_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("problem_id", problem.id)
          .maybeSingle();

        if (!error && data) {
          const row = data as CodingTestProgressRow;
          setProgressRow(row);
          if (row.solved) {
            setStatus("correct");
            setShowExplanation(true);
          }
        }
      } catch (err) {
        console.error("Error loading problem progress:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProblemProgress();
  }, [user, lang, problem.id, supabase]);

  // Index of current problem in list for prev/next navigation
  const currentIndex = allProblems.findIndex((p) => p.id === problem.id);
  const prevProblem = currentIndex > 0 ? allProblems[currentIndex - 1] : null;
  const nextProblem = currentIndex < allProblems.length - 1 ? allProblems[currentIndex + 1] : null;

  // Handle grading submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (status === "correct") return;

    let isCorrect = false;
    const currentAttempts = (progressRow?.attempts || 0) + 1;

    if (problem.type === "result") {
      const answers = problem.answers || [];
      isCorrect = checkFillInBlank(resultInput, answers, problem.ignoreCase);
    } else if (problem.type === "fill") {
      const blanks = problem.blanks || [];
      const newBlankResults: Record<string, boolean> = {};
      let allBlanksCorrect = blanks.length > 0;

      blanks.forEach((b) => {
        const inputVal = blankInputs[b.id] || "";
        const bCorrect = checkFillInBlank(inputVal, b.answers, b.ignoreCase);
        newBlankResults[b.id] = bCorrect;
        if (!bCorrect) {
          allBlanksCorrect = false;
        }
      });

      setBlankResults(newBlankResults);
      isCorrect = allBlanksCorrect;
    }

    const wasAlreadySolved = progressRow?.solved === true;

    if (isCorrect) {
      setStatus("correct");
      setShowExplanation(true);

      // Award XP if first time solved
      if (!wasAlreadySolved) {
        setNewlyEarnedXp(true);
        await recordStudyActivity(10);
      }

      // Save to DB / localStorage
      const updatedRow: CodingTestProgressRow = {
        user_id: user ? user.id : "guest-user",
        problem_id: problem.id,
        lang,
        solved: true,
        attempts: currentAttempts,
        last_tried: new Date().toISOString(),
        solved_at: wasAlreadySolved ? progressRow?.solved_at || new Date().toISOString() : new Date().toISOString(),
      };

      setProgressRow(updatedRow);

      if (user && isConfigured) {
        try {
          await (supabase.from("coding_test_progress") as any).upsert(
            {
              user_id: user.id,
              problem_id: problem.id,
              lang,
              solved: true,
              attempts: currentAttempts,
              last_tried: new Date().toISOString(),
              solved_at: updatedRow.solved_at,
            },
            { onConflict: "user_id,problem_id" }
          );
        } catch (err) {
          console.error("Error saving coding test progress:", err);
        }
      } else if (typeof window !== "undefined") {
        try {
          const key = `guest_ct_progress_${lang}`;
          const local = localStorage.getItem(key);
          const map = local ? JSON.parse(local) : {};
          map[problem.id] = updatedRow;
          localStorage.setItem(key, JSON.stringify(map));
        } catch {}
      }
    } else {
      setStatus("wrong");

      // Save attempt
      const updatedRow: CodingTestProgressRow = {
        user_id: user ? user.id : "guest-user",
        problem_id: problem.id,
        lang,
        solved: wasAlreadySolved,
        attempts: currentAttempts,
        last_tried: new Date().toISOString(),
        solved_at: progressRow?.solved_at || null,
      };

      setProgressRow(updatedRow);

      if (user && isConfigured) {
        try {
          await (supabase.from("coding_test_progress") as any).upsert(
            {
              user_id: user.id,
              problem_id: problem.id,
              lang,
              solved: wasAlreadySolved,
              attempts: currentAttempts,
              last_tried: new Date().toISOString(),
              solved_at: updatedRow.solved_at,
            },
            { onConflict: "user_id,problem_id" }
          );
        } catch (err) {
          console.error("Error saving coding test attempt:", err);
        }
      } else if (typeof window !== "undefined") {
        try {
          const key = `guest_ct_progress_${lang}`;
          const local = localStorage.getItem(key);
          const map = local ? JSON.parse(local) : {};
          map[problem.id] = updatedRow;
          localStorage.setItem(key, JSON.stringify(map));
        } catch {}
      }
    }
  };

  // Helper to generate completed code for fill-in-the-blank explanation
  const completedCode = React.useMemo(() => {
    if (problem.type !== "fill" || !problem.skeleton) return "";
    let code = problem.skeleton;
    const blanks = problem.blanks || [];
    blanks.forEach((b) => {
      const primaryAns = b.answers?.[0] || "";
      code = code.replace("______", primaryAns);
    });
    return code;
  }, [problem]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      {/* 0. Top Navigation & Problem Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <Link
          href={`/coding-test/${lang}`}
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isPython ? "파이썬" : "SQL"} 문제 목록으로</span>
        </Link>

        {/* Previous / Next Problem buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {prevProblem ? (
            <Link
              href={`/coding-test/${lang}/${prevProblem.id}`}
              prefetch={false}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>이전 문제</span>
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 text-slate-300 dark:text-slate-700 font-bold text-xs flex items-center gap-1 cursor-not-allowed">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>이전 문제</span>
            </span>
          )}

          <span className="text-xs font-mono text-slate-400 px-1">
            {currentIndex + 1} / {allProblems.length}
          </span>

          {nextProblem ? (
            <Link
              href={`/coding-test/${lang}/${nextProblem.id}`}
              prefetch={false}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center gap-1"
            >
              <span>다음 문제</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 text-slate-300 dark:text-slate-700 font-bold text-xs flex items-center gap-1 cursor-not-allowed">
              <span>다음 문제</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* 1. Problem Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs">
            {problem.id}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200/60 dark:border-indigo-800/60">
            {problem.category}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs">
            {problem.type === "result" ? "결과 확인형" : "빈칸 채우기"}
          </span>

          {progressRow?.solved && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs ml-auto">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>해결 완료</span>
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          {problem.title}
        </h1>
      </div>

      {/* Optional Sample Database Viewer for SQL Coding Test */}
      {isSql && sampleDb && (
        <SampleDbViewer
          sampleDb={sampleDb}
          dbNote={problem.dbNote}
          defaultOpen={false}
        />
      )}

      {/* 2. Problem Prompt (Markdown) */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <span>문제 설명</span>
        </div>
        <MarkdownViewer content={problem.prompt} />
      </div>

      {/* 3. Solving Work Area */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {problem.type === "result" ? "코드 실행 결과 예측" : "코드 뼈대 빈칸 채우기"}
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            시도 횟수: {progressRow?.attempts || 0}회
          </span>
        </div>

        {/* TYPE A: RESULT */}
        {problem.type === "result" && (
          <div className="space-y-4">
            {problem.code && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500">실행 대상 코드 / 쿼리:</span>
                <div className="p-4 rounded-2xl bg-slate-950 text-slate-100 font-mono text-xs sm:text-sm border border-slate-800 overflow-x-auto">
                  <pre className="leading-relaxed whitespace-pre-wrap">{problem.code}</pre>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                실행 결과(출력값) 입력:
              </label>
              <textarea
                value={resultInput}
                onChange={(e) => {
                  setResultInput(e.target.value);
                  if (status === "wrong") setStatus("idle");
                }}
                rows={3}
                placeholder="코드의 예상 출력이나 반환값을 정확히 입력하세요..."
                disabled={status === "correct"}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-75"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  {problem.ignoreCase ? "※ 대소문자를 구분하지 않습니다." : "※ 정확한 문자열과 띄어쓰기를 입력하세요."}
                </span>

                <div className="flex items-center gap-2">
                  {status === "wrong" && (
                    <button
                      type="button"
                      onClick={() => setStatus("idle")}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>다시 시도</span>
                    </button>
                  )}

                  {status !== "correct" && (
                    <button
                      type="submit"
                      disabled={!resultInput.trim()}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>채점하기</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TYPE B: FILL */}
        {problem.type === "fill" && (
          <div className="space-y-4">
            {problem.skeleton && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500">코드 뼈대:</span>
                <div className="p-4 rounded-2xl bg-slate-950 text-slate-100 font-mono text-xs sm:text-sm border border-slate-800 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {problem.skeleton}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                빈칸 정답 입력:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(problem.blanks || []).map((blank, idx) => {
                  const val = blankInputs[blank.id] || "";
                  const isBlankCorrect = blankResults[blank.id];

                  return (
                    <div
                      key={blank.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600 dark:text-slate-400 font-mono">
                          빈칸 {idx + 1} ({blank.id})
                        </span>
                        {status !== "idle" && (
                          <span>
                            {isBlankCorrect ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> 정답
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center gap-0.5">
                                <XCircle className="w-3 h-3" /> 오답
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      <input
                        type="text"
                        value={val}
                        onChange={(e) => {
                          setBlankInputs((prev) => ({ ...prev, [blank.id]: e.target.value }));
                          if (status === "wrong") setStatus("idle");
                        }}
                        placeholder={`빈칸 ${idx + 1}에 들어갈 코드...`}
                        disabled={status === "correct"}
                        className={`w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-75 ${
                          status !== "idle"
                            ? isBlankCorrect
                              ? "border-emerald-500"
                              : "border-rose-500"
                            : "border-slate-200 dark:border-slate-700"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  모든 빈칸을 순서대로 채운 뒤 채점 버튼을 누르세요.
                </span>

                <div className="flex items-center gap-2">
                  {status === "wrong" && (
                    <button
                      type="button"
                      onClick={() => setStatus("idle")}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>다시 시도</span>
                    </button>
                  )}

                  {status !== "correct" && (
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>채점하기</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* 4. Feedback & Celebration Banner */}
      {status === "correct" && (
        <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-100 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">정답입니다! 완벽히 해결하셨습니다.</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  해설과 완성된 코드를 확인해 보세요.
                </p>
              </div>
            </div>

            {newlyEarnedXp && (
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs font-mono shadow-md flex items-center gap-1.5 animate-bounce">
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>+10 XP 획득!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {status === "wrong" && (
        <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700/80 text-rose-900 dark:text-rose-100 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <div>
                <h3 className="text-sm font-bold">오답입니다. 다시 시도해 보세요.</h3>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  입력한 문자열이나 빈칸 위치를 다시 한 번 확인해 보세요.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowExplanation(!showExplanation)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showExplanation ? "해설 숨기기" : "해설 보기"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Explanation Area (Section 4-2 / 4-3) */}
      {showExplanation && (
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 text-slate-100 border border-slate-800 shadow-xl space-y-6 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider pb-3 border-b border-slate-800">
            <Sparkles className="w-4 h-4" />
            <span>상세 해설 및 정답 분석</span>
          </div>

          {/* Explanation Text */}
          <div className="prose prose-invert max-w-none text-xs sm:text-sm">
            <MarkdownViewer
              content={
                problem.type === "fill"
                  ? problem.explainFill || problem.explain || "정답 해설입니다."
                  : problem.explain || "정답 해설입니다."
              }
            />
          </div>

          {/* TYPE=FILL: Completed Code & Expected Output */}
          {problem.type === "fill" && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              {completedCode && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> 완성된 코드:
                  </span>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-900/40 text-emerald-300 font-mono text-xs sm:text-sm overflow-x-auto">
                    <pre className="whitespace-pre-wrap">{completedCode}</pre>
                  </div>
                </div>
              )}

              {problem.expectedOutput && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                    <Play className="w-3.5 h-3.5" /> 실행 결과 (출력):
                  </span>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-900/40 text-cyan-300 font-mono text-xs sm:text-sm overflow-x-auto">
                    <pre className="whitespace-pre-wrap">{problem.expectedOutput}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Next Problem Shortcut */}
          {nextProblem && (
            <div className="pt-2 flex justify-end">
              <Link
                href={`/coding-test/${lang}/${nextProblem.id}`}
                prefetch={false}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <span>다음 문제 풀기 ({nextProblem.title})</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
