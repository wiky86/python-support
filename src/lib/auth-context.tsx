"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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

const defaultStats: UserStatsRow = {
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

  const [stats, setStats] = useState<UserStatsRow>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("guest_user_stats");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return defaultStats;
  });

  const [progress, setProgress] = useState<Record<string, UserProgressRow>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("guest_user_progress");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return {};
  });

  const [badges, setBadges] = useState<UserBadgeRow[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("guest_user_badges");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  const refreshData = useCallback(async () => {
    if (!isConfigured || !user) {
      if (typeof window !== "undefined") {
        const savedStats = localStorage.getItem("guest_user_stats");
        const savedProgress = localStorage.getItem("guest_user_progress");
        const savedBadges = localStorage.getItem("guest_user_badges");
        if (savedStats) setStats(JSON.parse(savedStats));
        if (savedProgress) setProgress(JSON.parse(savedProgress));
        if (savedBadges) setBadges(JSON.parse(savedBadges));
      }
      return;
    }

    try {
      // 1. Fetch user_stats
      const { data: statsData, error: statsError } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (statsData) {
        setStats(statsData as UserStatsRow);
      } else if (!statsError) {
        // Initialize user_stats if not exists
        const initial = {
          user_id: user.id,
          xp: 0,
          last_studied: null,
          streak_count: 0,
          updated_at: new Date().toISOString(),
        };
        await supabase.from("user_stats").insert(initial as any);
        setStats(initial);
      }

      // 2. Fetch user_progress
      const { data: progressData } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id);

      if (progressData) {
        const map: Record<string, UserProgressRow> = {};
        (progressData as UserProgressRow[]).forEach((row) => {
          map[row.topic_id] = row;
        });
        setProgress(map);
      }

      // 3. Fetch user_badges
      const { data: badgeData } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", user.id);

      if (badgeData) {
        setBadges(badgeData as UserBadgeRow[]);
      }
    } catch (err) {
      console.error("Error refreshing Supabase data:", err);
    }
  }, [isConfigured, user, supabase]);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured, supabase]);

  useEffect(() => {
    refreshData();
  }, [user, refreshData]);

  const signOut = async () => {
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const updateTopicProgress = async (
    topicId: string,
    status: "in_progress" | "completed",
    quizPassed = false,
    quizScore?: number
  ) => {
    const existing = progress[topicId];
    // Retain initial score if already set
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

    if (!user || !isConfigured) {
      localStorage.setItem("guest_user_progress", JSON.stringify(newProgress));
    } else {
      await supabase
        .from("user_progress")
        .upsert(updatedRow as any, { onConflict: "user_id,topic_id" });
    }
  };

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

    if (!user || !isConfigured) {
      localStorage.setItem("guest_user_badges", JSON.stringify(merged));
    } else {
      await supabase.from("user_badges").upsert(newBadgeRows as any, { onConflict: "user_id,badge_id" });
    }
  };

  const recordStudyActivity = async (xpGain: number) => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    let newStreak = stats.streak_count;

    if (!stats.last_studied) {
      newStreak = 1;
    } else if (stats.last_studied === today) {
      // already studied today, maintain
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

    if (!user || !isConfigured) {
      localStorage.setItem("guest_user_stats", JSON.stringify(updatedStats));
    } else {
      await supabase
        .from("user_stats")
        .upsert(updatedStats as any, { onConflict: "user_id" });
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
