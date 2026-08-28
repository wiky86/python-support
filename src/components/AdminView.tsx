"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { getLevel } from "@/lib/gamification";
import { StudentSummary, AdminUserListRow, UserProgressRow, UserBadgeRow } from "@/types/database";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Award,
  Flame,
  CheckCircle2,
  Calendar,
  Sparkles,
  Download,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Filter,
} from "lucide-react";

interface AdminViewProps {
  totalTopicsCount: number;
}

type SortField =
  | "loginId"
  | "cohort"
  | "progressPercent"
  | "completedTopicsCount"
  | "level"
  | "xp"
  | "badgesCount"
  | "streakCount"
  | "lastStudied";

type SortDirection = "asc" | "desc";

/**
 * Extracts cohort code from login ID.
 * Examples:
 * - "DF08001" -> "DF08"
 * - "AI02015" -> "AI02"
 * - "DS1001" -> "DS1" or "DS10"
 */
function extractCohort(loginId: string): string {
  if (!loginId) return "기타";
  const clean = loginId.trim().toUpperCase();
  // Matches letters followed by 2 digits (e.g. DF08)
  const m2 = clean.match(/^([A-Z]+[0-9]{2})/);
  if (m2) return m2[1];
  // Matches letters followed by 1 digit (e.g. DF8)
  const m1 = clean.match(/^([A-Z]+[0-9]{1})/);
  if (m1) return m1[1];
  // Matches letters only
  const mLetters = clean.match(/^([A-Z]+)/);
  if (mLetters) return mLetters[1];
  return "기타";
}

export function AdminView({ totalTopicsCount }: AdminViewProps) {
  const router = useRouter();
  const { user, loading: authLoading, isConfigured } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  // State
  const [isAdminChecking, setIsAdminChecking] = useState(true);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [sortField, setSortField] = useState<SortField>("loginId");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Check admin status in DB
  const checkAdminAuth = useCallback(async () => {
    if (!isConfigured) {
      setIsAdminChecking(false);
      setIsAuthorizedAdmin(false);
      return;
    }

    if (!user) {
      setIsAdminChecking(false);
      setIsAuthorizedAdmin(false);
      return;
    }

    try {
      setIsAdminChecking(true);
      const { data, error: adminErr } = await (supabase.from("admins") as any)
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminErr || !data?.user_id) {
        setIsAuthorizedAdmin(false);
      } else {
        setIsAuthorizedAdmin(true);
      }
    } catch {
      setIsAuthorizedAdmin(false);
    } finally {
      setIsAdminChecking(false);
    }
  }, [user, isConfigured, supabase]);

  // Load all student data (Read-Only)
  const loadAdminData = useCallback(async () => {
    if (!user || !isConfigured) return;

    setLoadingData(true);
    setError(null);

    try {
      // 1. Fetch data in parallel via RLS with admin session
      const [userListRes, progressRes, badgesRes] = await Promise.all([
        (supabase.from("admin_user_list") as any).select("*"),
        (supabase.from("user_progress") as any).select("*"),
        (supabase.from("user_badges") as any).select("*"),
      ]);

      if (userListRes.error) {
        throw new Error(`수강생 목록 조회 실패: ${userListRes.error.message}`);
      }
      if (progressRes.error) {
        throw new Error(`진도 데이터 조회 실패: ${progressRes.error.message}`);
      }
      if (badgesRes.error) {
        throw new Error(`배지 데이터 조회 실패: ${badgesRes.error.message}`);
      }

      const userList = (userListRes.data || []) as AdminUserListRow[];
      const allProgress = (progressRes.data || []) as UserProgressRow[];
      const allBadges = (badgesRes.data || []) as UserBadgeRow[];

      // Index progress by user_id -> count of completed topics
      const completedCountByUser: Record<string, number> = {};
      allProgress.forEach((p) => {
        if (p.status === "completed" && !p.topic_id.endsWith(".project")) {
          completedCountByUser[p.user_id] = (completedCountByUser[p.user_id] || 0) + 1;
        }
      });

      // Index badges by user_id -> count of badges
      const badgesCountByUser: Record<string, number> = {};
      allBadges.forEach((b) => {
        badgesCountByUser[b.user_id] = (badgesCountByUser[b.user_id] || 0) + 1;
      });

      // Build StudentSummary records
      const summaryList: StudentSummary[] = userList.map((row) => {
        const rawLoginId = row.login_id || "UNKNOWN";
        const loginId = rawLoginId.toUpperCase();
        const cohort = extractCohort(loginId);
        const completedCount = completedCountByUser[row.user_id] || 0;
        const total = totalTopicsCount > 0 ? totalTopicsCount : 43;
        const progressPercent = Math.min(100, Math.round((completedCount / total) * 100));
        const xp = row.xp || 0;
        const level = getLevel(xp);
        const badgesCount = badgesCountByUser[row.user_id] || 0;
        const streakCount = row.streak_count || 0;
        const lastStudied = row.last_studied || null;

        return {
          userId: row.user_id,
          loginId,
          cohort,
          completedTopicsCount: completedCount,
          progressPercent,
          level,
          xp,
          badgesCount,
          streakCount,
          lastStudied,
        };
      });

      setStudents(summaryList);
    } catch (err: any) {
      console.error("Admin data load error:", err);
      setError(err?.message || "데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoadingData(false);
    }
  }, [user, isConfigured, supabase, totalTopicsCount]);

  useEffect(() => {
    checkAdminAuth();
  }, [checkAdminAuth]);

  useEffect(() => {
    if (isAuthorizedAdmin) {
      loadAdminData();
    }
  }, [isAuthorizedAdmin, loadAdminData]);

  // Extract distinct cohort list
  const cohorts = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.cohort) set.add(s.cohort);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered list based on cohort and search query
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchCohort = selectedCohort === "ALL" || s.cohort === selectedCohort;
      const matchSearch =
        !searchQuery.trim() ||
        s.loginId.includes(searchQuery.trim().toUpperCase());
      return matchCohort && matchSearch;
    });
  }, [students, selectedCohort, searchQuery]);

  // Sorted list
  const sortedStudents = useMemo(() => {
    const list = [...filteredStudents];
    list.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle nulls for lastStudied
      if (sortField === "lastStudied") {
        aVal = aVal || "";
        bVal = bVal || "";
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredStudents, sortField, sortDirection]);

  // Statistics calculation for summary cards
  const statsSummary = useMemo(() => {
    const totalCount = filteredStudents.length;
    if (totalCount === 0) {
      return {
        totalCount: 0,
        avgProgress: 0,
        avgXp: 0,
        avgLevel: 0,
        perfectProgressCount: 0,
        activeCount: 0,
      };
    }

    const sumProgress = filteredStudents.reduce((acc, s) => acc + s.progressPercent, 0);
    const sumXp = filteredStudents.reduce((acc, s) => acc + s.xp, 0);
    const sumLevel = filteredStudents.reduce((acc, s) => acc + s.level, 0);
    const perfectProgressCount = filteredStudents.filter((s) => s.progressPercent >= 100).length;

    // Active in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
    const activeCount = filteredStudents.filter(
      (s) => s.lastStudied && s.lastStudied >= sevenDaysAgoStr
    ).length;

    return {
      totalCount,
      avgProgress: Math.round(sumProgress / totalCount),
      avgXp: Math.round(sumXp / totalCount),
      avgLevel: Number((sumLevel / totalCount).toFixed(1)),
      perfectProgressCount,
      activeCount,
    };
  }, [filteredStudents]);

  // Sort Toggle Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to desc for metrics, asc for strings
      if (field === "loginId" || field === "cohort") {
        setSortDirection("asc");
      }
    }
  };

  // CSV Export Handler
  const exportToCsv = () => {
    if (sortedStudents.length === 0) return;

    const headers = [
      "아이디",
      "기수",
      "완료토픽수",
      "전체토픽수",
      "진도율(%)",
      "레벨",
      "누적XP",
      "획득배지수",
      "연속학습일",
      "마지막학습일",
    ];

    const rows = sortedStudents.map((s) => [
      s.loginId,
      s.cohort,
      s.completedTopicsCount,
      totalTopicsCount,
      `${s.progressPercent}%`,
      s.level,
      s.xp,
      s.badgesCount,
      s.streakCount,
      s.lastStudied || "-",
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `PyDataLab_수강생진도_${selectedCohort}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Auth Loading State
  if (authLoading || isAdminChecking) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          관리자 권한을 확인하는 중입니다...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated (Not Logged In)
  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            로그인이 필요합니다
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            관리자 대시보드에 접근하려면 관리자 계정으로 로그인해 주세요.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            prefetch={false}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  // 3. Unauthorized (Not in admins table)
  if (!isAuthorizedAdmin) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            접근 권한이 없습니다
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            현재 계정(<strong>{user.email}</strong>)은 관리자 권한이 등록되어 있지 않습니다. 관리자 계정으로 다시 로그인해 주세요.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            prefetch={false}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> 홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  // 4. Authorized Admin Dashboard View
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              ADMIN ONLY
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              수강생 학습 현황 대시보드
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            수강생들의 실시간 토픽 진도율, 레벨, 배지 수집 현황 및 연속 학습일을 한눈에 조회합니다. (전체 {totalTopicsCount}개 토픽 기준)
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadAdminData}
            disabled={loadingData}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
            <span>새로고침</span>
          </button>

          <button
            type="button"
            onClick={exportToCsv}
            disabled={sortedStudents.length === 0}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV 다운로드</span>
          </button>
        </div>
      </div>

      {/* 2. Summary KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Students */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>조회 수강생</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {statsSummary.totalCount}
            <span className="text-xs font-normal text-slate-500 ml-1">명</span>
          </div>
        </div>

        {/* Average Progress */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>평균 진도율</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {statsSummary.avgProgress}%
          </div>
        </div>

        {/* Average Level */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>평균 레벨</span>
            <Sparkles className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400">
            Lv.{statsSummary.avgLevel}
          </div>
        </div>

        {/* Active Students (7 days) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>최근 7일 학습</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-orange-600 dark:text-orange-400">
            {statsSummary.activeCount}
            <span className="text-xs font-normal text-slate-500 ml-1">명</span>
          </div>
        </div>

        {/* 100% Completed */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>전체 완주자</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {statsSummary.perfectProgressCount}
            <span className="text-xs font-normal text-slate-500 ml-1">명</span>
          </div>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Cohort Selector (Buttons on large screens, dropdown on small) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-purple-600" />
              기수 선택:
            </span>

            <button
              type="button"
              onClick={() => setSelectedCohort("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCohort === "ALL"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              전체 보기 ({students.length})
            </button>

            {cohorts.map((c) => {
              const count = students.filter((s) => s.cohort === c).length;
              const isSelected = selectedCohort === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCohort(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                    isSelected
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {c} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="수강생 아이디 검색 (예: DF08001)"
              className="w-full pl-9 pr-4 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 4. Error Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadAdminData}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 5. Main Student Progress Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 font-bold">
                <th className="py-4 px-5 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort("loginId")}
                    className="flex items-center gap-1.5 hover:text-purple-600 transition-colors cursor-pointer"
                  >
                    <span>수강생 아이디</span>
                    {sortField === "loginId" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-purple-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </th>

                <th className="py-4 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort("cohort")}
                    className="flex items-center gap-1.5 hover:text-purple-600 transition-colors cursor-pointer"
                  >
                    <span>기수</span>
                    {sortField === "cohort" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-purple-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </th>

                <th className="py-4 px-5 whitespace-nowrap min-w-[220px]">
                  <button
                    type="button"
                    onClick={() => handleSort("progressPercent")}
                    className="flex items-center gap-1.5 hover:text-purple-600 transition-colors cursor-pointer"
                  >
                    <span>전체 진도율</span>
                    {sortField === "progressPercent" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-purple-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </th>

                <th className="py-4 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort("level")}
                    className="flex items-center gap-1.5 hover:text-purple-600 transition-colors cursor-pointer"
                  >
                    <span>레벨 / 누적 XP</span>
                    {sortField === "level" || sortField === "xp" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-purple-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </th>

                <th className="py-4 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort("badgesCount")}
                    className="flex items-center gap-1.5 hover:text-purple-600 transition-colors cursor-pointer"
                  >
                    <span>획득 배지</span>
                    {sortField === "badgesCount" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-purple-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </th>

                <th className="py-4 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort("streakCount")}
                    className="flex items-center gap-1.5 hover:text-purple-600 transition-colors cursor-pointer"
                  >
                    <span>연속 학습</span>
                    {sortField === "streakCount" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-purple-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </th>

                <th className="py-4 px-5 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort("lastStudied")}
                    className="flex items-center gap-1.5 hover:text-purple-600 transition-colors cursor-pointer"
                  >
                    <span>마지막 학습일</span>
                    {sortField === "lastStudied" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-purple-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loadingData ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                      <span>수강생 데이터를 동기화하고 있습니다...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-semibold">표시할 수강생이 없습니다.</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery ? "검색어를 확인해 주세요." : "등록된 수강생 계정이 없습니다."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedStudents.map((s, idx) => {
                  const isPerfect = s.progressPercent >= 100;
                  return (
                    <tr
                      key={s.userId}
                      className="hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors"
                    >
                      {/* ID */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 w-5">
                            {idx + 1}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                            {s.loginId}
                          </span>
                        </div>
                      </td>

                      {/* Cohort */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
                          {s.cohort}
                        </span>
                      </td>

                      {/* Progress Bar & Info */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold font-mono text-slate-900 dark:text-white flex items-center gap-1">
                              {isPerfect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                              {s.progressPercent}%
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {s.completedTopicsCount} / {totalTopicsCount} 토픽
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isPerfect
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${s.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Level & XP */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                            Lv.{s.level}
                          </span>
                          <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                            {s.xp.toLocaleString()} XP
                          </span>
                        </div>
                      </td>

                      {/* Badges */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs">
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                          <Award className="w-4 h-4 text-amber-500" />
                          <span>{s.badgesCount}개</span>
                        </div>
                      </td>

                      {/* Streak */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs">
                        <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span>{s.streakCount}일</span>
                        </div>
                      </td>

                      {/* Last Studied */}
                      <td className="py-3.5 px-5 whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.lastStudied || "-"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
