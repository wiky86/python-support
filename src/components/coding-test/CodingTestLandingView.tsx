"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CodingTestProblem } from "@/types/content";
import { CodingTestProgressRow } from "@/types/database";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import {
  Code2,
  Terminal,
  Database,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Layers,
  Zap,
  BookOpen,
} from "lucide-react";

interface CodingTestLandingViewProps {
  pythonProblems: CodingTestProblem[];
  sqlProblems: CodingTestProblem[];
  pythonCategories: string[];
  sqlCategories: string[];
}

export function CodingTestLandingView({
  pythonProblems,
  sqlProblems,
  pythonCategories,
  sqlCategories,
}: CodingTestLandingViewProps) {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [progressList, setProgressList] = useState<CodingTestProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      if (!user) {
        if (typeof window !== "undefined") {
          try {
            const localPy = localStorage.getItem("guest_ct_progress_python");
            const localSql = localStorage.getItem("guest_ct_progress_sql");
            const list: CodingTestProgressRow[] = [];
            if (localPy) list.push(...Object.values(JSON.parse(localPy) as Record<string, CodingTestProgressRow>));
            if (localSql) list.push(...Object.values(JSON.parse(localSql) as Record<string, CodingTestProgressRow>));
            setProgressList(list);
          } catch {}
        }
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("coding_test_progress")
          .select("*")
          .eq("user_id", user.id);

        if (!error && data) {
          setProgressList(data as CodingTestProgressRow[]);
        }
      } catch (err) {
        console.error("Error loading coding test progress:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [user, supabase]);

  // Compute solved stats
  const pySolvedCount = progressList.filter((p) => p.lang === "python" && p.solved).length;
  const sqlSolvedCount = progressList.filter((p) => p.lang === "sql" && p.solved).length;
  const totalSolvedCount = pySolvedCount + sqlSolvedCount;
  const totalProblemsCount = pythonProblems.length + sqlProblems.length;
  const totalPercent = totalProblemsCount > 0 ? Math.round((totalSolvedCount / totalProblemsCount) * 100) : 0;

  const pyPercent = pythonProblems.length > 0 ? Math.round((pySolvedCount / pythonProblems.length) * 100) : 0;
  const sqlPercent = sqlProblems.length > 0 ? Math.round((sqlSolvedCount / sqlProblems.length) * 100) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-fadeIn">
      {/* 1. Hero Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 border border-indigo-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                실전 문제은행
              </span>
              <span className="text-xs text-slate-400 font-mono">순차 잠금 없음 • 자유 풀이</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              파이썬 &amp; SQL 실전 코딩테스트
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              기초 문법부터 실무 데이터 가공, SQL 질의까지 다양한 유형의 실전 문제를 풀며 문제 해결 역량을 검증하세요.
            </p>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 해결한 문제
              </div>
              <div className="text-xl font-bold font-mono mt-1 text-emerald-400">
                {totalSolvedCount} / {totalProblemsCount}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                달성률 {totalPercent}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> 획득 XP
              </div>
              <div className="text-xl font-bold font-mono mt-1 text-amber-400">
                {(totalSolvedCount * 10).toLocaleString()} XP
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                문제당 10 XP 지급
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" /> 총 카테고리
              </div>
              <div className="text-xl font-bold font-mono mt-1 text-cyan-400">
                {pythonCategories.length + sqlCategories.length}개
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                유형별 연습
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Language Selection Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              언어별 문제 목록
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            풀이할 언어를 선택하여 실전 문제를 시작하세요
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Python Card */}
          <div className="p-6 sm:p-7 rounded-3xl border transition-all duration-300 hover:shadow-xl relative flex flex-col justify-between group bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-transparent border-emerald-200/80 dark:border-emerald-800/60 hover:border-emerald-400 dark:hover:border-emerald-600">
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      PYTHON
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                      파이썬 코딩테스트
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {pySolvedCount} / {pythonProblems.length} 완료
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {pyPercent}% 해결
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                자료구조, 문자열 처리, 알고리즘 기초, pandas 데이터 가공 등 파이썬 프로그래밍 실전 문제은행
              </p>

              {/* Category tags */}
              {pythonCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {pythonCategories.slice(0, 5).map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium border border-emerald-200/60 dark:border-emerald-800/60"
                    >
                      {cat}
                    </span>
                  ))}
                  {pythonCategories.length > 5 && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px]">
                      +{pythonCategories.length - 5}
                    </span>
                  )}
                </div>
              )}

              {/* Progress bar */}
              <div className="space-y-1.5 pt-1">
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-500 to-teal-400"
                    style={{ width: `${pyPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/coding-test/python"
                prefetch={false}
                className="w-full py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 group-hover:gap-3"
              >
                <span>파이썬 문제 풀러 가기</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* SQL Card */}
          <div className="p-6 sm:p-7 rounded-3xl border transition-all duration-300 hover:shadow-xl relative flex flex-col justify-between group bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-transparent dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-transparent border-blue-200/80 dark:border-blue-800/60 hover:border-blue-400 dark:hover:border-blue-600">
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-blue-500/20 group-hover:scale-105 transition-transform">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      SQL
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                      SQL 코딩테스트
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {sqlSolvedCount} / {sqlProblems.length} 완료
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {sqlPercent}% 해결
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                조회 기초, 집계, GROUP BY, JOIN, 서브쿼리, 윈도우 함수 등 실무 SQL 쿼리 실전 문제은행
              </p>

              {/* Category tags */}
              {sqlCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sqlCategories.slice(0, 5).map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-medium border border-blue-200/60 dark:border-blue-800/60"
                    >
                      {cat}
                    </span>
                  ))}
                  {sqlCategories.length > 5 && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px]">
                      +{sqlCategories.length - 5}
                    </span>
                  )}
                </div>
              )}

              {/* Progress bar */}
              <div className="space-y-1.5 pt-1">
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-blue-500 to-indigo-500"
                    style={{ width: `${sqlPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/coding-test/sql"
                prefetch={false}
                className="w-full py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 group-hover:gap-3"
              >
                <span>SQL 문제 풀러 가기</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Feature Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">자유로운 실전 연습</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            과목 학습의 순차 잠금과 무관하게 원하는 유형의 문제를 언제든지 자유롭게 선택해 풀 수 있습니다.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">결과형 &amp; 빈칸형 실습</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            코드 실행 결과를 입력하는 결과형과 코드 뼈대를 채우는 빈칸형 문제로 핵심 로직을 훈련합니다.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">통합 경험치(XP) 지급</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            문제를 최초로 해결할 때마다 10 XP가 계정 통합 경험치에 가산되어 레벨 성장을 지원합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
