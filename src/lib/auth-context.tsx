"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import { UserProgressRow, UserStatsRow, UserBadgeRow } from "@/types/database";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  stats: UserStatsRow;
  progress: Record<string, UserProgressRow>;
  badges: UserBadgeRow[];
  refreshData: () => Promise<void>;
  signOut: () => Promise<void>;
  updateTopicProgress: (
    topicId: string,
    status: "in_progress" | "completed",
    quizPassed?: boolean,
    quizScore?: number
  ) => Promise<void>;
  saveEarnedBadges: (badgeIds: string[]) => Promise<void>;
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
  const isConfigured = isSupabaseConfigured();
  const supabase = createClient();

  const [stats, setStats] = useState<UserStatsRow>(defaultGuestStats);
  const [progress, setProgress] = useState<Record<string, UserProgressRow>>({});
  const [badges, setBadges] = useState<UserBadgeRow[]>([]);

  // Refs to avoid state closures and dependency cycle loops
  const userRef = useRef<User | null>(null);
  const statsRef = useRef<UserStatsRow>(defaultGuestStats);
  const progressRef = useRef<Record<string, UserProgressRow>>({});
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
    badgesRef.current = badges;
  }, [badges]);

  // Core Data Fetcher: Loads data for a given userId (Supabase) or guest (LocalStorage)
  const fetchUserData = useCallback(
    async (userId: string | null) => {
      if (!isConfigured || !userId) {
        // Guest Mode
        if (typeof window !== "undefined") {
          try {
            const savedStats = localStorage.getItem("guest_user_stats");
            const savedProgress = localStorage.getItem("guest_user_progress");
            const savedBadges = localStorage.getItem("guest_user_badges");
            const parsedStats = savedStats ? JSON.parse(savedStats) : defaultGuestStats;
            const parsedProgress = savedProgress ? JSON.parse(savedProgress) : {};
            const parsedBadges = savedBadges ? JSON.parse(savedBadges) : [];
            setStats(parsedStats);
            setProgress(parsedProgress);
            setBadges(parsedBadges);
          } catch {
            setStats(defaultGuestStats);
            setProgress({});
            setBadges([]);
          }
        }
        return;
      }

      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const [statsRes, progressRes, badgeRes] = await Promise.all([
          supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("user_progress").select("*").eq("user_id", userId),
          supabase.from("user_badges").select("*").eq("user_id", userId),
        ]);

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
          const map: Record<string, UserProgressRow> = {};
          (progressRes.data as UserProgressRow[]).forEach((row) => {
            map[row.topic_id] = row;
          });
          setProgress(map);
        } else {
          setProgress({});
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

  // Manual refresh trigger
  const refreshData = useCallback(async () => {
    await fetchUserData(userRef.current?.id || null);
  }, [fetchUserData]);

  // Auth Lifecycle: Mounts ONCE, handles session init and onAuthStateChange
  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      fetchUserData(null);
      return;
    }

    let mounted = true;

    // Initial session check
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        userRef.current = sessionUser;
        setLoading(false);
        fetchUserData(sessionUser?.id || null);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    // Auth state change subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const sessionUser = session?.user ?? null;
      const prevUserId = userRef.current?.id;
      const nextUserId = sessionUser?.id;

      setUser(sessionUser);
      userRef.current = sessionUser;
      setLoading(false);

      // Only re-fetch if user identity changed
      if (prevUserId !== nextUserId) {
        fetchUserData(nextUserId || null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured, supabase, fetchUserData]);

  // Sign out handler
  const signOut = useCallback(async () => {
    if (isConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Sign out error:", err);
      }
    }
    setUser(null);
    userRef.current = null;
    setStats(defaultGuestStats);
    setProgress({});
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
      quizScore?: number
    ) => {
      const activeUser = userRef.current;
      const currentProgress = progressRef.current;
      const existing = currentProgress[topicId];

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
        topic_id: topicId,
        status: finalStatus,
        quiz_passed: finalPassed,
        quiz_score: finalScore,
        completed_at: finalStatus === "completed" ? (existing?.completed_at || nowIso) : null,
        updated_at: nowIso,
      };

      setProgress((prev) => {
        const next = { ...prev, [topicId]: updatedRow };
        if (!activeUser && typeof window !== "undefined") {
          localStorage.setItem("guest_user_progress", JSON.stringify(next));
        }
        return next;
      });

      if (activeUser && isConfigured) {
        await supabase
          .from("user_progress")
          .upsert(updatedRow as any, { onConflict: "user_id,topic_id" });
      }
    },
    [isConfigured, supabase]
  );

  // Save Earned Badges
  const saveEarnedBadges = useCallback(
    async (badgeIds: string[]) => {
      if (!badgeIds || badgeIds.length === 0) return;
      const activeUser = userRef.current;
      const nowIso = new Date().toISOString();
      const newBadgeRows: UserBadgeRow[] = badgeIds.map((id) => ({
        user_id: activeUser ? activeUser.id : "guest-user",
        badge_id: id,
        earned_at: nowIso,
      }));

      setBadges((prev) => {
        const merged = [...prev];
        newBadgeRows.forEach((nb) => {
          if (!merged.some((b) => b.badge_id === nb.badge_id)) {
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
          .upsert(newBadgeRows as any, { onConflict: "user_id,badge_id" });
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
        isConfigured,
        stats,
        progress,
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
