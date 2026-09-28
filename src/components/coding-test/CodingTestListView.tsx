"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CodingTestProblem } from "@/types/content";
import { CodingTestProgressRow } from "@/types/database";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import {
  Code2,
  Terminal,
  Database,
  ArrowLeft,
  ArrowRight,
  Search,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Layers,
  FileCode,
  Edit3,
} from "lucide-react";

interface CodingTestListViewProps {
  lang: "python" | "sql";
  problems: CodingTestProblem[];
  categories: string[];
}

export function CodingTestListView({
  lang,
  problems,
  categories,
}: CodingTestListViewProps) {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [progressMap, setProgressMap] = useState<Record<string, CodingTestProgressRow>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const isPython = lang === "python";
  const isSql = lang === "sql";

  // Load progress from Supabase / localStorage
  useEffect(() => {
    async function loadProgress() {
      if (!user) {
        if (typeof window !== "undefined") {
          try {
            const local = localStorage.getItem(`guest_ct_progress_${lang}`);
            if (local) {
              setProgressMap(JSON.parse(local));
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
          .eq("lang", lang);

        if (!error && data) {
          const map: Record<string, CodingTestProgressRow> = {};
          (data as CodingTestProgressRow[]).forEach((row) => {
            map[row.problem_id] = row;
          });
          setProgressMap(map);
        }
      } catch (err) {
        console.error("Error loading progress for coding test:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [user, lang, supabase]);

  // Solved counts
  const solvedCount = useMemo(() => {
    return Object.values(progressMap).filter((p) => p.solved).length;
  }, [progressMap]);

  // Filtered problems
  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      // Category filter
      if (selectedCategory !== "ALL" && p.category !== selectedCategory) {
        return false;
      }
      // Type filter
      if (selectedType !== "ALL" && p.type !== selectedType) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchId = p.id.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        return matchTitle || matchId || matchCat;
      }
      return true;
    });
  }, [problems, selectedCategory, selectedType, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 0. Top Back Navigation */}
      <div>
        <Link
          href="/coding-test"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>코딩테스트 홈으로 돌아가기</span>
        </Link>
      </div>

      {/* 1. Header Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 text-white border shadow-xl relative overflow-hidden ${
          isPython
            ? "bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-500/20"
            : "bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-blue-500/20"
        }`}
      >
        <div
          className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
            isPython ? "bg-emerald-500/10" : "bg-blue-500/10"
          }`}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  isPython
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                }`}
              >
                {isPython ? <Terminal className="w-3.5 h-3.5" /> : <Database className="w-3.5 h-3.5" />}
                {isPython ? "Python Coding Test" : "SQL Coding Test"}
              </span>
              <span className="text-xs text-slate-400 font-mono">총 {problems.length}문제</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isPython ? "파이썬 코딩테스트 문제 목록" : "SQL 코딩테스트 문제 목록"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isPython
                ? "자료구조, 조건·반복, 문자열 처리, 컴프리헨션, 데이터 분석 실전 문제를 자유롭게 풀어보세요."
                : "데이터 조회, 필터링, 정렬, 집계, 조인, 서브쿼리 등 실무 SQL 쿼리 문제를 자유롭게 풀어보세요."}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md self-start sm:self-auto">
            <div className="text-right">
              <div className="text-xs text-slate-300">풀이 완료 현황</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {solvedCount} / {problems.length}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-400 flex items-center justify-center font-mono text-xs font-bold text-indigo-300">
              {problems.length > 0 ? Math.round((solvedCount / problems.length) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filters & Search */}
      <div className="space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === "ALL"
                ? isPython
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            전체 유형 ({problems.length})
          </button>

          {categories.map((cat) => {
            const count = problems.filter((p) => p.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? isPython
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Sub filter: Type & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">유형:</span>
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedType("ALL")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  selectedType === "ALL"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("result")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                  selectedType === "result"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <FileCode className="w-3 h-3" />
                <span>결과 확인형</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("fill")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                  selectedType === "fill"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>빈칸 채우기</span>
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="문제 제목, ID, 유형 검색..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Problems List Cards */}
      <div className="space-y-3">
        {problems.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <Code2 className="w-10 h-10 text-indigo-500 mx-auto opacity-70" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">코딩테스트 문제가 준비 중입니다</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {isPython ? "파이썬" : "SQL"} 실전 문제은행 콘텐츠가 곧 등록될 예정입니다.
            </p>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            선택한 조건에 일치하는 문제가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProblems.map((problem) => {
              const prog = progressMap[problem.id];
              const isSolved = prog?.solved === true;
              const isAttempted = prog && prog.attempts > 0 && !isSolved;

              return (
                <Link
                  key={problem.id}
                  href={`/coding-test/${lang}/${problem.id}`}
                  prefetch={false}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-mono font-bold">
                          {problem.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200/60 dark:border-indigo-800/60">
                          {problem.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px]">
                          {problem.type === "result" ? "결과 확인형" : "빈칸 채우기"}
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div>
                        {isSolved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>해결 완료</span>
                          </span>
                        ) : isAttempted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                            <RotateCcw className="w-3 h-3" />
                            <span>시도 중 ({prog.attempts}회)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[11px]">
                            <HelpCircle className="w-3 h-3" />
                            <span>미해결</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {problem.title}
                    </h3>
                  </div>

                  <div className="pt-4 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-[11px]">
                      {isSolved && prog?.solved_at
                        ? `해결: ${new Date(prog.solved_at).toLocaleDateString()}`
                        : "자유 풀이 가능"}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>{isSolved ? "다시 풀기" : "문제 풀기"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
