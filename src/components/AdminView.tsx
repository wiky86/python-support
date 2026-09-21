"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Course } from "@/types/content";
import {
  AdminUserListRow,
  UserProgressRow,
  UserBadgeRow,
  UserDiagnosticRow,
  DiagnosticRetakeGrantRow,
  StudentSummary,
  StudentCourseProgress,
} from "@/types/database";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { getLevel } from "@/lib/gamification";
import { getDiagnosticGrade } from "@/lib/progress";
import {
  Users,
  Search,
  Download,
  Flame,
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw,
  Layers,
  Terminal,
  Landmark,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  BarChart3,
  HelpCircle,
  RotateCcw,
  X,
  ChevronRight,
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
  | "pythonPercent"
  | "financePercent"
  | "pythonDiag"
  | "financeDiag"
  | "xp"
  | "badgesCount"
  | "streakCount"
  | "lastStudied";

type SortOrder = "asc" | "desc";

function extractCohort(loginId: string): string {
  if (!loginId) return "OTHER";
  const upper = loginId.toUpperCase().trim();
  const match = upper.match(/^[A-Z]+[0-9]+/);
  if (match) {
    return match[0];
  }
  return "OTHER";
}

export function AdminView({
  courses,
  courseTopicCounts,
  totalTopicsCount,
}: AdminViewProps) {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  // State Management
  const [isAdminChecking, setIsAdminChecking] = useState(true);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState<boolean | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [diagnosticsMap, setDiagnosticsMap] = useState<Record<string, Record<string, UserDiagnosticRow>>>({});
  const [grantsMap, setGrantsMap] = useState<Record<string, Record<string, DiagnosticRetakeGrantRow>>>({});
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"students" | "cohorts">("students");

  // Filtering & Sorting
  const [selectedCohort, setSelectedCohort] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("loginId");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Modal State for individual diagnostic breakdown
  const [selectedDiagDetail, setSelectedDiagDetail] = useState<{
    student: StudentSummary;
    courseId: string;
    diag: UserDiagnosticRow;
  } | null>(null);

  // Grant action state
  const [grantingState, setGrantingState] = useState<Record<string, boolean>>({});

  // 1. Verify Admin Status
  const checkAdminAuth = useCallback(async () => {
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

  // 2. Load all student & diagnostic data
  const loadAdminData = useCallback(async () => {
    if (!user || !isConfigured) return;

    setLoadingData(true);
    setError(null);

    try {
      const [userListRes, progressRes, badgesRes, diagRes, grantsRes] = await Promise.all([
        (supabase.from("admin_user_list") as any).select("*"),
        (supabase.from("user_progress") as any).select("*"),
        (supabase.from("user_badges") as any).select("*"),
        (supabase.from("user_diagnostics") as any).select("*"),
        (supabase.from("diagnostic_retake_grants") as any).select("*"),
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
        } else {
          throw new Error(`수강생 목록 조회 실패: ${userListRes.error.message}`);
        }
      } else {
        userList = (userListRes.data || []) as AdminUserListRow[];
      }

      const allProgress = (progressRes.data || []) as UserProgressRow[];
      const allBadges = (badgesRes.data || []) as UserBadgeRow[];
      const allDiagnostics = (diagRes.data || []) as UserDiagnosticRow[];
      const allGrants = (grantsRes.data || []) as DiagnosticRetakeGrantRow[];

      // Map diagnostics: user_id -> course -> UserDiagnosticRow
      const dMap: Record<string, Record<string, UserDiagnosticRow>> = {};
      allDiagnostics.forEach((d) => {
        if (!dMap[d.user_id]) dMap[d.user_id] = {};
        dMap[d.user_id][d.course] = d;
      });
      setDiagnosticsMap(dMap);

      // Map grants: user_id -> course -> DiagnosticRetakeGrantRow
      const gMap: Record<string, Record<string, DiagnosticRetakeGrantRow>> = {};
      allGrants.forEach((g) => {
        if (!gMap[g.user_id]) gMap[g.user_id] = {};
        gMap[g.user_id][g.course] = g;
      });
      setGrantsMap(gMap);

      // Index progress
      const completedCountByUser: Record<string, number> = {};
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

      // Index badges
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
          diagnostics: dMap[row.user_id] || {},
          diagnosticGrants: gMap[row.user_id] || {},
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

  useEffect(() => {
    if (!authLoading) checkAdminAuth();
  }, [authLoading, checkAdminAuth]);

  useEffect(() => {
    if (isAuthorizedAdmin) loadAdminData();
  }, [isAuthorizedAdmin, loadAdminData]);

  // Grant retake action
  const handleGrantRetake = async (studentId: string, courseId: string) => {
    if (!user) return;
    const key = `${studentId}_${courseId}`;
    setGrantingState((prev) => ({ ...prev, [key]: true }));

    try {
      const { error: gErr } = await (supabase.from("diagnostic_retake_grants") as any).upsert(
        {
          user_id: studentId,
          course: courseId,
          granted_by: user.id,
          granted_at: new Date().toISOString(),
          consumed: false,
        },
        { onConflict: "user_id,course" }
      );

      if (gErr) throw gErr;

      // Update local state
      setGrantsMap((prev) => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          [courseId]: {
            user_id: studentId,
            course: courseId,
            granted_by: user.id,
            granted_at: new Date().toISOString(),
            consumed: false,
          },
        },
      }));
    } catch (err: any) {
      console.error("Grant retake error:", err);
      alert(`재응시 권한 부여 실패: ${err.message}`);
    } finally {
      setGrantingState((prev) => ({ ...prev, [key]: false }));
    }
  };

  const cohorts = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => set.add(s.cohort));
    return Array.from(set).sort();
  }, [students]);

  // Filter & Sort
  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (selectedCohort !== "ALL") {
      result = result.filter((s) => s.cohort === selectedCohort);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase().trim();
      result = result.filter((s) => s.loginId.includes(q));
    }

    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "loginId":
          aVal = a.loginId;
          bVal = b.loginId;
          break;
        case "cohort":
          aVal = a.cohort;
          bVal = b.cohort;
          break;
        case "progressPercent":
          aVal = a.progressPercent;
          bVal = b.progressPercent;
          break;
        case "pythonPercent":
          aVal = a.courseProgress?.["python"]?.progressPercent || 0;
          bVal = b.courseProgress?.["python"]?.progressPercent || 0;
          break;
        case "financePercent":
          aVal = a.courseProgress?.["finance"]?.progressPercent || 0;
          bVal = b.courseProgress?.["finance"]?.progressPercent || 0;
          break;
        case "pythonDiag":
          aVal = diagnosticsMap[a.userId]?.["python"]?.total_score ?? -1;
          bVal = diagnosticsMap[b.userId]?.["python"]?.total_score ?? -1;
          break;
        case "financeDiag":
          aVal = diagnosticsMap[a.userId]?.["finance"]?.total_score ?? -1;
          bVal = diagnosticsMap[b.userId]?.["finance"]?.total_score ?? -1;
          break;
        case "xp":
          aVal = a.xp;
          bVal = b.xp;
          break;
        case "badgesCount":
          aVal = a.badgesCount;
          bVal = b.badgesCount;
          break;
        case "streakCount":
          aVal = a.streakCount;
          bVal = b.streakCount;
          break;
        case "lastStudied":
          aVal = a.lastStudied || "";
          bVal = b.lastStudied || "";
          break;
        default:
          aVal = a.loginId;
          bVal = b.loginId;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [students, selectedCohort, searchQuery, sortField, sortOrder, diagnosticsMap]);

  // KPI Metrics
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
        diagTakenPython: 0,
        diagTakenFinance: 0,
      };
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const totalGlobalProg = students.reduce((acc, s) => acc + s.progressPercent, 0);
    const totalPyProg = students.reduce((acc, s) => acc + (s.courseProgress?.["python"]?.progressPercent || 0), 0);
    const totalFnProg = students.reduce((acc, s) => acc + (s.courseProgress?.["finance"]?.progressPercent || 0), 0);
    const totalLevels = students.reduce((acc, s) => acc + s.level, 0);
    const activeToday = students.filter((s) => s.lastStudied === todayStr).length;

    let pyDiagCount = 0;
    let fnDiagCount = 0;
    students.forEach((s) => {
      if (diagnosticsMap[s.userId]?.["python"]) pyDiagCount += 1;
      if (diagnosticsMap[s.userId]?.["finance"]) fnDiagCount += 1;
    });

    return {
      totalStudentsCount,
      avgGlobalProgress: Math.round(totalGlobalProg / totalStudentsCount),
      avgPythonProgress: Math.round(totalPyProg / totalStudentsCount),
      avgFinanceProgress: Math.round(totalFnProg / totalStudentsCount),
      avgLevel: Math.round((totalLevels / totalStudentsCount) * 10) / 10,
      activeTodayCount: activeToday,
      diagTakenPython: pyDiagCount,
      diagTakenFinance: fnDiagCount,
    };
  }, [students, diagnosticsMap]);

  // Cohort Analytics Summary
  const cohortAnalytics = useMemo(() => {
    const map: Record<string, {
      cohort: string;
      studentCount: number;
      pythonDiags: UserDiagnosticRow[];
      financeDiags: UserDiagnosticRow[];
      avgPythonScore: number;
      avgFinanceScore: number;
      pythonTrackAverages: Record<string, number>;
      financeTrackAverages: Record<string, number>;
    }> = {};

    cohorts.forEach((c) => {
      map[c] = {
        cohort: c,
        studentCount: 0,
        pythonDiags: [],
        financeDiags: [],
        avgPythonScore: 0,
        avgFinanceScore: 0,
        pythonTrackAverages: {},
        financeTrackAverages: {},
      };
    });

    students.forEach((s) => {
      const cObj = map[s.cohort];
      if (!cObj) return;
      cObj.studentCount += 1;

      const pyDiag = diagnosticsMap[s.userId]?.["python"];
      if (pyDiag) cObj.pythonDiags.push(pyDiag);

      const fnDiag = diagnosticsMap[s.userId]?.["finance"];
      if (fnDiag) cObj.financeDiags.push(fnDiag);
    });

    // Calculate averages
    Object.values(map).forEach((cObj) => {
      // Python
      if (cObj.pythonDiags.length > 0) {
        const sumTotal = cObj.pythonDiags.reduce((a, b) => a + (b.total_score || 0), 0);
        cObj.avgPythonScore = Math.round((sumTotal / cObj.pythonDiags.length) * 100);

        const trackSums: Record<string, { sum: number; count: number }> = {};
        cObj.pythonDiags.forEach((d) => {
          Object.entries(d.track_scores || {}).forEach(([tId, score]) => {
            if (!trackSums[tId]) trackSums[tId] = { sum: 0, count: 0 };
            trackSums[tId].sum += score;
            trackSums[tId].count += 1;
          });
        });

        Object.entries(trackSums).forEach(([tId, data]) => {
          cObj.pythonTrackAverages[tId] = Math.round((data.sum / data.count) * 100);
        });
      }

      // Finance
      if (cObj.financeDiags.length > 0) {
        const sumTotal = cObj.financeDiags.reduce((a, b) => a + (b.total_score || 0), 0);
        cObj.avgFinanceScore = Math.round((sumTotal / cObj.financeDiags.length) * 100);

        const trackSums: Record<string, { sum: number; count: number }> = {};
        cObj.financeDiags.forEach((d) => {
          Object.entries(d.track_scores || {}).forEach(([tId, score]) => {
            if (!trackSums[tId]) trackSums[tId] = { sum: 0, count: 0 };
            trackSums[tId].sum += score;
            trackSums[tId].count += 1;
          });
        });

        Object.entries(trackSums).forEach(([tId, data]) => {
          cObj.financeTrackAverages[tId] = Math.round((data.sum / data.count) * 100);
        });
      }
    });

    return Object.values(map);
  }, [cohorts, students, diagnosticsMap]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (filteredStudents.length === 0) return;

    const headers = [
      "아이디",
      "기수",
      "통합진도율(%)",
      "완료토픽수",
      "파이썬진도율(%)",
      "금융진도율(%)",
      "파이썬진단(%)",
      "금융진단(%)",
      "통합레벨",
      "통합XP",
      "수집배지수",
      "연속학습일",
      "최근학습일",
    ];

    const rows = filteredStudents.map((s) => {
      const pyProg = s.courseProgress?.["python"]?.progressPercent || 0;
      const fnProg = s.courseProgress?.["finance"]?.progressPercent || 0;
      const pyDiag = diagnosticsMap[s.userId]?.["python"] ? `${Math.round(diagnosticsMap[s.userId]["python"].total_score * 100)}%` : "미응시";
      const fnDiag = diagnosticsMap[s.userId]?.["finance"] ? `${Math.round(diagnosticsMap[s.userId]["finance"].total_score * 100)}%` : "미응시";

      return [
        s.loginId,
        s.cohort,
        `${s.progressPercent}%`,
        s.completedTopicsCount,
        `${pyProg}%`,
        `${fnProg}%`,
        pyDiag,
        fnDiag,
        `Lv.${s.level}`,
        s.xp,
        s.badgesCount,
        `${s.streakCount}일`,
        s.lastStudied || "없음",
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.map((cell) => `\"${cell}\"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `kdt_students_${selectedCohort}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isAdminChecking) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-500">관리자 권한을 확인하는 중입니다...</p>
      </div>
    );
  }

  if (isAuthorizedAdmin === false) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto border border-rose-300">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">접근 권한이 없습니다</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            관리자 계정으로 등록된 사용자만 관리자 대시보드에 접근할 수 있습니다.
          </p>
        </div>
        <Link href="/" className="inline-block px-6 py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              강사 / 관리자 전용
            </span>
            <span className="text-xs text-slate-400 font-mono">UBION KDT DataLab</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            수강생 학습 진도 및 사전 진단 대시보드
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            실시간 과목 진도율, 통합 레벨, 사전 진단 강약 지도 및 재응시 권한을 관리합니다.
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

      {/* Error / Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 text-xs text-amber-800 dark:text-amber-200 space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>알림:</span>
          </div>
          <p className="pl-6 font-mono">{error}</p>
        </div>
      )}

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
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

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-emerald-600" />
            <span>파이썬 평균 진도</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            {kpiMetrics.avgPythonProgress}%
          </div>
          <p className="text-[10px] text-slate-400">진단 응시: {kpiMetrics.diagTakenPython}명</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Landmark className="w-3.5 h-3.5 text-amber-600" />
            <span>금융 평균 진도</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
            {kpiMetrics.avgFinanceProgress}%
          </div>
          <p className="text-[10px] text-slate-400">진단 응시: {kpiMetrics.diagTakenFinance}명</p>
        </div>

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

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("students")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "students"
              ? "border-purple-600 text-purple-600 dark:text-purple-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>수강생별 현황 및 재응시 관리</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cohorts")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "cohorts"
              ? "border-purple-600 text-purple-600 dark:text-purple-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>기수별 진단 경향 분석 (Cohort Analytics)</span>
        </button>
      </div>

      {/* TAB 1: STUDENTS LIST & RETAKE MANAGEMENT */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                type="button"
                onClick={() => setSelectedCohort("ALL")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCohort === "ALL"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
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
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {c} ({count})
                  </button>
                );
              })}
            </div>

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

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th onClick={() => handleSort("loginId")} className="px-5 py-4 cursor-pointer hover:text-purple-600 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>수강생 ID</span>
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                      </div>
                    </th>
                    <th onClick={() => handleSort("cohort")} className="px-4 py-4 cursor-pointer hover:text-purple-600 select-none whitespace-nowrap">
                      기수
                    </th>
                    <th onClick={() => handleSort("progressPercent")} className="px-4 py-4 cursor-pointer hover:text-purple-600 select-none whitespace-nowrap">
                      통합 진도율
                    </th>
                    <th onClick={() => handleSort("pythonPercent")} className="px-4 py-4 cursor-pointer hover:text-emerald-600 select-none whitespace-nowrap">
                      파이썬 진도
                    </th>
                    <th onClick={() => handleSort("financePercent")} className="px-4 py-4 cursor-pointer hover:text-amber-600 select-none whitespace-nowrap">
                      금융 진도
                    </th>
                    <th onClick={() => handleSort("pythonDiag")} className="px-4 py-4 cursor-pointer hover:text-emerald-600 select-none whitespace-nowrap">
                      파이썬 사전진단
                    </th>
                    <th onClick={() => handleSort("financeDiag")} className="px-4 py-4 cursor-pointer hover:text-amber-600 select-none whitespace-nowrap">
                      금융 사전진단
                    </th>
                    <th onClick={() => handleSort("xp")} className="px-4 py-4 cursor-pointer hover:text-purple-600 select-none whitespace-nowrap">
                      레벨 · XP
                    </th>
                    <th className="px-4 py-4 text-center whitespace-nowrap">연속학습</th>
                    <th className="px-5 py-4 text-right whitespace-nowrap">최근활동</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                        {loadingData ? "데이터를 불러오는 중입니다..." : "검색 조건에 일치하는 수강생이 없습니다."}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const pyProg = s.courseProgress?.["python"];
                      const fnProg = s.courseProgress?.["finance"];

                      const pyDiag = diagnosticsMap[s.userId]?.["python"];
                      const fnDiag = diagnosticsMap[s.userId]?.["finance"];

                      const pyGrant = grantsMap[s.userId]?.["python"];
                      const fnGrant = grantsMap[s.userId]?.["finance"];

                      return (
                        <tr key={s.userId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {s.loginId}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-semibold text-[11px]">
                              {s.cohort}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 w-10">
                                {s.progressPercent}%
                              </span>
                              <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-purple-600 h-full rounded-full" style={{ width: `${s.progressPercent}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap font-mono text-emerald-600 dark:text-emerald-400">
                            {pyProg ? `${pyProg.progressPercent}% (${pyProg.completedTopicsCount}/${pyProg.totalTopicsCount})` : "0%"}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap font-mono text-amber-600 dark:text-amber-400">
                            {fnProg ? `${fnProg.progressPercent}% (${fnProg.completedTopicsCount}/${fnProg.totalTopicsCount})` : "0%"}
                          </td>

                          {/* Python Diagnostic & Grant */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {pyDiag ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDiagDetail({ student: s, courseId: "python", diag: pyDiag })}
                                  className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold text-[11px] hover:underline"
                                >
                                  {Math.round(pyDiag.total_score * 100)}%
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px]">미응시</span>
                              )}

                              {pyGrant && !pyGrant.consumed ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                  대기중
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={grantingState[`${s.userId}_python`]}
                                  onClick={() => handleGrantRetake(s.userId, "python")}
                                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950 text-slate-600 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700"
                                >
                                  {grantingState[`${s.userId}_python`] ? "..." : "재응시"}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Finance Diagnostic & Grant */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {fnDiag ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDiagDetail({ student: s, courseId: "finance", diag: fnDiag })}
                                  className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono font-bold text-[11px] hover:underline"
                                >
                                  {Math.round(fnDiag.total_score * 100)}%
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px]">미응시</span>
                              )}

                              {fnGrant && !fnGrant.consumed ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                  대기중
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={grantingState[`${s.userId}_finance`]}
                                  onClick={() => handleGrantRetake(s.userId, "finance")}
                                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950 text-slate-600 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700"
                                >
                                  {grantingState[`${s.userId}_finance`] ? "..." : "재응시"}
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap font-mono">
                            <span className="font-bold text-slate-800 dark:text-slate-200">Lv.{s.level}</span>
                            <span className="text-[11px] text-slate-400 ml-1.5">({s.xp.toLocaleString()} XP)</span>
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono">
                            <span className="font-bold text-orange-600 dark:text-orange-400">{s.streakCount}일</span>
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap font-mono text-slate-400">
                            {s.lastStudied || "-"}
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
      )}

      {/* TAB 2: COHORT ANALYTICS */}
      {activeTab === "cohorts" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
            💡 <strong>기수별 진단 경향 분석:</strong> 기수별 수강생들의 사전 진단 응시 결과(jsonb track_scores)를 집계하여, 이번 기수 수강생들이 공통적으로 취약한 트랙과 강한 트랙을 첫 수업 전에 파악할 수 있습니다.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {cohortAnalytics.map((c) => (
              <div
                key={c.cohort}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-mono font-bold text-xs">
                      {c.cohort}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      기수 진단 현황 (총 {c.studentCount}명)
                    </span>
                  </div>
                </div>

                {/* Python Diagnostic Summary for this cohort */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" /> 파이썬 사전 진단 (응시 {c.pythonDiags.length}명)
                    </span>
                    <span className="font-mono font-bold text-sm text-emerald-600">
                      평균 {c.avgPythonScore}%
                    </span>
                  </div>

                  {c.pythonDiags.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {Object.entries(c.pythonTrackAverages).map(([tId, avg]) => (
                        <div key={tId} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-600 dark:text-slate-400">{tId}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${avg}%` }} />
                            </div>
                            <span className="w-8 text-right font-bold text-slate-700 dark:text-slate-300">{avg}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">아직 응시한 수강생이 없습니다.</p>
                  )}
                </div>

                {/* Finance Diagnostic Summary for this cohort */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" /> 금융 사전 진단 (응시 {c.financeDiags.length}명)
                    </span>
                    <span className="font-mono font-bold text-sm text-amber-600">
                      평균 {c.avgFinanceScore}%
                    </span>
                  </div>

                  {c.financeDiags.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {Object.entries(c.financeTrackAverages).map(([tId, avg]) => (
                        <div key={tId} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-600 dark:text-slate-400">{tId}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${avg}%` }} />
                            </div>
                            <span className="w-8 text-right font-bold text-slate-700 dark:text-slate-300">{avg}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">아직 응시한 수강생이 없습니다.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: INDIVIDUAL STUDENT DIAGNOSTIC DETAIL */}
      {selectedDiagDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-[11px] font-mono text-purple-600 font-bold uppercase">
                  {selectedDiagDetail.student.cohort} • {selectedDiagDetail.courseId.toUpperCase()} DIAGNOSTIC
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedDiagDetail.student.loginId} 훈련생 진단 분석
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDiagDetail(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <span className="text-xs text-slate-500">종합 정답률</span>
              <span className="text-2xl font-black font-mono text-purple-600">
                {Math.round(selectedDiagDetail.diag.total_score * 100)}%
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                트랙별 강약 분석
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {Object.entries(selectedDiagDetail.diag.track_scores || {}).map(([trackId, score]) => {
                  const grade = getDiagnosticGrade(score);
                  return (
                    <div
                      key={trackId}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{trackId}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${grade.badgeClass}`}>
                          {grade.label} ({Math.round(score * 100)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDiagDetail(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
