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
  projectTitle: string;
  userName?: string;
}

export function ReportCard({
  report,
  projectTitle,
  userName = "데이터 분석 학습자",
}: ReportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Replace placeholders in template with computedValues
  let renderedText = report.template;
  Object.entries(report.computedValues).forEach(([key, val]) => {
    renderedText = renderedText.replace(new RegExp(`{${key}}`, "g"), String(val));
  });

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${projectTitle.replace(/\s+/g, "_")}_리포트.png`;
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
        `📊 [${projectTitle} 완주 리포트]\n\n${renderedText}\n\n#Python #데이터분석 #PyDataLab`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentDate = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Visual Report Card to Capture */}
      <div
        ref={cardRef}
        className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-white border border-emerald-500/30 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">
                PyData Lab Project Certificate
              </div>
              <h3 className="text-xl font-extrabold text-white">
                {report.title}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            분석 완료
          </div>
        </div>

        {/* Body Stats & Findings */}
        <div className="py-6 space-y-6">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              데이터 분석 종합 결과
            </div>
            <div className="text-sm sm:text-base font-mono leading-relaxed whitespace-pre-line text-emerald-100">
              {renderedText}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(report.computedValues).map(([k, val]) => (
              <div
                key={k}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center"
              >
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                  {k}
                </div>
                <div className="text-base sm:text-lg font-mono font-bold text-white mt-0.5">
                  {String(val)}
                </div>
              </div>
            ))}
          </div>

          {/* Concepts Used Tags */}
          {report.conceptsUsed && report.conceptsUsed.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                활용된 핵심 개념
              </div>
              <div className="flex flex-wrap gap-1.5">
                {report.conceptsUsed.map((concept, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium"
                  >
                    #{concept}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>완료일: {currentDate}</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            PyData Lab • {userName}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          onClick={handleShare}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              텍스트 복사됨!
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              텍스트 공유하기
            </>
          )}
        </button>

        <button
          onClick={handleDownloadImage}
          disabled={downloading}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {downloading ? "이미지 생성 중..." : "리포트 카드 이미지 저장"}
        </button>
      </div>
    </div>
  );
}
