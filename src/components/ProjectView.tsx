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
    stats,
    badges,
    user,
    updateTopicProgress,
    saveEarnedBadges,
    recordStudyActivity,
  } = useAuth();

  const isUnlocked = isProjectUnlocked(track, progress);
  const projectId = `${track.id}.project`;
  const isAlreadyCompleted = progress[projectId]?.status === "completed";

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

    // Award XP: projectComplete: 60 XP, trackComplete: 50 XP
    let xpToAdd = 0;
    if (!isAlreadyCompleted) {
      xpToAdd += 60; // projectComplete
      // Check if all topics in track complete => trackComplete bonus
      xpToAdd += 50; // trackComplete
    }

    setGainedXp(xpToAdd);

    await updateTopicProgress(projectId, "completed", true, 1.0);

    if (xpToAdd > 0) {
      await recordStudyActivity(xpToAdd);
    }

    // Check newly unlocked badges
    const simulatedProgress = {
      ...progress,
      [projectId]: {
        user_id: stats.user_id,
        topic_id: projectId,
        status: "completed" as const,
        quiz_passed: true,
        quiz_score: 1.0,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    const simulatedStats = {
      ...stats,
      xp: stats.xp + xpToAdd,
    };

    const newBadgeIds = evaluateBadges({
      stats: simulatedStats,
      progress: simulatedProgress,
      existingBadges: badges,
      allBadges,
      allTrackTopicsCount,
      totalTopicsCount,
      totalTracksCount,
    });

    if (newBadgeIds.length > 0) {
      setNewlyEarnedBadges(newBadgeIds);
      await saveEarnedBadges(newBadgeIds);
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
            href="/"
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            학습 지도로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Breadcrumbs and Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link
            href="/"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            학습 로드맵
          </Link>
          <span>/</span>
          <span>{track.title}</span>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {project.title}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-xs font-bold font-mono flex items-center gap-1">
                <Rocket className="w-3.5 h-3.5" />
                MINI PROJECT
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {project.title}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {project.intro}
            </p>
          </div>

          {(completedMissions || isAlreadyCompleted) && (
            <div className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              프로젝트 완주 완료
            </div>
          )}
        </div>
      </div>

      {/* 2. Dataset Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Database className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            제공 데이터셋 (Dataset)
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {project.dataset.description}
        </p>
        <div className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs sm:text-sm overflow-x-auto border border-slate-800 leading-relaxed whitespace-pre">
          {project.dataset.code}
        </div>
      </div>

      {/* 3. Missions (Fill-in-the-blank) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
        <FillInBlankList
          items={project.missions}
          title="단계별 분석 미션 실습"
          onAllCompleted={handleAllMissionsCompleted}
        />

        {!completedMissions && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              위의 모든 미션을 정답으로 완료하면 최종 분석 리포트 카드가 생성됩니다.
            </span>
            <button
              onClick={handleAllMissionsCompleted}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              리포트 생성 및 완료하기
            </button>
          </div>
        )}
      </div>

      {/* 4. Completion & Newly Earned Badges Banner */}
      {completedMissions && (
        <div className="space-y-8 animate-fadeIn">
          {newlyEarnedBadges.length > 0 && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400 dark:border-amber-700">
              <div className="text-sm font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-amber-500" />
                축하합니다! 새로운 배지를 획득하셨습니다:
              </div>
              <div className="flex flex-wrap gap-2.5">
                {newlyEarnedBadges.map((badgeId) => {
                  const b = allBadges.find((x) => x.id === badgeId);
                  return (
                    <div
                      key={badgeId}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 shadow-sm"
                    >
                      <span className="text-amber-500">🏆</span>
                      <span>{b?.name || badgeId}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Report Card */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                최종 결과 분석 리포트 카드
              </h3>
            </div>
            <ReportCard
              report={project.report}
              projectTitle={project.title}
              userName={user?.email?.split("@")[0] || "데이터 분석 학습자"}
            />
          </div>

          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <span>학습 대시보드로 돌아가기</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
