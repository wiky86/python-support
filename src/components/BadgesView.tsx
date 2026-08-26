"use client";

import React from "react";
import Link from "next/link";
import { BadgeDefinition, BadgesConfig } from "@/types/content";
import { useAuth } from "@/lib/auth-context";
import { BadgeIcon } from "@/components/BadgeIcons";
import {
  Award,
  Sparkles,
  Lock,
  CheckCircle2,
  ArrowLeft,
  Calendar,
} from "lucide-react";

interface BadgesViewProps {
  badgesConfig: BadgesConfig;
}

export function BadgesView({ badgesConfig }: BadgesViewProps) {
  const { badges: userBadges } = useAuth();
  const earnedMap = new Map(userBadges.map((b) => [b.badge_id, b.earned_at]));

  const totalBadges = badgesConfig.badges.length;
  const earnedCount = userBadges.length;
  const percent = totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 학습 로드맵으로 돌아가기
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              배지 도감
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            학습, 퀴즈 만점, 연속 접속, 트랙 완주 등 다양한 활동으로 배지를 수집해 보세요.
          </p>
        </div>

        {/* Progress summary badge */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-right">
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
              {earnedCount} / {totalBadges} 획득
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              달성률 {percent}%
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {percent}%
          </div>
        </div>
      </div>

      {/* 2. Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {badgesConfig.badges.map((badge) => {
          const earnedAt = earnedMap.get(badge.id);
          const isEarned = Boolean(earnedAt);

          return (
            <div
              key={badge.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isEarned
                  ? "bg-gradient-to-b from-amber-50/40 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-300 dark:border-amber-800/80 shadow-md"
                  : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform ${
                      isEarned
                        ? "bg-gradient-to-tr from-amber-500 to-yellow-300 text-amber-950 shadow-md shadow-amber-500/30 scale-105"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                    }`}
                  >
                    <BadgeIcon icon={badge.icon} className="w-6 h-6" />
                  </div>

                  {isEarned ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <Sparkles className="w-3.5 h-3.5" /> 획득
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <Lock className="w-3 h-3" /> 미획득
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {badge.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {badge.desc}
                  </p>
                </div>
              </div>

              {/* Card Footer: Earned Date or Condition Hint */}
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                {isEarned ? (
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3 h-3 text-amber-500" />
                    <span>
                      {new Date(earnedAt!).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                ) : (
                  <div className="text-slate-400">
                    조건: {badgesConfig.conditionTypes[badge.condition.type] || badge.desc}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
