"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Track, Project, BadgeDefinition } from "@/types/content";
import { useAuth } from "@/lib/auth-context";
import { isProjectUnlocked } from "@/lib/progress";
import { evaluateBadges } from "@/lib/gamification";
import { FillInBlankList } from "@/components/FillInBlank";
import { ReportCard } from "@/components/ReportCard";
import confetti from "canvas-confetti";
import {
  Rocket,
  Database,
  Lock,
  CheckCircle2,
  Sparkles,
  Award,
  ArrowRight,
  TrendingUp,
  ArrowLeft,
  Layers,
} from "lucide-react";

interface ProjectViewProps {
  track: Track;
  project: Project;
  allTracks: Track[];
  allBadges: BadgeDefinition[];
  allTrackTopicsCount: Record<string, number>;
  totalTopicsCount: number;
  totalTracksCount: number;
}

export function ProjectView({
  track,
  project,
  allTracks,
  allBadges,
  allTrackTopicsCount,
  totalTopicsCount,
  totalTracksCount,
}: ProjectViewProps) {
  const {
    progress,
    courseProgressMap,
    stats,
    badges,
    user,
    updateTopicProgress,
    saveEarnedBadges,
    recordStudyActivity,
  } = useAuth();

  const courseId = track.courseId || "python";
  const isUnlocked = isProjectUnlocked(track, progress);
  const projectId = `${track.id}.project`;
  const existingProgress = progress[`${courseId}:${projectId}`] || progress[projectId];
  const isAlreadyCompleted = existingProgress?.status === "completed";

  const [completedMissions, setCompletedMissions] = useState(isAlreadyCompleted);
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState<string[]>([]);
  const [gainedXp, setGainedXp] = useState(0);

  const handleAllMissionsCompleted = async () => {
    if (completedMissions) return;
    setCompletedMissions(true);

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch {
      // ignore
    }

    // Award XP: projectComplete: 300 XP, trackComplete: 200 XP
    let xpToAdd = 0;
    if (!isAlreadyCompleted) {
      xpToAdd += 300; // projectComplete
      // Check if all topics in track complete => trackComplete bonus
      xpToAdd += 200; // trackComplete
    }

    setGainedXp(xpToAdd);

    await updateTopicProgress(projectId, "completed", true, 1.0, courseId);

    if (xpToAdd > 0) {
      await recordStudyActivity(xpToAdd);
    }

    // Check newly unlocked badges
    const simulatedRow = {
      user_id: stats.user_id,
      course: courseId,
      topic_id: projectId,
      status: "completed" as const,
      quiz_passed: true,
      quiz_score: 1.0,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const simulatedProgress = {
      ...progress,
      [projectId]: simulatedRow,
      [`${courseId}:${projectId}`]: simulatedRow,
    };

    const simulatedCourseMap = {
      ...courseProgressMap,
      [courseId]: {
        ...(courseProgressMap[courseId] || {}),
        [projectId]: simulatedRow,
      },
    };

    const simulatedStats = {
      ...stats,
      xp: stats.xp + xpToAdd,
    };

    const newBadgeIds = evaluateBadges({
      stats: simulatedStats,
      allProgress: simulatedProgress,
      courseProgressMap: simulatedCourseMap,
      existingBadges: badges,
      allBadges,
      courseTrackTopicsCount: { [courseId]: allTrackTopicsCount },
      courseTotalTopicsCount: { [courseId]: totalTopicsCount },
      courseTotalTracksCount: { [courseId]: totalTracksCount },
      currentCourseId: courseId,
    });

    if (newBadgeIds.length > 0) {
      setNewlyEarnedBadges(newBadgeIds);
      await saveEarnedBadges(newBadgeIds, courseId);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            미니 프로젝트가 잠겨 있습니다
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {track.title}의 모든 토픽 학습 및 퀴즈를 통과하면 실전 미니 프로젝트가 열립니다.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href={`/${courseId}`}
            prefetch={false}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            과목 학습 지도로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 1. Breadcrumbs and Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link
            href="/"
            prefetch={false}
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            과목 선택
          </Link>
          <span>/</span>
          <Link
            href={`/${courseId}`}
            prefetch={false}
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            {courseId === "python" ? "파이썬 데이터 분석" : "디지털 금융 이론"}
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {track.title}
          </span>
          <span>/</span>
          <span className="text-purple-600 dark:text-purple-400 font-bold">
            미니 프로젝트
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold font-mono">
                TRACK {track.order} · MINI PROJECT
              </span>
              {completedMissions && (
                <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  프로젝트 완료
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {project.title}
            </h1>
          </div>

          <Link
            href={`/${courseId}`}
            prefetch={false}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 학습 로드맵
          </Link>
        </div>
      </div>

      {/* 2. Project Intro & Dataset Scenario Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
            <Rocket className="w-4 h-4" />
            <span>실전 종합 프로젝트 개요</span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {project.intro}
          </p>
        </div>

        {/* Dataset / Scenario Code Block */}
        {project.dataset && (
          <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-3 font-mono text-xs border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px] pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-teal-400" />
                {project.dataset.description}
              </span>
              <span>데이터셋 / 가상 시나리오</span>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-teal-300">
              {project.dataset.code}
            </pre>
          </div>
        )}
      </div>

      {/* 3. Missions (Fill-in-the-Blank steps) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
        <FillInBlankList
          items={project.missions}
          title="단계별 미션 해결 (빈칸 채우기)"
          onAllCompleted={handleAllMissionsCompleted}
        />

        {/* Completion Celebration & Report Card */}
        {completedMissions && (
          <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800 animate-fadeIn">
            {/* XP and Badges notification */}
            {gainedXp > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent border border-purple-300 dark:border-purple-700 text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>
                    프로젝트 완료 보상: +{gainedXp} XP 획득! (프로젝트 300 XP + 트랙 완주 200 XP)
                  </span>
                </div>
                {newlyEarnedBadges.length > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                    +신규 배지 {newlyEarnedBadges.length}개 획득!
                  </span>
                )}
              </div>
            )}

            {/* Generated Report Card */}
            {project.report && (
              <ReportCard
                report={project.report}
                trackTitle={track.title}
                completedAt={new Date().toLocaleDateString("ko-KR")}
              />
            )}

            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                축하합니다! 트랙의 모든 과정을 성공적으로 완주했습니다.
              </span>
              <Link
                href={`/${courseId}`}
                prefetch={false}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-2"
              >
                <span>학습 지도로 돌아가기</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
