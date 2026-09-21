"use client";

import React, { useRef, useState } from "react";
import { ProjectReport } from "@/types/content";
import { toPng } from "html-to-image";
import {
  Download,
  Share2,
  CheckCircle2,
  Sparkles,
  BarChart2,
  Calendar,
  Layers,
  FileCheck,
} from "lucide-react";

interface ReportCardProps {
  report: ProjectReport;
  projectTitle?: string;
  trackTitle?: string;
  userName?: string;
  completedAt?: string;
}

export function ReportCard({
  report,
  projectTitle,
  trackTitle,
  userName = "KDT 학습자",
  completedAt,
}: ReportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayTitle = projectTitle || report.title || trackTitle || "미니 프로젝트";

  // Replace placeholders in template with computedValues
  let renderedText = report.template;
  if (report.computedValues) {
    Object.entries(report.computedValues).forEach(([key, val]) => {
      renderedText = renderedText.replace(new RegExp(`{${key}}`, "g"), String(val));
    });
  }

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${displayTitle.replace(/\s+/g, "_")}_리포트.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to capture report card image:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(
        `📊 [${displayTitle} 완주 리포트]\n\n${renderedText}\n\n#UBION #KDT #DataLab #완주리포트`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentDate =
    completedAt ||
    new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="space-y-6">
      {/* Visual Report Card to Capture */}
      <div
        ref={cardRef}
        className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white border border-indigo-500/30 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-indigo-400 tracking-wider uppercase">
                UBION KDT DataLab Project Certificate
              </div>
              <h3 className="text-xl font-extrabold text-white">
                {report.title}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>완주 인증</span>
          </div>
        </div>

        {/* Learner & Project Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-6 border-b border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400">수강생</span>
            <div className="font-bold text-slate-100 text-sm mt-0.5">{userName}</div>
          </div>
          <div>
            <span className="text-slate-400">학습 과정</span>
            <div className="font-bold text-slate-100 text-sm mt-0.5">{trackTitle || displayTitle}</div>
          </div>
          <div>
            <span className="text-slate-400">완료 일자</span>
            <div className="font-bold text-slate-100 text-sm mt-0.5">{currentDate}</div>
          </div>
        </div>

        {/* Main Generated Analysis Text */}
        <div className="py-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
            <FileCheck className="w-4 h-4" />
            <span>분석 및 문제 해결 리포트 요약</span>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {renderedText}
          </div>
        </div>

        {/* Concepts Used Tag Pills */}
        {report.conceptsUsed && report.conceptsUsed.length > 0 && (
          <div className="pt-2">
            <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>활용 개념 및 기술 스택:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.conceptsUsed.map((concept, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 text-xs font-medium border border-indigo-800/60"
                >
                  #{concept}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Card Footer Brand Watermark */}
        <div className="mt-8 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>UBION KDT DataLab · 실습 및 실무 프로젝트 인증서</span>
          <span className="font-mono">ubion-kdt</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleShare}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center gap-1.5"
        >
          <Share2 className="w-4 h-4" />
          <span>{copied ? "복사 완료!" : "텍스트 복사"}</span>
        </button>

        <button
          onClick={handleDownloadImage}
          disabled={downloading}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? "이미지 생성 중..." : "인증 카드 이미지 다운로드"}</span>
        </button>
      </div>
    </div>
  );
}
