"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Course, BadgeDefinition } from "@/types/content";
import { useAuth } from "@/lib/auth-context";
import { describeBadgeCondition } from "@/lib/gamification";
import { BadgeIcon } from "@/components/BadgeIcons";
import {
  Award,
  Sparkles,
  Lock,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  Layers,
  Terminal,
  Landmark,
  Globe,
} from "lucide-react";

interface BadgesViewProps {
  courses: Course[];
  allBadges: BadgeDefinition[];
  globalBadges: BadgeDefinition[];
  courseBadgesMap: Record<string, BadgeDefinition[]>;
  trackTitles?: Record<string, string>;
}

export function BadgesView({
  courses,
  allBadges,
  globalBadges,
  courseBadgesMap,
  trackTitles = {},
}: BadgesViewProps) {
  const { badges: userBadges } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("all");

  const earnedMap = new Map(userBadges.map((b) => [b.badge_id, b.earned_at]));

  // Filter badges based on active tab
  let displayedBadges: BadgeDefinition[] = allBadges;
  if (activeTab === "global") {
    displayedBadges = globalBadges;
  } else if (activeTab !== "all") {
    displayedBadges = courseBadgesMap[activeTab] || [];
  }

  const totalAllBadges = allBadges.length;
  const earnedAllCount = userBadges.length;
  const overallPercent = totalAllBadges > 0 ? Math.round((earnedAllCount / totalAllBadges) * 100) : 0;

  const currentTabTotal = displayedBadges.length;
  const currentTabEarned = displayedBadges.filter((b) => earnedMap.has(b.id)).length;
  const currentTabPercent = currentTabTotal > 0 ? Math.round((currentTabEarned / currentTabTotal) * 100) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 1. Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <Link
            href="/"
            prefetch={false}
            className="text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 과목 선택으로 돌아가기
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              통합 배지 도감
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            파이썬, 디지털 금융 과목 및 계정 전체 통합 성취 배지를 수집해 보세요.
          </p>
        </div>

        {/* Progress summary badge */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-right">
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
              {earnedAllCount} / {totalAllBadges} 획득
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
              전체 수집률 {overallPercent}%
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 flex items-center justify-center font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
            {overallPercent}%
          </div>
        </div>
      </div>

      {/* 2. Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "all"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>전체 통합 ({totalAllBadges})</span>
        </button>

        <button
          onClick={() => setActiveTab("global")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "global"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Globe className="w-4 h-4 text-indigo-500" />
          <span>계정 공통 ({globalBadges.length})</span>
        </button>

        {courses.map((course) => {
          const isSelected = activeTab === course.id;
          const courseBadgeCount = (courseBadgesMap[course.id] || []).length;
          const isPython = course.id === "python";

          return (
            <button
              key={course.id}
              onClick={() => setActiveTab(course.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? isPython
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-amber-500 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {isPython ? <Terminal className="w-4 h-4 text-emerald-500" /> : <Landmark className="w-4 h-4 text-amber-500" />}
              <span>{course.title} ({courseBadgeCount})</span>
            </button>
          );
        })}
      </div>

      {/* 3. Current Filter Info */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          선택 분류: <strong>{currentTabEarned}</strong>개 획득 / 총 <strong>{currentTabTotal}</strong>개 (달성률 {currentTabPercent}%)
        </span>
      </div>

      {/* 4. Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayedBadges.map((badge) => {
          const earnedAt = earnedMap.get(badge.id);
          const isEarned = Boolean(earnedAt);
          const isGlobal = badge.scope === "global";
          const courseId = badge.course;

          return (
            <div
              key={badge.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isEarned
                  ? isGlobal
                    ? "bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 border-indigo-300 dark:border-indigo-800/80 shadow-md"
                    : courseId === "python"
                    ? "bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-300 dark:border-emerald-800/80 shadow-md"
                    : "bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-300 dark:border-amber-800/80 shadow-md"
                  : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform ${
                      isEarned
                        ? isGlobal
                          ? "bg-gradient-to-tr from-indigo-600 to-purple-400 text-white shadow-md shadow-indigo-500/30 scale-105"
                          : courseId === "python"
                          ? "bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-md shadow-emerald-500/30 scale-105"
                          : "bg-gradient-to-tr from-amber-500 to-yellow-300 text-amber-950 shadow-md shadow-amber-500/30 scale-105"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                    }`}
                  >
                    <BadgeIcon icon={badge.icon} className="w-6 h-6" />
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {isEarned ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 획득 완료
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Lock className="w-3 h-3" /> 미획득
                      </span>
                    )}
                    <span
                      className={`text-[9px] font-extrabold font-mono px-1.5 py-0.5 rounded ${
                        isGlobal
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          : courseId === "python"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {isGlobal ? "GLOBAL" : courseId ? courseId.toUpperCase() : "COURSE"}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {badge.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {badge.desc}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1">
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {describeBadgeCondition(badge.condition, trackTitles)}
                </p>
                {isEarned && earnedAt && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400/80 flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" />
                    {new Date(earnedAt).toLocaleDateString("ko-KR")} 획득
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
