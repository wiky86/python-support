"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import { UserProgressRow, UserStatsRow, UserBadgeRow } from "@/types/database";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
  stats: UserStatsRow;
  progress: Record<string, UserProgressRow>; // Keyed by topic_id and composite `${course}:${topic_id}`
  courseProgressMap: Record<string, Record<string, UserProgressRow>>; // courseId -> topicId -> row
  badges: UserBadgeRow[];
  refreshData: () => Promise<void>;
  signOut: () => Promise<void>;
  updateTopicProgress: (
    topicId: string,
    status: "in_progress" | "completed",
    quizPassed?: boolean,
    quizScore?: number,
    courseId?: string
  ) => Promise<void>;
  saveEarnedBadges: (badgeIds: string[], courseId?: string) => Promise<void>;
  recordStudyActivity: (xpGain: number) => Promise<void>;
}

const defaultGuestStats: UserStatsRow = {
  user_id: "guest-user",
  xp: 0,
  last_studied: null,
  streak_count: 0,
  updated_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const isConfigured = isSupabaseConfigured();
  const supabase = createClient();

  const [stats, setStats] = useState<UserStatsRow>(defaultGuestStats);
  const [progress, setProgress] = useState<Record<string, UserProgressRow>>({});
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, Record<string, UserProgressRow>>>({});
  const [badges, setBadges] = useState<UserBadgeRow[]>([]);

  // Refs to avoid state closures and dependency cycle loops
  const userRef = useRef<User | null>(null);
  const statsRef = useRef<UserStatsRow>(defaultGuestStats);
  const progressRef = useRef<Record<string, UserProgressRow>>({});
  const courseProgressMapRef = useRef<Record<string, Record<string, UserProgressRow>>>({});
  const badgesRef = useRef<UserBadgeRow[]>([]);
  const isFetchingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    courseProgressMapRef.current = courseProgressMap;
  }, [courseProgressMap]);

  useEffect(() => {
    badgesRef.current = badges;
  }, [badges]);

  // Helper to build both flat map and nested course map from progress rows
  const buildProgressMaps = (rows: UserProgressRow[]) => {
    const flat: Record<string, UserProgressRow> = {};
    const nested: Record<string, Record<string, UserProgressRow>> = {};

    rows.forEach((row) => {
      const c = row.course || "python";
      flat[row.topic_id] = row;
      flat[`${c}:${row.topic_id}`] = row;

      if (!nested[c]) {
        nested[c] = {};
      }
      nested[c][row.topic_id] = row;
    });

    return { flat, nested };
  };

  // Core Data Fetcher: Loads data for a given userId (Supabase) or guest (LocalStorage)
  const fetchUserData = useCallback(
    async (userId: string | null) => {
      if (!isConfigured || !userId) {
        setIsAdmin(false);
        // Guest Mode
        if (typeof window !== "undefined") {
          try {
            const savedStats = localStorage.getItem("guest_user_stats");
            const savedProgress = localStorage.getItem("guest_user_progress");
            const savedBadges = localStorage.getItem("guest_user_badges");
            const parsedStats = savedStats ? JSON.parse(savedStats) : defaultGuestStats;
            const parsedRows: UserProgressRow[] = savedProgress ? (Array.isArray(JSON.parse(savedProgress)) ? JSON.parse(savedProgress) : Object.values(JSON.parse(savedProgress))) : [];
            const parsedBadges = savedBadges ? JSON.parse(savedBadges) : [];

            const { flat, nested } = buildProgressMaps(parsedRows);
            setStats(parsedStats);
            setProgress(flat);
            setCourseProgressMap(nested);
            setBadges(parsedBadges);
          } catch {
            setStats(defaultGuestStats);
            setProgress({});
            setCourseProgressMap({});
            setBadges([]);
          }
        }
        return;
      }

      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const [statsRes, progressRes, badgeRes, adminRes] = await Promise.all([
          supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("user_progress").select("*").eq("user_id", userId),
          supabase.from("user_badges").select("*").eq("user_id", userId),
          (supabase.from("admins") as any).select("user_id").eq("user_id", userId).maybeSingle(),
        ]);

        // 0. Admin Status
        setIsAdmin(!!(adminRes?.data as any)?.user_id);

        // 1. Stats
        if (statsRes.data) {
          setStats(statsRes.data as UserStatsRow);
        } else if (!statsRes.error) {
          const initialStats: UserStatsRow = {
            user_id: userId,
            xp: 0,
            last_studied: null,
            streak_count: 0,
            updated_at: new Date().toISOString(),
          };
          supabase.from("user_stats").upsert(initialStats as any, { onConflict: "user_id" }).then();
          setStats(initialStats);
        }

        // 2. Progress
        if (progressRes.data) {
          const rows = progressRes.data as UserProgressRow[];
          const { flat, nested } = buildProgressMaps(rows);
          setProgress(flat);
          setCourseProgressMap(nested);
        } else {
          setProgress({});
          setCourseProgressMap({});
        }

        // 3. Badges
        if (badgeRes.data) {
          setBadges(badgeRes.data as UserBadgeRow[]);
        } else {
          setBadges([]);
        }
      } catch (err) {
        console.error("Error fetching user data from Supabase:", err);
      } finally {
        isFetchingRef.current = false;
      }
    },
    [isConfigured, supabase]
  );

  // Initial Auth & Session listener
  useEffect(() => {
    let isMounted = true;

    if (!isConfigured) {
      setLoading(false);
      fetchUserData(null);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        fetchUserData(currentUser ? currentUser.id : null).finally(() => {
          if (isMounted) setLoading(false);
        });
      })
      .catch((err) => {
        console.error("Error getting session:", err);
        if (isMounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      await fetchUserData(currentUser ? currentUser.id : null);
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured, supabase, fetchUserData]);

  // Refresh data explicitly without causing re-render loops
  const refreshData = useCallback(async () => {
    const currentUserId = userRef.current?.id || null;
    await fetchUserData(currentUserId);
  }, [fetchUserData]);

  // Sign out
  const signOut = useCallback(async () => {
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsAdmin(false);
    setStats(defaultGuestStats);
    setProgress({});
    setCourseProgressMap({});
    setBadges([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("guest_user_stats");
      localStorage.removeItem("guest_user_progress");
      localStorage.removeItem("guest_user_badges");
    }
  }, [isConfigured, supabase]);

  // Update Topic or Project Progress
  const updateTopicProgress = useCallback(
    async (
      topicId: string,
      status: "in_progress" | "completed",
      quizPassed = false,
      quizScore?: number,
      courseId: string = "python"
    ) => {
      const activeUser = userRef.current;
      const currentProgress = progressRef.current;
      const existing = currentProgress[`${courseId}:${topicId}`] || currentProgress[topicId];

      const finalScore =
        existing?.quiz_score !== null && existing?.quiz_score !== undefined
          ? existing.quiz_score
          : quizScore !== undefined
          ? quizScore
          : null;

      const finalPassed = existing?.quiz_passed || quizPassed;
      const finalStatus = existing?.status === "completed" ? "completed" : status;
      const nowIso = new Date().toISOString();

      const updatedRow: UserProgressRow = {
        user_id: activeUser ? activeUser.id : "guest-user",
        course: courseId,
        topic_id: topicId,
        status: finalStatus,
        quiz_passed: finalPassed,
        quiz_score: finalScore,
        completed_at: finalStatus === "completed" ? (existing?.completed_at || nowIso) : null,
        updated_at: nowIso,
      };

      setProgress((prev) => {
        const next = {
          ...prev,
          [topicId]: updatedRow,
          [`${courseId}:${topicId}`]: updatedRow,
        };
        return next;
      });

      setCourseProgressMap((prev) => {
        const nextCourse = { ...(prev[courseId] || {}), [topicId]: updatedRow };
        return { ...prev, [courseId]: nextCourse };
      });

      if (!activeUser && typeof window !== "undefined") {
        try {
          const savedProgress = localStorage.getItem("guest_user_progress");
          const parsed: UserProgressRow[] = savedProgress ? (Array.isArray(JSON.parse(savedProgress)) ? JSON.parse(savedProgress) : Object.values(JSON.parse(savedProgress))) : [];
          const filtered = parsed.filter((r) => !(r.course === courseId && r.topic_id === topicId));
          filtered.push(updatedRow);
          localStorage.setItem("guest_user_progress", JSON.stringify(filtered));
        } catch (e) {
          console.error("Localstorage progress save error:", e);
        }
      }

      if (activeUser && isConfigured) {
        await supabase
          .from("user_progress")
          .upsert(updatedRow as any, { onConflict: "user_id,course,topic_id" });
      }
    },
    [isConfigured, supabase]
  );

  // Save Earned Badges
  const saveEarnedBadges = useCallback(
    async (badgeIds: string[], courseId: string = "global") => {
      if (!badgeIds || badgeIds.length === 0) return;
      const activeUser = userRef.current;
      const nowIso = new Date().toISOString();
      const newBadgeRows: UserBadgeRow[] = badgeIds.map((id) => ({
        user_id: activeUser ? activeUser.id : "guest-user",
        course: courseId,
        badge_id: id,
        earned_at: nowIso,
      }));

      setBadges((prev) => {
        const merged = [...prev];
        newBadgeRows.forEach((nb) => {
          if (!merged.some((b) => b.badge_id === nb.badge_id && b.course === nb.course)) {
            merged.push(nb);
          }
        });
        if (!activeUser && typeof window !== "undefined") {
          localStorage.setItem("guest_user_badges", JSON.stringify(merged));
        }
        return merged;
      });

      if (activeUser && isConfigured) {
        await supabase
          .from("user_badges")
          .upsert(newBadgeRows as any, { onConflict: "user_id,course,badge_id" });
      }
    },
    [isConfigured, supabase]
  );

  // Record Study Activity (XP and Streak Calculation)
  const recordStudyActivity = useCallback(
    async (xpGain: number) => {
      const activeUser = userRef.current;
      const currentStats = statsRef.current;
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      let newStreak = currentStats.streak_count;

      if (!currentStats.last_studied) {
        newStreak = 1;
      } else if (currentStats.last_studied === today) {
        newStreak = currentStats.streak_count || 1;
      } else {
        const lastDate = new Date(currentStats.last_studied);
        const currentDate = new Date(today);
        const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak = (currentStats.streak_count || 0) + 1;
        } else {
          newStreak = 1;
        }
      }

      const updatedStats: UserStatsRow = {
        user_id: activeUser ? activeUser.id : "guest-user",
        xp: (currentStats.xp || 0) + xpGain,
        last_studied: today,
        streak_count: newStreak,
        updated_at: new Date().toISOString(),
      };

      setStats(updatedStats);

      if (activeUser && isConfigured) {
        await supabase
          .from("user_stats")
          .upsert(updatedStats as any, { onConflict: "user_id" });
      } else if (typeof window !== "undefined") {
        localStorage.setItem("guest_user_stats", JSON.stringify(updatedStats));
      }
    },
    [isConfigured, supabase]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isConfigured,
        stats,
        progress,
        courseProgressMap,
        badges,
        refreshData,
        signOut,
        updateTopicProgress,
        saveEarnedBadges,
        recordStudyActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
