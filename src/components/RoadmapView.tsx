"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Course, Track, RoadmapData } from "@/types/content";
import { UserDiagnosticRow } from "@/types/database";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { getDiagnosticGrade } from "@/lib/progress";
import {
  Compass,
  Sparkles,
  ArrowLeft,
  Layers,
  BookOpen,
  HelpCircle,
  TrendingUp,
  Terminal,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Calculator,
  PieChart,
} from "lucide-react";
import { CompoundInterestWidget } from "./widgets/CompoundInterestWidget";
import { PortfolioReturnWidget } from "./widgets/PortfolioReturnWidget";

interface RoadmapViewProps {
  course: Course;
  roadmap: RoadmapData;
  tracks: Track[];
}

export function RoadmapView({ course, roadmap, tracks }: RoadmapViewProps) {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const [diagResult, setDiagResult] = useState<UserDiagnosticRow | null>(null);
  const [activeWidgetTab, setActiveWidgetTab] = useState<string>(
    roadmap.previewWidgets?.[0]?.id || "compound-interest"
  );

  const isPython = course.id === "python";
  const isFinance = course.id === "finance";

  // Map tracks by ID for fast lookup
  const trackMap = React.useMemo(() => {
    const map: Record<string, Track> = {};
    tracks.forEach((t) => {
      map[t.id] = t;
    });
    return map;
  }, [tracks]);

  // Load user diagnostic result if present to overlay track strength indicators
  useEffect(() => {
    async function loadDiag() {
      if (!user) {
        const local = localStorage.getItem(`guest_diag_${course.id}`);
        if (local) {
          try {
            setDiagResult(JSON.parse(local));
          } catch {}
        }
        return;
      }
      try {
        const { data } = await (supabase.from("user_diagnostics") as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("course", course.id)
          .maybeSingle();
        if (data) setDiagResult(data as UserDiagnosticRow);
      } catch (err) {
        console.error("Error loading roadmap diag overlay:", err);
      }
    }
    loadDiag();
  }, [user, course.id, supabase]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10 animate-fadeIn">
      {/* 0. Back navigation */}
      <div>
        <Link
          href={`/${course.id}`}
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{course.title} 학습 지도로 돌아가기</span>
        </Link>
      </div>

      {/* 1. Hero Headline & Outcome Banner */}
      <div
        className={`rounded-3xl p-8 sm:p-10 text-white border shadow-2xl relative overflow-hidden ${
          isPython
            ? "bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-emerald-500/20"
            : "bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border-amber-500/20"
        }`}
      >
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                isPython
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>과정 전체 로드맵 &amp; 실무 여정</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">총 {roadmap.journey.length}개 정거장</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            {roadmap.headline}
          </h1>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
            {roadmap.outcome}
          </p>

          {roadmap.note && (
            <div className="pt-2 text-xs text-slate-400 leading-relaxed border-t border-white/10">
              📌 {roadmap.note}
            </div>
          )}
        </div>
      </div>

      {/* 2. Journey Timeline Steps (2-Layer layout) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className={`w-5 h-5 ${isPython ? "text-emerald-500" : "text-amber-500"}`} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              트랙별 실무 여정 및 핵심 가치
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            * 지도를 보는 화면이며, 실제 학습 시작은 학습 지도 화면에서 순차적으로 진행됩니다.
          </span>
        </div>

        <div className="space-y-6">
          {roadmap.journey.map((item, idx) => {
            const diagScore = diagResult?.track_scores?.[item.trackId];
            const diagGrade = diagScore !== undefined ? getDiagnosticGrade(diagScore) : null;
            const targetTrack = trackMap[item.trackId];

            return (
              <div
                key={item.trackId}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Station Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-mono font-bold text-white shadow ${
                        isPython ? "bg-emerald-600" : "bg-amber-600"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold font-mono text-slate-400">
                        STEP {item.order} • {item.trackId.toUpperCase()}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {item.stationTitle}
                      </h3>
                    </div>
                  </div>

                  {/* Diagnostic Overlay Badge if taken */}
                  {diagGrade && (
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${diagGrade.badgeClass}`}>
                        사전 진단: {diagGrade.label} ({Math.round((diagScore || 0) * 100)}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* 3 Value Columns Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* What you learn */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>무엇을 배우나요?</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.whatYouLearn}
                    </p>
                  </div>

                  {/* Why it matters */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <div className="font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>왜 중요한가요?</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.whyItMatters}
                    </p>
                  </div>

                  {/* Real World Application */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <div className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>실무에서는?</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.realWorld}
                    </p>
                  </div>
                </div>

                {/* Optional Info Preview */}
                {item.preview && item.preview.type === "info" && item.preview.note && (
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 text-xs text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span>{item.preview.note}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Preview Widgets Interactive Section (if course has widgets) */}
      {roadmap.previewWidgets && roadmap.previewWidgets.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  실무 개념 맛보기 인터랙티브 위젯
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                학습에 들어가기 전, 숫자를 직접 조절하며 이론의 핵심 메커니즘을 미리 체험해보세요.
              </p>
            </div>

            {/* Widget switcher tabs */}
            <div className="flex items-center gap-2">
              {roadmap.previewWidgets.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setActiveWidgetTab(w.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeWidgetTab === w.id
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {w.title.replace(" (맛보기)", "")}
                </button>
              ))}
            </div>
          </div>

          {/* Active Widget View */}
          <div>
            {activeWidgetTab === "compound-interest" && <CompoundInterestWidget />}
            {activeWidgetTab === "portfolio-return" && <PortfolioReturnWidget />}
          </div>
        </div>
      )}

      {/* 4. Bottom Action */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
        <Link
          href={`/${course.id}`}
          prefetch={false}
          className="px-8 py-3.5 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm shadow hover:opacity-95 transition-all"
        >
          {course.title} 학습 지도로 이동하여 시작하기
        </Link>
      </div>
    </div>
  );
}
