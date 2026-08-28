"use client";

import React from "react";
import Link from "next/link";
import { Track, Topic, BadgeDefinition, Project } from "@/types/content";
import { useAuth } from "@/lib/auth-context";
import { getTopicStatus, isProjectUnlocked } from "@/lib/progress";
import { getLevelProgress } from "@/lib/gamification";
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
} from "lucide-react";

interface DashboardViewProps {
  tracks: Track[];
  topicsMap: Record<string, Topic>;
  badges: BadgeDefinition[];
  projectsMap?: Record<string, Project>;
}

export function DashboardView({ tracks, topicsMap, badges, projectsMap }: DashboardViewProps) {
  const { stats, progress, badges: userBadges } = useAuth();
  const { level, percent, xp, xpInCurrentLevel, xpRequiredForNext } = getLevelProgress(stats.xp);

  // Calculate overall metrics
  const totalTopicsCount = Object.keys(topicsMap).length;
  const completedTopicsCount = Object.values(progress).filter(
    (p) => p.status === "completed" && !p.topic_id.endsWith(".project")
  ).length;
  const overallPercent = totalTopicsCount > 0
    ? Math.round((completedTopicsCount / totalTopicsCount) * 100)
    : 0;

  const totalProjectsCount = tracks.filter((t) => t.projectFile).length;
  const completedProjectsCount = Object.values(progress).filter(
    (p) => p.status === "completed" && p.topic_id.endsWith(".project")
  ).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Hero / Analytics Overview Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white p-6 sm:p-8 border border-emerald-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                파이썬 데이터 분석 학습 공간
              </span>
              <span className="text-xs text-slate-400">데이터 과학자 로드맵</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              데이터 분석의 첫걸음, <br className="hidden sm:block" />
              실습과 퀴즈로 탄탄하게 완성하세요.
            </h1>
            <p className="text-sm text-slate-300">
              코드 실행 엔진 없이도 정확한 빈칸 채우기와 실전 퀴즈, 미니 프로젝트로 분석 역량을 다집니다.
            </p>
          </div>

          {/* Quick Metrics Card Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            {/* Level Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> 레벨
              </div>
              <div className="text-xl font-bold font-mono mt-1 text-emerald-400">
                Lv.{level}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {xp} XP
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
                <Target className="w-3 h-3 text-teal-400" /> 토픽 완주율
              </div>
              <div className="text-xl font-bold font-mono mt-1 text-teal-400">
                {overallPercent}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {completedTopicsCount}/{totalTopicsCount} 완료
              </div>
            </div>

            {/* Badges Card */}
            <Link
              href="/badges"
              prefetch={false}
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-center transition-colors group"
            >
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Award className="w-3 h-3 text-yellow-400" /> 획득 배지
              </div>
              <div className="text-xl font-bold font-mono mt-1 text-yellow-400 group-hover:scale-105 transition-transform">
                {userBadges.length}개
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                도감 보기 →
              </div>
            </Link>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5 font-mono">
            <span>
              다음 레벨(Lv.{level + 1})까지: {xpInCurrentLevel} / {xpRequiredForNext} XP
            </span>
            <span className="font-bold text-emerald-400">{percent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Tracks & Topics Learning Roadmap (Sequential Lock) */}
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              커리큘럼 학습 지도
            </h2>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            총 {tracks.length}개 트랙 • {totalTopicsCount}개 토픽
          </div>
        </div>

        {tracks.map((track, trackIdx) => {
          const trackTopics = track.topicOrder.map((tid) => topicsMap[tid]).filter(Boolean);
          const trackCompletedTopics = trackTopics.filter(
            (top) => progress[top.id]?.status === "completed" && progress[top.id]?.quiz_passed
          ).length;
          const trackPercent = trackTopics.length > 0
            ? Math.round((trackCompletedTopics / trackTopics.length) * 100)
            : 0;

          const projectUnlocked = isProjectUnlocked(track, progress);
          const projectCompleted =
            progress[`${track.id}.project`]?.status === "completed";

          return (
            <div
              key={track.id}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm space-y-6"
            >
              {/* Track Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold font-mono">
                      TRACK {track.order}
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
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
                    <div className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                      {trackCompletedTopics} / {trackTopics.length} 완료
                    </div>
                    <div className="text-[10px] text-slate-400">진행률 {trackPercent}%</div>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center relative font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {trackPercent}%
                  </div>
                </div>
              </div>

              {/* Topics Grid (Sequential Order) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {trackTopics.map((topic, topicIdx) => {
                  const status = getTopicStatus(track.id, topic.id, tracks, progress);
                  const isLocked = status === "locked";
                  const isCompleted = status === "completed";
                  const isInProgress = status === "in_progress";

                  const cardContent = (
                    <div
                      className={`h-full p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isCompleted
                          ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 hover:shadow-md"
                          : isInProgress
                          ? "bg-white dark:bg-slate-900 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-md hover:shadow-lg cursor-pointer"
                          : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-slate-400">
                            STEP {topic.order}
                          </span>
                          {isCompleted && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" /> 완료
                            </span>
                          )}
                          {isInProgress && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                              <PlayCircle className="w-4 h-4" /> 학습 가능
                            </span>
                          )}
                          {isLocked && (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                              <Lock className="w-3.5 h-3.5" /> 잠김
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {topic.title}
                        </h4>
                      </div>

                      <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>실습 {topic.fillBlanks.length}개 • 퀴즈 {topic.quiz.questions.length}제</span>
                        {!isLocked && (
                          <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                    </div>
                  );

                  if (isLocked) {
                    return <div key={topic.id}>{cardContent}</div>;
                  }

                  return (
                    <Link
                      key={topic.id}
                      href={`/tracks/${track.id}/${topic.id}`}
                      prefetch={false}
                      className="block group"
                    >
                      {cardContent}
                    </Link>
                  );
                })}

                {/* Track Mini-Project Card at the end of track */}
                {track.projectFile && (() => {
                  const projectTitle = projectsMap?.[track.id]?.title || "미니 프로젝트";
                  return (
                    <div className="h-full">
                      {projectUnlocked ? (
                        <Link
                          href={`/tracks/${track.id}/project`}
                          prefetch={false}
                          className="block h-full group"
                        >
                          <div
                            className={`h-full p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                              projectCompleted
                                ? "bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border-teal-400 dark:border-teal-700 shadow-sm hover:shadow-md"
                                : "bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/20 hover:scale-[1.02]"
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                    projectCompleted
                                      ? "bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200"
                                      : "bg-white/20 text-white"
                                  }`}
                                >
                                  종합 미니 프로젝트
                                </span>
                                {projectCompleted ? (
                                  <span className="flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400">
                                    <CheckCircle2 className="w-4 h-4" /> 완주
                                  </span>
                                ) : (
                                  <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
                                )}
                              </div>

                              <h4
                                className={`text-sm font-bold leading-snug ${
                                  projectCompleted
                                    ? "text-slate-900 dark:text-white"
                                    : "text-white"
                                }`}
                              >
                                {projectTitle}
                              </h4>
                            </div>

                            <div
                              className={`pt-4 mt-3 border-t flex items-center justify-between text-xs ${
                                projectCompleted
                                  ? "border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300"
                                  : "border-white/20 text-emerald-100"
                              }`}
                            >
                              <span>결과 리포트 카드 생성</span>
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="h-full p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 opacity-50 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                미니 프로젝트
                              </span>
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                              {projectTitle}
                            </h4>
                          </div>
                          <div className="pt-4 mt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                            모든 토픽 완료 시 잠금 해제
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
