"use client";

import React from "react";
import Link from "next/link";
import { Course, BadgeDefinition } from "@/types/content";
import { useAuth } from "@/lib/auth-context";
import { getLevelProgress, getLevel, calculateXpFromProgress } from "@/lib/gamification";
import { BadgeIcon } from "@/components/BadgeIcons";
import {
  BookOpen,
  Terminal,
  Landmark,
  Sparkles,
  Flame,
  Award,
  ArrowRight,
  CheckCircle2,
  Layers,
  GraduationCap,
  TrendingUp,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

interface CourseSelectorViewProps {
  courses: Course[];
  globalBadges: BadgeDefinition[];
  courseTopicCounts: Record<string, number>;
}

export function CourseSelectorView({
  courses,
  globalBadges,
  courseTopicCounts,
}: CourseSelectorViewProps) {
  const { stats, progress, courseProgressMap, badges: userBadges } = useAuth();
  const { level: globalLevel, percent: globalPercent, xp: globalXp, xpInCurrentLevel, xpRequiredForNext } =
    getLevelProgress(stats.xp);

  const earnedBadgeIds = new Set(userBadges.map((b) => b.badge_id));

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-fadeIn">
      {/* 1. Hero Unified Overview */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 border border-indigo-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                KDT 전용 통합 학습 시스템
              </span>
              <span className="text-xs text-slate-400 font-mono">단일 계정 멀티 트랙</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              실무 데이터 분석부터 <br className="hidden sm:block" />
              디지털 금융 이론까지 한번에.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              파이썬 프로그래밍과 데이터 분석 실무, 디지털 금융시장 이론을 단계별 실습과 퀴즈로 학습하고 통합 성취도를 관리하세요.
            </p>
          </div>

          {/* Unified KPI Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            {/* Unified Level */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> 통합 레벨
              </div>
              <div className="text-xl font-bold font-mono mt-1 text-emerald-400">
                Lv.{globalLevel}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {globalXp.toLocaleString()} XP
              </div>
            </div>

            {/* Streak */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-orange-400" /> 연속 학습
              </div>
              <div className="text-xl font-bold font-mono mt-1 text-orange-400">
                {stats.streak_count || 0}일
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                매일 출석 보너스
              </div>
            </div>

            {/* Badges */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Award className="w-3 h-3 text-amber-400" /> 수집 배지
              </div>
              <div className="text-xl font-bold font-mono mt-1 text-amber-400">
                {userBadges.length}개
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                과목 + 통합 배지
              </div>
            </div>

            {/* Total Courses */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" /> 개설 과목
              </div>
              <div className="text-xl font-bold font-mono mt-1 text-cyan-400">
                {courses.length}과목
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                자유 선택 수강
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Course Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              수강 과목 선택
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            원하는 과목을 선택하여 단계별 학습을 진행하세요
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course) => {
            const isPython = course.id === "python";
            const isFinance = course.id === "finance";

            // Calculate course-specific stats
            const courseProgMap = courseProgressMap[course.id] || {};
            const courseRows = Object.values(courseProgMap);
            const completedCount = courseRows.filter(
              (p) => p.status === "completed" && !p.topic_id.endsWith(".project")
            ).length;
            const totalTopics = courseTopicCounts[course.id] || (isPython ? 43 : 54);
            const coursePercent = totalTopics > 0 ? Math.min(100, Math.round((completedCount / totalTopics) * 100)) : 0;
            const courseXp = calculateXpFromProgress(courseRows);
            const courseLevel = getLevel(courseXp);

            return (
              <div
                key={course.id}
                className={`p-6 sm:p-7 rounded-3xl border transition-all duration-300 hover:shadow-xl relative flex flex-col justify-between group ${
                  isPython
                    ? "bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-transparent border-emerald-200/80 dark:border-emerald-800/60 hover:border-emerald-400 dark:hover:border-emerald-600"
                    : "bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-transparent dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-transparent border-amber-200/80 dark:border-amber-800/60 hover:border-amber-400 dark:hover:border-amber-600"
                }`}
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 ${
                          isPython
                            ? "bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/20"
                            : "bg-gradient-to-tr from-amber-600 to-yellow-500 shadow-amber-500/20"
                        }`}
                      >
                        {isPython ? <Terminal className="w-6 h-6" /> : <Landmark className="w-6 h-6" />}
                      </div>
                      <div>
                        <span
                          className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-md ${
                            isPython
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          TRACK {course.trackCount}개
                        </span>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                          {course.title}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-xs font-mono font-bold ${
                          isPython ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        Lv.{courseLevel}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {courseXp.toLocaleString()} XP
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed min-h-[40px]">
                    {course.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        진도율 ({completedCount}/{totalTopics} 토픽)
                      </span>
                      <span
                        className={`font-bold font-mono ${
                          isPython ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {coursePercent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isPython
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                            : "bg-gradient-to-r from-amber-500 to-yellow-400"
                        }`}
                        style={{ width: `${coursePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-6">
                  <Link
                    href={`/${course.id}`}
                    prefetch={false}
                    className={`w-full py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all group-hover:gap-3 ${
                      isPython
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                        : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20"
                    }`}
                  >
                    <span>{completedCount > 0 ? "이어서 학습하기" : "과목 학습 시작하기"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Global Badges Showcase */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              통합 성취 배지 (Global Badges)
            </h2>
          </div>
          <Link
            href="/badges"
            prefetch={false}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            전체 배지 도감 보기 →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {globalBadges.map((badge) => {
            const isEarned = earnedBadgeIds.has(badge.id);

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
                  isEarned
                    ? "bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent dark:from-amber-950/20 dark:via-yellow-950/10 border-amber-300/80 dark:border-amber-800/80 shadow-xs"
                    : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isEarned
                      ? "bg-gradient-to-tr from-amber-500 to-yellow-300 text-amber-950 shadow-md shadow-amber-500/20"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                  }`}
                >
                  <BadgeIcon icon={badge.icon} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {badge.name}
                    </h4>
                    {isEarned && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                        획득
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {badge.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
