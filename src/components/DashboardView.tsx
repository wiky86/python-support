"use client";

import React from "react";
import Link from "next/link";
import { Course, Track, Topic, BadgeDefinition, Project } from "@/types/content";
import { useAuth } from "@/lib/auth-context";
import { getTopicStatus, isProjectUnlocked } from "@/lib/progress";
import { getLevelProgress, getLevel, calculateXpFromProgress } from "@/lib/gamification";
import { BadgeIcon } from "@/components/BadgeIcons";
import {
  BookOpen,
  Lock,
  CheckCircle2,
  PlayCircle,
  FolderGit2,
  Award,
  Sparkles,
  Flame,
  ArrowRight,
  TrendingUp,
  Target,
  ArrowLeft,
  Terminal,
  Landmark,
} from "lucide-react";

interface DashboardViewProps {
  course: Course;
  tracks: Track[];
  topicsMap: Record<string, Topic>;
  badges: BadgeDefinition[];
  projectsMap?: Record<string, Project>;
}

export function DashboardView({
  course,
  tracks,
  topicsMap,
  badges,
  projectsMap = {},
}: DashboardViewProps) {
  const { stats, progress, courseProgressMap, badges: userBadges } = useAuth();

  const isPython = course.id === "python";
  const isFinance = course.id === "finance";

  // Calculate course-specific progress
  const courseProgMap = courseProgressMap[course.id] || {};
  const courseRows = Object.values(courseProgMap);
  const completedTopicsCount = courseRows.filter(
    (p) => p.status === "completed" && !p.topic_id.endsWith(".project")
  ).length;

  const totalTopicsCount = Object.keys(topicsMap).length;
  const overallPercent = totalTopicsCount > 0
    ? Math.min(100, Math.round((completedTopicsCount / totalTopicsCount) * 100))
    : 0;

  const courseXp = calculateXpFromProgress(courseRows);
  const { level: courseLevel, percent: levelPercent, xpInCurrentLevel, xpRequiredForNext } =
    getLevelProgress(courseXp);

  const totalProjectsCount = tracks.filter((t) => t.projectFile).length;
  const completedProjectsCount = courseRows.filter(
    (p) => p.status === "completed" && p.topic_id.endsWith(".project")
  ).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 0. Back to Courses Navigation */}
      <div>
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>전체 과목 선택으로 돌아가기</span>
        </Link>
      </div>

      {/* 1. Hero / Analytics Overview Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 text-white border shadow-xl relative overflow-hidden ${
          isPython
            ? "bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-500/20"
            : "bg-gradient-to-r from-amber-950 via-slate-900 to-yellow-950 border-amber-500/20"
        }`}
      >
        <div
          className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
            isPython ? "bg-emerald-500/10" : "bg-amber-500/10"
          }`}
        />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  isPython
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                }`}
              >
                {isPython ? <Terminal className="w-3.5 h-3.5" /> : <Landmark className="w-3.5 h-3.5" />}
                {course.title}
              </span>
              <span className="text-xs text-slate-400 font-mono">총 {tracks.length}개 트랙</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {course.title} 학습 로드맵
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Quick Metrics Card Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            {/* Course Level Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> 과목 레벨
              </div>
              <div
                className={`text-xl font-bold font-mono mt-1 ${
                  isPython ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                Lv.{courseLevel}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {courseXp.toLocaleString()} XP
              </div>
            </div>

            {/* Streak Card */}
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

            {/* Progress Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Target className="w-3 h-3 text-teal-400" /> 완주율
              </div>
              <div className="text-xl font-bold font-mono mt-1 text-teal-400">
                {overallPercent}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {completedTopicsCount}/{totalTopicsCount} 토픽
              </div>
            </div>

            {/* Project Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <FolderGit2 className="w-3 h-3 text-purple-400" /> 프로젝트
              </div>
              <div className="text-xl font-bold font-mono mt-1 text-purple-400">
                {completedProjectsCount}/{totalProjectsCount}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                실전 종합 실습
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Track Roadmap Cards */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen
              className={`w-5 h-5 ${isPython ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
            />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              트랙별 학습 과정
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            순차적으로 학습을 완료하여 다음 토픽을 잠금 해제하세요
          </span>
        </div>

        <div className="space-y-6">
          {tracks.map((track) => {
            const project = projectsMap[track.id];
            const projectUnlocked = isProjectUnlocked(track, progress);
            const projectId = `${track.id}.project`;
            const projectCompleted = progress[projectId]?.status === "completed";

            // Calculate track completion
            const trackCompletedTopicsCount = track.topicOrder.filter(
              (tid) => progress[tid]?.status === "completed"
            ).length;
            const trackPercent = track.topicOrder.length > 0
              ? Math.round((trackCompletedTopicsCount / track.topicOrder.length) * 100)
              : 0;

            return (
              <div
                key={track.id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
              >
                {/* Track Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-md ${
                          isPython
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        TRACK {track.order}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {track.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      {track.description}
                    </p>
                  </div>

                  {/* Track Progress Pill */}
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                        {trackCompletedTopicsCount} / {track.topicOrder.length} 완료
                      </div>
                      <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPython ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${trackPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Topics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {track.topicOrder.map((topicId, idx) => {
                    const topic = topicsMap[topicId];
                    if (!topic) return null;

                    const status = getTopicStatus(track.id, topicId, tracks, progress);
                    const isLocked = status === "locked";
                    const isCompleted = status === "completed";
                    const isInProgress = status === "in_progress";

                    return (
                      <Link
                        key={topicId}
                        href={`/${course.id}/tracks/${track.id}/${topic.id}`}
                        prefetch={false}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                          isCompleted
                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400"
                            : isInProgress
                            ? "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-emerald-500 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 opacity-60 cursor-not-allowed pointer-events-none"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              isCompleted
                                ? "bg-emerald-500 text-white shadow-xs"
                                : isInProgress
                                ? isPython ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                                : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isLocked ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {topic.title}
                            </h4>
                            <span className="text-[11px] text-slate-400 font-mono">
                              토픽 {idx + 1}
                            </span>
                          </div>
                        </div>

                        {!isLocked && (
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Track Mini Project Banner */}
                {project && (
                  <div
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      projectCompleted
                        ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60"
                        : projectUnlocked
                        ? "bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border-purple-300 dark:border-purple-700"
                        : "bg-slate-50/60 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800/60 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          projectCompleted
                            ? "bg-purple-600 text-white"
                            : projectUnlocked
                            ? "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                        }`}
                      >
                        {projectCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : projectUnlocked ? (
                          <FolderGit2 className="w-5 h-5" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            MINI PROJECT
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {project.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {project.intro}
                        </p>
                      </div>
                    </div>

                    {projectUnlocked ? (
                      <Link
                        href={`/${course.id}/tracks/${track.id}/project`}
                        prefetch={false}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 self-end sm:self-auto ${
                          projectCompleted
                            ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-200"
                            : "bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                        }`}
                      >
                        <span>{projectCompleted ? "프로젝트 복습" : "프로젝트 시작"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 self-end sm:self-auto">
                        <Lock className="w-3.5 h-3.5" /> 트랙 완료 후 해제
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
