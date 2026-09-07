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
  Layers,
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

  const courseId = track.courseId || topic.courseId || "python";

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
      router.push(`/${courseId}/tracks/${track.id}/${nextTopicId}`);
    } else if (track.projectFile) {
      router.push(`/${courseId}/tracks/${track.id}/project`);
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
            href={`/${courseId}`}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            과목 학습 지도로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Unified Tab Card Wrapper CSS
  const tabCardClassName =
    "p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 w-full";

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
          <span className="text-slate-900 dark:text-white font-bold">
            {topic.title}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold font-mono">
                TRACK {track.order} · TOPIC {topic.order}
              </span>
              {isCompleted && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  학습 완료
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {topic.title}
            </h1>
          </div>

          {/* Prev / Next Topic Navigation Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {prevTopicId ? (
              <Link
                href={`/${courseId}/tracks/${track.id}/${prevTopicId}`}
                prefetch={false}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="이전 토픽"
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
            ) : null}

            {nextTopicId ? (
              <button
                onClick={handleNextNavigation}
                disabled={!isNextUnlocked}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isNextUnlocked
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60"
                }`}
              >
                <span>다음 토픽</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : track.projectFile ? (
              <button
                onClick={handleNextNavigation}
                disabled={!isNextUnlocked}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isNextUnlocked
                    ? "bg-purple-600 hover:bg-purple-700 text-white shadow-sm cursor-pointer"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60"
                }`}
              >
                <span>미니 프로젝트</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* 2. Unified 4-Step Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        <button
          onClick={() => changeTab("learn")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "learn"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. 개념 학습</span>
        </button>

        <button
          onClick={() => changeTab("practice")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "practice"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>2. 빈칸 실습</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
            {topic.fillBlanks.length}
          </span>
        </button>

        <button
          onClick={() => changeTab("quiz")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "quiz"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>3. 복습 퀴즈</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
            {topic.quiz.questions.length}
          </span>
        </button>

        <button
          onClick={() => changeTab("faq")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "faq"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>4. FAQ 봇</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
            {topic.faq?.length || 0}
          </span>
        </button>
      </div>

      {/* 3. Tab Content View Area */}
      <div className="transition-all duration-200">
        {/* TAB 1: Concepts Markdown */}
        {activeTab === "learn" && (
          <div className={tabCardClassName}>
            <MarkdownViewer content={topic.content} />

            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                개념 확인을 마쳤다면 빈칸 실습으로 직접 코드를 완성해 보세요.
              </span>
              <button
                onClick={() => changeTab("practice")}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                빈칸 실습으로 이동 →
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Fill in Blank Practice */}
        {activeTab === "practice" && (
          <div className={tabCardClassName}>
            <FillInBlankList
              items={topic.fillBlanks}
              title="코드/개념 실습 (빈칸 채우기)"
              onAllCompleted={() => {
                // Optional prompt to jump to quiz
              }}
            />

            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => changeTab("learn")}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
              >
                ← 개념 다시 보기
              </button>
              <button
                onClick={() => changeTab("quiz")}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                복습 퀴즈 풀기 →
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Quiz Runner */}
        {activeTab === "quiz" && (
          <div className={tabCardClassName}>
            <QuizRunner
              quiz={topic.quiz}
              topicId={topic.id}
              trackId={track.id}
              courseId={courseId}
              allBadges={allBadges}
              allTrackTopicsCount={allTrackTopicsCount}
              totalTopicsCount={totalTopicsCount}
              totalTracksCount={totalTracksCount}
              nextTopicTitle={nextTopicId ? `다음 토픽` : track.projectFile ? "미니 프로젝트" : null}
              onNextTopic={handleNextNavigation}
            />
          </div>
        )}

        {/* TAB 4: FAQ Chatbot */}
        {activeTab === "faq" && (
          <div className={tabCardClassName}>
            <FaqChatbot faqItems={topic.faq || []} topicTitle={topic.title} />
          </div>
        )}
      </div>
    </div>
  );
}
