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
  const isFetchingRef = useRef(false);

  // Refresh and synchronize data from Supabase (if logged in) or LocalStorage (if guest)
  const refreshData = useCallback(async (currentUser?: User | null) => {
    const activeUser = currentUser !== undefined ? currentUser : user;

    if (!isConfigured || !activeUser) {
      // Guest Mode: load from local storage
      if (typeof window !== "undefined") {
        try {
          const savedStats = localStorage.getItem("guest_user_stats");
          const savedProgress = localStorage.getItem("guest_user_progress");
          const savedBadges = localStorage.getItem("guest_user_badges");
          setStats(savedStats ? JSON.parse(savedStats) : defaultGuestStats);
          setProgress(savedProgress ? JSON.parse(savedProgress) : {});
          setBadges(savedBadges ? JSON.parse(savedBadges) : []);
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
      // Execute all 3 queries concurrently in parallel via Promise.all
      const [statsRes, progressRes, badgeRes] = await Promise.all([
        supabase.from("user_stats").select("*").eq("user_id", activeUser.id).maybeSingle(),
        supabase.from("user_progress").select("*").eq("user_id", activeUser.id),
        supabase.from("user_badges").select("*").eq("user_id", activeUser.id),
      ]);

      // 1. Handle user_stats
      if (statsRes.data) {
        setStats(statsRes.data as UserStatsRow);
      } else if (!statsRes.error) {
        const initialStats: UserStatsRow = {
          user_id: activeUser.id,
          xp: 0,
          last_studied: null,
          streak_count: 0,
          updated_at: new Date().toISOString(),
        };
        supabase.from("user_stats").upsert(initialStats as any, { onConflict: "user_id" }).then();
        setStats(initialStats);
      }

      // 2. Handle user_progress
      if (progressRes.data) {
        const map: Record<string, UserProgressRow> = {};
        (progressRes.data as UserProgressRow[]).forEach((row) => {
          map[row.topic_id] = row;
        });
        setProgress(map);
      } else {
        setProgress({});
      }

      // 3. Handle user_badges
      if (badgeRes.data) {
        setBadges(badgeRes.data as UserBadgeRow[]);
      } else {
        setBadges([]);
      }
    } catch (err) {
      console.error("Error refreshing data from Supabase:", err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [isConfigured, user, supabase]);

  // Listen to Supabase Auth State changes
  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      refreshData(null);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setLoading(false);
      refreshData(sessionUser);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setLoading(false);
      refreshData(sessionUser);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured, supabase, refreshData]);

  // Sign out handler
  const signOut = async () => {
    if (isConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Sign out error:", err);
      }
    }
    setUser(null);
    setStats(defaultGuestStats);
    setProgress({});
    setBadges([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("guest_user_stats");
      localStorage.removeItem("guest_user_progress");
      localStorage.removeItem("guest_user_badges");
    }
  };

  // Update Topic or Project Progress
  const updateTopicProgress = async (
    topicId: string,
    status: "in_progress" | "completed",
    quizPassed = false,
    quizScore?: number
  ) => {
    const existing = progress[topicId];
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
      user_id: user ? user.id : "guest-user",
      topic_id: topicId,
      status: finalStatus,
      quiz_passed: finalPassed,
      quiz_score: finalScore,
      completed_at: finalStatus === "completed" ? (existing?.completed_at || nowIso) : null,
      updated_at: nowIso,
    };

    const newProgress = { ...progress, [topicId]: updatedRow };
    setProgress(newProgress);

    if (user && isConfigured) {
      await supabase
        .from("user_progress")
        .upsert(updatedRow as any, { onConflict: "user_id,topic_id" });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("guest_user_progress", JSON.stringify(newProgress));
    }
  };

  // Save Earned Badges
  const saveEarnedBadges = async (badgeIds: string[]) => {
    if (!badgeIds || badgeIds.length === 0) return;
    const nowIso = new Date().toISOString();
    const newBadgeRows: UserBadgeRow[] = badgeIds.map((id) => ({
      user_id: user ? user.id : "guest-user",
      badge_id: id,
      earned_at: nowIso,
    }));

    const merged = [...badges];
    newBadgeRows.forEach((nb) => {
      if (!merged.some((b) => b.badge_id === nb.badge_id)) {
        merged.push(nb);
      }
    });

    setBadges(merged);

    if (user && isConfigured) {
      await supabase.from("user_badges").upsert(newBadgeRows as any, { onConflict: "user_id,badge_id" });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("guest_user_badges", JSON.stringify(merged));
    }
  };

  // Record Study Activity (XP and Streak Calculation)
  const recordStudyActivity = async (xpGain: number) => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    let newStreak = stats.streak_count;

    if (!stats.last_studied) {
      newStreak = 1;
    } else if (stats.last_studied === today) {
      newStreak = stats.streak_count || 1;
    } else {
      const lastDate = new Date(stats.last_studied);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak = (stats.streak_count || 0) + 1;
      } else {
        newStreak = 1;
      }
    }

    const updatedStats: UserStatsRow = {
      user_id: user ? user.id : "guest-user",
      xp: (stats.xp || 0) + xpGain,
      last_studied: today,
      streak_count: newStreak,
      updated_at: new Date().toISOString(),
    };

    setStats(updatedStats);

    if (user && isConfigured) {
      await supabase
        .from("user_stats")
        .upsert(updatedStats as any, { onConflict: "user_id" });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("guest_user_stats", JSON.stringify(updatedStats));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured,
        stats,
        progress,
        badges,
        refreshData: async () => refreshData(user),
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
