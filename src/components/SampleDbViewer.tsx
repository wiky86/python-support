"use client";

import React, { useState } from "react";
import { SampleDatabase } from "@/types/content";
import {
  Database,
  Table,
  ChevronDown,
  ChevronUp,
  Key,
  Copy,
  Check,
  FileCode,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";

interface SampleDbViewerProps {
  sampleDb?: SampleDatabase | null;
  defaultOpen?: boolean;
  title?: string;
  dbNote?: string;
  className?: string;
}

export function SampleDbViewer({
  sampleDb,
  defaultOpen = false,
  title,
  dbNote,
  className = "",
}: SampleDbViewerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  // If no sampleDb is available, don't render anything
  if (!sampleDb || !sampleDb.tables) {
    return null;
  }

  const tableNames = Object.keys(sampleDb.tables);
  const [activeTab, setActiveTab] = useState<string>(
    tableNames.length > 0 ? tableNames[0] : "ddl"
  );

  const currentTable = sampleDb.tables[activeTab];

  const handleCopyDdl = async () => {
    if (!sampleDb.ddl) return;
    try {
      await navigator.clipboard.writeText(sampleDb.ddl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const displayTitle = title || `예제 데이터베이스 (${sampleDb.database || "company"} DB)`;

  return (
    <div
      className={`rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs overflow-hidden transition-all ${className}`}
    >
      {/* 1. Header Trigger Bar */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {displayTitle}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-bold">
                MySQL
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span>테이블: {tableNames.join(", ")}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 hidden sm:inline">
            {isOpen ? "스키마 접기" : "스키마 & 데이터 보기"}
          </span>
          <div className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            {isOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </div>
        </div>
      </button>

      {/* 2. Collapsible Body */}
      {isOpen && (
        <div className="px-4 sm:px-6 pb-5 pt-2 border-t border-blue-200/70 dark:border-blue-900/40 space-y-4 animate-fadeIn">
          {/* dbNote or _comment Note */}
          {(dbNote || sampleDb._comment) && (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-blue-100 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                {dbNote ? (
                  <p className="font-medium text-slate-800 dark:text-slate-200">{dbNote}</p>
                ) : (
                  <p>{sampleDb._comment}</p>
                )}
              </div>
            </div>
          )}

          {/* Table Selector Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
            {tableNames.map((tblName) => {
              const tbl = sampleDb.tables[tblName];
              const isSelected = activeTab === tblName;
              return (
                <button
                  key={tblName}
                  type="button"
                  onClick={() => setActiveTab(tblName)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>{tblName}</span>
                  <span
                    className={`px-1.5 py-0.2 text-[10px] rounded ${
                      isSelected
                        ? "bg-blue-700 text-blue-100"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {tbl.rows.length}행
                  </span>
                </button>
              );
            })}

            {sampleDb.ddl && (
              <button
                type="button"
                onClick={() => setActiveTab("ddl")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "ddl"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>DDL (테이블 생성문)</span>
              </button>
            )}
          </div>

          {/* Table Content */}
          {activeTab !== "ddl" && currentTable ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    테이블: <code className="font-mono text-blue-600 dark:text-blue-400">{activeTab}</code>
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    — {currentTable.description}
                  </span>
                </div>
              </div>

              {/* 1. Columns Schema Table */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  1. 컬럼 스키마
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        <th className="py-2 px-3 font-semibold">컬럼명</th>
                        <th className="py-2 px-3 font-semibold">타입</th>
                        <th className="py-2 px-3 font-semibold">제약/키</th>
                        <th className="py-2 px-3 font-semibold">설명</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {currentTable.columns.map((col) => (
                        <tr key={col.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            {col.name}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">
                            {col.type}
                          </td>
                          <td className="py-2 px-3">
                            {col.key === "PK" ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold inline-flex items-center gap-1">
                                <Key className="w-2.5 h-2.5" /> PK
                              </span>
                            ) : col.key === "FK" ? (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold inline-flex items-center gap-1">
                                <Layers className="w-2.5 h-2.5" /> FK
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                            {col.desc || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Sample Rows Table */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span>2. 전체 레코드 ({currentTable.rows.length}행)</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs max-h-72">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 border-b border-slate-200 dark:border-slate-700">
                      <tr className="text-slate-700 dark:text-slate-200">
                        {currentTable.columns.map((col) => (
                          <th key={col.name} className="py-2 px-3 font-mono font-bold whitespace-nowrap">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {currentTable.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                        >
                          {row.map((val, cIdx) => (
                            <td
                              key={cIdx}
                              className="py-1.5 px-3 whitespace-nowrap text-slate-800 dark:text-slate-200"
                            >
                              {val === null ? (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 italic text-[11px]">
                                  NULL
                                </span>
                              ) : typeof val === "number" ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                  {val.toLocaleString()}
                                </span>
                              ) : (
                                <span>{String(val)}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* DDL Tab */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  SQL DDL 스키마 정의문
                </span>
                <button
                  type="button"
                  onClick={handleCopyDdl}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>DDL 복사</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
                <code>{sampleDb.ddl}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
