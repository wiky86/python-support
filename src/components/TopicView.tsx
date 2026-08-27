"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Track, Topic, BadgeDefinition } from "@/types/content";
import { useAuth } from "@/lib/auth-context";
import { getTopicStatus } from "@/lib/progress";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { FillInBlankList } from "@/components/FillInBlank";
import { QuizRunner } from "@/components/QuizRunner";
import { FaqChatbot } from "@/components/FaqChatbot";
import {
  BookOpen,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Code2,
  ListOrdered,
  Bot,
} from "lucide-react";

interface TopicViewProps {
  track: Track;
  topic: Topic;
  allTracks: Track[];
  allBadges: BadgeDefinition[];
  allTrackTopicsCount: Record<string, number>;
  totalTopicsCount: number;
  totalTracksCount: number;
}

export function TopicView({
  track,
  topic,
  allTracks,
  allBadges,
  allTrackTopicsCount,
  totalTopicsCount,
  totalTracksCount,
}: TopicViewProps) {
  const router = useRouter();
  const { progress } = useAuth();
  const [activeTab, setActiveTab] = useState<"learn" | "practice" | "quiz" | "faq">("learn");

  const changeTab = (tab: "learn" | "practice" | "quiz" | "faq") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const status = getTopicStatus(track.id, topic.id, allTracks, progress);
  const isLocked = status === "locked";
  const isCompleted = status === "completed";

  // Calculate next and previous topic IDs
  const topicIdx = track.topicOrder.indexOf(topic.id);
  const prevTopicId = topicIdx > 0 ? track.topicOrder[topicIdx - 1] : null;
  const nextTopicId =
    topicIdx < track.topicOrder.length - 1
      ? track.topicOrder[topicIdx + 1]
      : null;

  const isNextUnlocked =
    isCompleted &&
    (nextTopicId !== null || track.projectFile !== null);

  const handleNextNavigation = () => {
    if (nextTopicId) {
      router.push(`/tracks/${track.id}/${nextTopicId}`);
    } else if (track.projectFile) {
      router.push(`/tracks/${track.id}/project`);
    }
  };

  if (isLocked) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            이 토픽은 아직 잠겨 있습니다
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            이전 토픽의 복습 퀴즈를 통과하면 다음 토픽이 자동으로 열립니다.
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

  // Unified Tab Card Wrapper CSS
  const tabCardClassName =
    "p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 w-full";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Breadcrumbs and Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link
            href="/"
            prefetch={false}
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            학습 로드맵
          </Link>
          <span>/</span>
          <span>{track.title}</span>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {topic.title}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold font-mono">
                TOPIC {topic.order}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {topic.title}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {track.title} • {topic.fillBlanks.length}개 실습 • {topic.quiz.questions.length}개 퀴즈
            </p>
          </div>

          {/* Completion Badge */}
          {isCompleted && (
            <div className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              학습 및 퀴즈 완료
            </div>
          )}
        </div>
      </div>

      {/* 2. Topic Learning Tabs */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-900 p-1.5 gap-1 border border-slate-200 dark:border-slate-800 w-full">
        <button
          type="button"
          onClick={() => changeTab("learn")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "learn"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>개념 학습</span>
        </button>

        <button
          type="button"
          onClick={() => changeTab("practice")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "practice"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Code2 className="w-4 h-4 text-teal-600" />
          <span>빈칸 실습 ({topic.fillBlanks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => changeTab("quiz")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "quiz"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <HelpCircle className="w-4 h-4 text-amber-500" />
          <span>복습 퀴즈 ({topic.quiz.questions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => changeTab("faq")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "faq"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Bot className="w-4 h-4 text-indigo-500" />
          <span>FAQ 봇</span>
        </button>
      </div>

      {/* 3. Tab Contents (Unified Container Width & Structure) */}
      <div className="w-full">
        {/* Tab 1: Learn */}
        <div className={activeTab === "learn" ? `${tabCardClassName} block` : "hidden"}>
          <MarkdownViewer content={topic.content} />

          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              개념을 익혔다면 빈칸 채우기 실습을 진행해 보세요.
            </span>
            <button
              type="button"
              onClick={() => changeTab("practice")}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>빈칸 실습으로 이동</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab 2: Practice */}
        <div className={activeTab === "practice" ? `${tabCardClassName} block` : "hidden"}>
          <FillInBlankList
            items={topic.fillBlanks}
            onAllCompleted={() => {}}
          />

          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeTab("learn")}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> 개념 다시보기
            </button>
            <button
              type="button"
              onClick={() => changeTab("quiz")}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>복습 퀴즈 풀기</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab 3: Quiz */}
        <div className={activeTab === "quiz" ? `${tabCardClassName} block` : "hidden"}>
          <QuizRunner
            quiz={topic.quiz}
            topicId={topic.id}
            trackId={track.id}
            allBadges={allBadges}
            allTrackTopicsCount={allTrackTopicsCount}
            totalTopicsCount={totalTopicsCount}
            totalTracksCount={totalTracksCount}
            onNextTopic={handleNextNavigation}
            nextTopicTitle={
              nextTopicId
                ? `다음 토픽`
                : track.projectFile
                ? `미니 프로젝트`
                : null
            }
          />
        </div>

        {/* Tab 4: FAQ Bot */}
        <div className={activeTab === "faq" ? `${tabCardClassName} block` : "hidden"}>
          <FaqChatbot faqList={topic.faq} topicTitle={topic.title} />
        </div>
      </div>

      {/* 4. Bottom Topic Step Navigation */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        {prevTopicId ? (
          <Link
            href={`/tracks/${track.id}/${prevTopicId}`}
            prefetch={false}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> 이전 토픽
          </Link>
        ) : (
          <Link
            href="/"
            prefetch={false}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
          >
            학습 지도로
          </Link>
        )}

        {nextTopicId && (
          <button
            type="button"
            onClick={handleNextNavigation}
            disabled={!isNextUnlocked}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              isNextUnlocked
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
          >
            <span>다음 토픽</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {!nextTopicId && track.projectFile && (
          <Link
            href={`/tracks/${track.id}/project`}
            prefetch={false}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              isCompleted
                ? "bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 pointer-events-none opacity-50"
            }`}
          >
            <span>미니 프로젝트 도전</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
