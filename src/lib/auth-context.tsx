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

export function inferCourseFromTopic(topicId: string): string {
  if (!topicId) return "python";
  if (
    topicId.startsWith("track8.") ||
    topicId.startsWith("track9.") ||
    topicId.includes("banking") ||
    topicId.includes("fintech") ||
    topicId.includes("mydata") ||
    topicId.includes("financial") ||
    topicId.includes("risk") ||
    topicId.includes("digital-assets") ||
    topicId.includes("deposit") ||
    topicId.includes("payment") ||
    topicId.includes("settlement") ||
    topicId.includes("fx-") ||
    topicId.includes("market") ||
    topicId.includes("ipo") ||
    topicId.includes("stock") ||
    topicId.includes("etf") ||
    topicId.includes("bond") ||
    topicId.includes("yield") ||
    topicId.includes("credit") ||
    topicId.includes("statements") ||
    topicId.includes("profitability") ||
    topicId.includes("stability") ||
    topicId.includes("dart-") ||
    topicId.includes("proptech") ||
    topicId.includes("real-estate") ||
    topicId.includes("daps") ||
    topicId.includes("spatial") ||
    topicId.includes("blockchain") ||
    topicId.includes("smart-contracts") ||
    topicId.includes("defi") ||
    topicId.includes("cbdc") ||
    topicId.includes("sto-") ||
    topicId.includes("crypto") ||
    topicId.includes("derivative") ||
    topicId.includes("futures") ||
    topicId.includes("option") ||
    topicId.includes("greeks") ||
    topicId.includes("swap") ||
    topicId.includes("two-faces")
  ) {
    return "finance";
  }
  return "python";
}

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
      const c = row.course || inferCourseFromTopic(row.topic_id);
      const fixedRow: UserProgressRow = {
        ...row,
        course: c,
      };
      flat[row.topic_id] = fixedRow;
      flat[`${c}:${row.topic_id}`] = fixedRow;

      if (!nested[c]) {
        nested[c] = {};
      }
      nested[c][row.topic_id] = fixedRow;
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
            statsRef.current = parsedStats;
            progressRef.current = flat;
            courseProgressMapRef.current = nested;
            badgesRef.current = parsedBadges;

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
          statsRef.current = statsRes.data as UserStatsRow;
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
          statsRef.current = initialStats;
          setStats(initialStats);
        }

        // 2. Progress (with local fallback merge)
        let rows = (progressRes.data as UserProgressRow[]) || [];
        const cachedKey = `user_progress_${userId}`;
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem(cachedKey);
            if (raw) {
              const cachedRows: UserProgressRow[] = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : Object.values(JSON.parse(raw));
              const mergedMap: Record<string, UserProgressRow> = {};
              [...rows, ...cachedRows].forEach((r) => {
                const k = `${r.course || inferCourseFromTopic(r.topic_id)}:${r.topic_id}`;
                const ex = mergedMap[k];
                if (!ex || (r.status === "completed" && ex.status !== "completed") || (r.quiz_passed && !ex.quiz_passed)) {
                  mergedMap[k] = r;
                }
              });
              rows = Object.values(mergedMap);
            }
          } catch {}
        }

        const { flat, nested } = buildProgressMaps(rows);
        progressRef.current = flat;
        courseProgressMapRef.current = nested;
        setProgress(flat);
        setCourseProgressMap(nested);

        // 3. Badges
        if (badgeRes.data) {
          badgesRef.current = badgeRes.data as UserBadgeRow[];
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
    statsRef.current = defaultGuestStats;
    progressRef.current = {};
    courseProgressMapRef.current = {};
    badgesRef.current = [];
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
      courseId?: string
    ) => {
      const activeUser = userRef.current;
      const currentProgress = progressRef.current;
      const finalCourseId = courseId || inferCourseFromTopic(topicId);
      const existing =
        currentProgress[`${finalCourseId}:${topicId}`] || currentProgress[topicId];

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
        course: finalCourseId,
        topic_id: topicId,
        status: finalStatus,
        quiz_passed: finalPassed,
        quiz_score: finalScore,
        completed_at: finalStatus === "completed" ? (existing?.completed_at || nowIso) : null,
        updated_at: nowIso,
      };

      // 1. Synchronously update memory refs immediately
      const nextFlat = {
        ...progressRef.current,
        [topicId]: updatedRow,
        [`${finalCourseId}:${topicId}`]: updatedRow,
      };
      progressRef.current = nextFlat;

      const nextNested = {
        ...courseProgressMapRef.current,
        [finalCourseId]: {
          ...(courseProgressMapRef.current[finalCourseId] || {}),
          [topicId]: updatedRow,
        },
      };
      courseProgressMapRef.current = nextNested;

      // 2. Update React states
      setProgress(nextFlat);
      setCourseProgressMap(nextNested);

      // 3. Save to localStorage (both guest & fallback cache for user)
      if (typeof window !== "undefined") {
        try {
          const key = activeUser ? `user_progress_${activeUser.id}` : "guest_user_progress";
          const savedProgress = localStorage.getItem(key);
          const parsed: UserProgressRow[] = savedProgress
            ? Array.isArray(JSON.parse(savedProgress))
              ? JSON.parse(savedProgress)
              : Object.values(JSON.parse(savedProgress))
            : [];
          const filtered = parsed.filter(
            (r) => !((r.course || inferCourseFromTopic(r.topic_id)) === finalCourseId && r.topic_id === topicId)
          );
          filtered.push(updatedRow);
          localStorage.setItem(key, JSON.stringify(filtered));
        } catch (e) {
          console.error("Localstorage progress save error:", e);
        }
      }

      // 4. Save to Supabase if logged in (with multi-layer fallback)
      if (activeUser && isConfigured) {
        try {
          // Attempt 1: primary upsert with course in conflict target
          const { error: err1 } = await supabase
            .from("user_progress")
            .upsert(updatedRow as any, { onConflict: "user_id,course,topic_id" });

          if (err1) {
            console.warn("Primary upsert (user_id,course,topic_id) failed, attempting fallback:", err1.message);
            // Attempt 2: fallback to (user_id, topic_id) with course column
            const { error: err2 } = await supabase
              .from("user_progress")
              .upsert(updatedRow as any, { onConflict: "user_id,topic_id" });

            if (err2) {
              console.warn("Secondary upsert (user_id,topic_id) failed, attempting without course column:", err2.message);
              // Attempt 3: fallback without course column (if column not in DB yet)
              const { course: _c, ...withoutCourse } = updatedRow;
              const { error: err3 } = await supabase
                .from("user_progress")
                .upsert(withoutCourse as any, { onConflict: "user_id,topic_id" });

              if (err3) {
                console.error("All user_progress upsert attempts failed:", err3);
              }
            }
          }
        } catch (err) {
          console.error("Exception during user_progress upsert:", err);
        }
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

      // Update refs synchronously
      const mergedBadges = [...badgesRef.current];
      newBadgeRows.forEach((nb) => {
        if (!mergedBadges.some((b) => b.badge_id === nb.badge_id && b.course === nb.course)) {
          mergedBadges.push(nb);
        }
      });
      badgesRef.current = mergedBadges;
      setBadges(mergedBadges);

      if (typeof window !== "undefined") {
        const key = activeUser ? `user_badges_${activeUser.id}` : "guest_user_badges";
        localStorage.setItem(key, JSON.stringify(mergedBadges));
      }

      if (activeUser && isConfigured) {
        try {
          const { error: bErr1 } = await supabase
            .from("user_badges")
            .upsert(newBadgeRows as any, { onConflict: "user_id,course,badge_id" });

          if (bErr1) {
            console.warn("user_badges upsert (user_id,course,badge_id) failed, trying fallback:", bErr1.message);
            const { error: bErr2 } = await supabase
              .from("user_badges")
              .upsert(newBadgeRows as any, { onConflict: "user_id,badge_id" });

            if (bErr2) {
              const noCourseBadges = newBadgeRows.map(({ course: _c, ...rest }) => rest);
              await supabase.from("user_badges").upsert(noCourseBadges as any, { onConflict: "user_id,badge_id" });
            }
          }
        } catch (err) {
          console.error("Exception during user_badges upsert:", err);
        }
      }
    },
    [isConfigured, supabase]
  );

  // Record Study Activity (XP and Streak Calculation)
  const recordStudyActivity = useCallback(
    async (xpGain: number) => {
      if (xpGain <= 0) return;
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

      statsRef.current = updatedStats;
      setStats(updatedStats);

      if (typeof window !== "undefined") {
        const key = activeUser ? `user_stats_${activeUser.id}` : "guest_user_stats";
        localStorage.setItem(key, JSON.stringify(updatedStats));
      }

      if (activeUser && isConfigured) {
        try {
          await supabase
            .from("user_stats")
            .upsert(updatedStats as any, { onConflict: "user_id" });
        } catch (err) {
          console.error("Exception during user_stats upsert:", err);
        }
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
