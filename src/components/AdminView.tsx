"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { getLevel } from "@/lib/gamification";
import { Course } from "@/types/content";
import { StudentSummary, StudentCourseProgress, AdminUserListRow, UserProgressRow, UserBadgeRow } from "@/types/database";
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
  Layers,
  Terminal,
  Landmark,
} from "lucide-react";

interface AdminViewProps {
  courses: Course[];
  courseTopicCounts: Record<string, number>;
  totalTopicsCount: number;
}

type SortField =
  | "loginId"
  | "cohort"
  | "progressPercent"
  | "completedTopicsCount"
  | "pythonPercent"
  | "financePercent"
  | "level"
  | "xp"
  | "badgesCount"
  | "streakCount"
  | "lastStudied";

type SortDirection = "asc" | "desc";

function extractCohort(loginId: string): string {
  if (!loginId) return "기타";
  const clean = loginId.trim().toUpperCase();
  const m2 = clean.match(/^([A-Z]+[0-9]{2})/);
  if (m2) return m2[1];
  const m1 = clean.match(/^([A-Z]+[0-9]{1})/);
  if (m1) return m1[1];
  const mLetters = clean.match(/^([A-Z]+)/);
  if (mLetters) return mLetters[1];
  return "기타";
}

export function AdminView({ courses, courseTopicCounts, totalTopicsCount }: AdminViewProps) {
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
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("" );

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

      let userList: AdminUserListRow[] = [];

      if (userListRes.error) {
        console.warn("admin_user_list query warning:", userListRes.error.message);
        const statsFallbackRes = await supabase.from("user_stats").select("*");
        if (statsFallbackRes.data && statsFallbackRes.data.length > 0) {
          userList = (statsFallbackRes.data as any[]).map((s) => ({
            user_id: s.user_id,
            login_id: s.user_id === user.id ? user.email?.split("@")[0] || "ADMIN" : `USER_${s.user_id.slice(0, 6)}`,
            xp: s.xp,
            streak_count: s.streak_count,
            last_studied: s.last_studied,
          }));
          setError(
            `Supabase 뷰(admin_user_list) 접근 권한 설정 필요: "${userListRes.error.message}". Supabase SQL Editor에서 'ALTER VIEW admin_user_list SET (security_invoker = false);' 를 실행하면 정상 연결됩니다.`
          );
        } else {
          throw new Error(`수강생 목록 조회 실패: ${userListRes.error.message}`);
        }
      } else {
        userList = (userListRes.data || []) as AdminUserListRow[];
      }

      if (progressRes.error) {
        throw new Error(`진도 데이터 조회 실패: ${progressRes.error.message}`);
      }
      if (badgesRes.error) {
        throw new Error(`배지 데이터 조회 실패: ${badgesRes.error.message}`);
      }

      const allProgress = (progressRes.data || []) as UserProgressRow[];
      const allBadges = (badgesRes.data || []) as UserBadgeRow[];

      // Index progress by user_id -> global completed count
      const completedCountByUser: Record<string, number> = {};
      // Index progress by user_id -> course -> completed count
      const courseCompletedCountByUser: Record<string, Record<string, number>> = {};

      allProgress.forEach((p) => {
        if (p.status === "completed" && !p.topic_id.endsWith(".project")) {
          completedCountByUser[p.user_id] = (completedCountByUser[p.user_id] || 0) + 1;

          const c = p.course || "python";
          if (!courseCompletedCountByUser[p.user_id]) {
            courseCompletedCountByUser[p.user_id] = {};
          }
          courseCompletedCountByUser[p.user_id][c] = (courseCompletedCountByUser[p.user_id][c] || 0) + 1;
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
        const globalCompleted = completedCountByUser[row.user_id] || 0;
        const total = totalTopicsCount > 0 ? totalTopicsCount : 97;
        const progressPercent = Math.min(100, Math.round((globalCompleted / total) * 100));
        const xp = row.xp || 0;
        const level = getLevel(xp);
        const badgesCount = badgesCountByUser[row.user_id] || 0;
        const streakCount = row.streak_count || 0;
        const lastStudied = row.last_studied || null;

        // Build course progress breakdown
        const courseProgress: Record<string, StudentCourseProgress> = {};
        courses.forEach((c) => {
          const cCompleted = (courseCompletedCountByUser[row.user_id] || {})[c.id] || 0;
          const cTotal = courseTopicCounts[c.id] || (c.id === "python" ? 43 : 54);
          const cPercent = cTotal > 0 ? Math.min(100, Math.round((cCompleted / cTotal) * 100)) : 0;
          courseProgress[c.id] = {
            courseId: c.id,
            completedTopicsCount: cCompleted,
            totalTopicsCount: cTotal,
            progressPercent: cPercent,
            courseXp: 0,
            courseLevel: 1,
            courseBadgesCount: 0,
          };
        });

        return {
          userId: row.user_id,
          loginId,
          cohort,
          completedTopicsCount: globalCompleted,
          totalTopicsCount: total,
          progressPercent,
          level,
          xp,
          badgesCount,
          streakCount,
          lastStudied,
          courseProgress,
        };
      });

      setStudents(summaryList);
    } catch (err: any) {
      console.error("Admin data load error:", err);
      setError(err?.message || "데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoadingData(false);
    }
  }, [user, isConfigured, supabase, courses, courseTopicCounts, totalTopicsCount]);

  // Initial Auth Check
  useEffect(() => {
    if (!authLoading) {
      checkAdminAuth();
    }
  }, [authLoading, checkAdminAuth]);

  // When authorized, load student data
  useEffect(() => {
    if (isAuthorizedAdmin) {
      loadAdminData();
    }
  }, [isAuthorizedAdmin, loadAdminData]);

  // Unique cohorts list for filter tabs
  const cohorts = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => set.add(s.cohort));
    return Array.from(set).sort();
  }, [students]);

  // Filtered and Sorted Students
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // 1. Cohort Filter
    if (selectedCohort !== "ALL") {
      result = result.filter((s) => s.cohort === selectedCohort);
    }

    // 2. Search Query (ID or User ID)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (s) => s.loginId.toLowerCase().includes(q) || s.userId.toLowerCase().includes(q)
      );
    }

    // 3. Sorting
    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === "pythonPercent") {
        aVal = a.courseProgress?.["python"]?.progressPercent || 0;
        bVal = b.courseProgress?.["python"]?.progressPercent || 0;
      } else if (sortField === "financePercent") {
        aVal = a.courseProgress?.["finance"]?.progressPercent || 0;
        bVal = b.courseProgress?.["finance"]?.progressPercent || 0;
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }

      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";

      if (typeof aVal === "string") {
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === "asc" ? cmp : -cmp;
      } else {
        const cmp = (aVal as number) - (bVal as number);
        return sortDirection === "asc" ? cmp : -cmp;
      }
    });

    return result;
  }, [students, selectedCohort, searchQuery, sortField, sortDirection]);

  // Summary Metrics for KPI Cards
  const kpiMetrics = useMemo(() => {
    const totalStudentsCount = students.length;
    if (totalStudentsCount === 0) {
      return {
        totalStudentsCount: 0,
        avgGlobalProgress: 0,
        avgPythonProgress: 0,
        avgFinanceProgress: 0,
        avgLevel: 1,
        activeTodayCount: 0,
      };
    }

    const today = new Date().toISOString().split("T")[0];
    const sumGlobalProgress = students.reduce((acc, s) => acc + s.progressPercent, 0);
    const sumPythonProgress = students.reduce(
      (acc, s) => acc + (s.courseProgress?.["python"]?.progressPercent || 0),
      0
    );
    const sumFinanceProgress = students.reduce(
      (acc, s) => acc + (s.courseProgress?.["finance"]?.progressPercent || 0),
      0
    );
    const sumLevel = students.reduce((acc, s) => acc + s.level, 0);
    const activeToday = students.filter((s) => s.lastStudied === today).length;

    return {
      totalStudentsCount,
      avgGlobalProgress: Math.round(sumGlobalProgress / totalStudentsCount),
      avgPythonProgress: Math.round(sumPythonProgress / totalStudentsCount),
      avgFinanceProgress: Math.round(sumFinanceProgress / totalStudentsCount),
      avgLevel: (sumLevel / totalStudentsCount).toFixed(1),
      activeTodayCount: activeToday,
    };
  }, [students]);

  // Handle Sort Change
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredStudents.length === 0) return;

    const headers = [
      "아이디",
      "기수",
      "통합 진도율(%)",
      "통합 완료 토픽",
      "파이썬 진도율(%)",
      "파이썬 완료",
      "금융 진도율(%)",
      "금융 완료",
      "통합 레벨",
      "통합 XP",
      "배지 수",
      "연속 학습일",
      "최근 학습일",
      "User ID",
    ];

    const rows = filteredStudents.map((s) => [
      s.loginId,
      s.cohort,
      `${s.progressPercent}%`,
      `${s.completedTopicsCount}/${s.totalTopicsCount}`,
      `${s.courseProgress?.["python"]?.progressPercent || 0}%`,
      `${s.courseProgress?.["python"]?.completedTopicsCount || 0}/${s.courseProgress?.["python"]?.totalTopicsCount || 43}`,
      `${s.courseProgress?.["finance"]?.progressPercent || 0}%`,
      `${s.courseProgress?.["finance"]?.completedTopicsCount || 0}/${s.courseProgress?.["finance"]?.totalTopicsCount || 54}`,
      `Lv.${s.level}`,
      s.xp,
      s.badgesCount,
      `${s.streakCount}일`,
      s.lastStudied || "학습 이력 없음",
      s.userId,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `kdt_students_progress_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Loading State
  if (authLoading || isAdminChecking) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          관리자 권한을 확인하고 있습니다...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated
  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center mx-auto border border-purple-200 dark:border-purple-800">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            관리자 로그인이 필요합니다
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

  // 3. Unauthorized
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
            현재 계정(<strong>{user.email}</strong>)은 관리자 권한이 등록되어 있지 않습니다.
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
              수강생 통합 학습 현황 대시보드
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            수강생들의 파이썬·디지털 금융 실시간 토픽 진도율, 통합 레벨, 배지 수집 및 연속 학습일을 한눈에 조회합니다. (전체 {totalTopicsCount}개 토픽 기준)
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
            onClick={handleExportCsv}
            disabled={filteredStudents.length === 0}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV 다운로드 ({filteredStudents.length}명)</span>
          </button>
        </div>
      </div>

      {/* Error / Fallback Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>데이터 조회 알림:</span>
          </div>
          <p className="pl-6 font-mono leading-relaxed">{error}</p>
        </div>
      )}

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Students */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>총 수강생</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
            {kpiMetrics.totalStudentsCount}명
          </div>
          <p className="text-[10px] text-slate-400">등록 계정 기준</p>
        </div>

        {/* Avg Global Progress */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>통합 평균 진도율</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-teal-600 dark:text-teal-400">
            {kpiMetrics.avgGlobalProgress}%
          </div>
          <p className="text-[10px] text-slate-400">전 과목 합산</p>
        </div>

        {/* Avg Python Progress */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-emerald-600" />
            <span>파이썬 평균 진도</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            {kpiMetrics.avgPythonProgress}%
          </div>
          <p className="text-[10px] text-slate-400">파이썬 7개 트랙</p>
        </div>

        {/* Avg Finance Progress */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Landmark className="w-3.5 h-3.5 text-amber-600" />
            <span>금융 평균 진도</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
            {kpiMetrics.avgFinanceProgress}%
          </div>
          <p className="text-[10px] text-slate-400">금융 9개 트랙</p>
        </div>

        {/* Avg Level */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>통합 평균 레벨</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
            Lv.{kpiMetrics.avgLevel}
          </div>
          <p className="text-[10px] text-slate-400">전체 누적 XP 기준</p>
        </div>

        {/* Active Today */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-600" />
            <span>오늘 학습 수강생</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-orange-600 dark:text-orange-400">
            {kpiMetrics.activeTodayCount}명
          </div>
          <p className="text-[10px] text-slate-400">당일 학습 접속</p>
        </div>
      </div>

      {/* 3. Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Cohort Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedCohort("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCohort === "ALL"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            전체 기수 ({students.length})
          </button>

          {cohorts.map((c) => {
            const count = students.filter((s) => s.cohort === c).length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCohort(c)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCohort === c
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {c} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="아이디 검색 (예: DF08001)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* 4. Student Data Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                {/* ID */}
                <th
                  onClick={() => handleSort("loginId")}
                  className="px-5 py-4 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>수강생 ID</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>

                {/* Cohort */}
                <th
                  onClick={() => handleSort("cohort")}
                  className="px-4 py-4 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>기수</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>

                {/* Unified Progress */}
                <th
                  onClick={() => handleSort("progressPercent")}
                  className="px-4 py-4 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>통합 진도율</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>

                {/* Python Progress */}
                <th
                  onClick={() => handleSort("pythonPercent")}
                  className="px-4 py-4 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-emerald-500" />
                    <span>파이썬 진도</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>

                {/* Finance Progress */}
                <th
                  onClick={() => handleSort("financePercent")}
                  className="px-4 py-4 cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <Landmark className="w-3 h-3 text-amber-500" />
                    <span>금융 진도</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>

                {/* Level / XP */}
                <th
                  onClick={() => handleSort("xp")}
                  className="px-4 py-4 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>통합 레벨 · XP</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>

                {/* Badges */}
                <th
                  onClick={() => handleSort("badgesCount")}
                  className="px-4 py-4 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 select-none whitespace-nowrap text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>배지</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>

                {/* Streak */}
                <th
                  onClick={() => handleSort("streakCount")}
                  className="px-4 py-4 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 select-none whitespace-nowrap text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>연속 학습</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>

                {/* Last Studied */}
                <th
                  onClick={() => handleSort("lastStudied")}
                  className="px-5 py-4 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>최근 학습일</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    {loadingData ? "데이터를 불러오는 중입니다..." : "조회된 수강생이 없습니다."}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const pyProg = student.courseProgress?.["python"] || { completedTopicsCount: 0, totalTopicsCount: 43, progressPercent: 0 };
                  const fnProg = student.courseProgress?.["finance"] || { completedTopicsCount: 0, totalTopicsCount: 54, progressPercent: 0 };

                  return (
                    <tr
                      key={student.userId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* ID */}
                      <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {student.loginId}
                      </td>

                      {/* Cohort */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono text-[11px] font-bold">
                          {student.cohort}
                        </span>
                      </td>

                      {/* Unified Progress */}
                      <td className="px-4 py-4 whitespace-nowrap min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {student.progressPercent}%
                            </span>
                            <span className="text-slate-400">
                              {student.completedTopicsCount}/{student.totalTopicsCount}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${student.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Python Progress */}
                      <td className="px-4 py-4 whitespace-nowrap min-w-[120px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {pyProg.progressPercent}%
                            </span>
                            <span className="text-slate-400">
                              {pyProg.completedTopicsCount}/{pyProg.totalTopicsCount}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pyProg.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Finance Progress */}
                      <td className="px-4 py-4 whitespace-nowrap min-w-[120px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              {fnProg.progressPercent}%
                            </span>
                            <span className="text-slate-400">
                              {fnProg.completedTopicsCount}/{fnProg.totalTopicsCount}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${fnProg.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Level & XP */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold font-mono text-purple-600 dark:text-purple-400 text-xs">
                            Lv.{student.level}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            ({student.xp.toLocaleString()} XP)
                          </span>
                        </div>
                      </td>

                      {/* Badges */}
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                          <Award className="w-3.5 h-3.5" />
                          {student.badgesCount}
                        </span>
                      </td>

                      {/* Streak */}
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-orange-600 dark:text-orange-400 text-xs">
                          <Flame className="w-3.5 h-3.5" />
                          {student.streakCount}일
                        </span>
                      </td>

                      {/* Last Studied */}
                      <td className="px-5 py-4 whitespace-nowrap font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {student.lastStudied ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {student.lastStudied}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Stats */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            총 <strong>{students.length}</strong>명의 수강생 중 <strong>{filteredStudents.length}</strong>명 표시 중
          </span>
          <span className="text-[11px]">
            ※ 진도율 및 레벨은 수강생 활동 시 실시간 자동 반영됩니다.
          </span>
        </div>
      </div>
    </div>
  );
}
