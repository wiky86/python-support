"use client";

import React, { useState } from "react";
import { FillInBlank as FillInBlankType } from "@/types/content";
import { checkFillInBlank } from "@/lib/progress";
import { CheckCircle, AlertCircle, Terminal, HelpCircle } from "lucide-react";

interface FillInBlankProps {
  items: FillInBlankType[];
  title?: string;
  onAllCompleted?: () => void;
}

export function FillInBlankList({
  items,
  title = "코드 실습 (빈칸 채우기)",
  onAllCompleted,
}: FillInBlankProps) {
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean | null>>({});

  const handleInputChange = (id: string, value: string) => {
    setUserInputs((prev) => ({ ...prev, [id]: value }));
    // reset status on edit
    if (results[id] !== undefined) {
      setResults((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleCheck = (item: FillInBlankType) => {
    const input = userInputs[item.id] || "";
    const isCorrect = checkFillInBlank(input, item.answers);

    const nextResults = { ...results, [item.id]: isCorrect };
    setResults(nextResults);

    // Check if all are correct
    if (isCorrect) {
      const allDone = items.every(
        (it) => it.id === item.id || nextResults[it.id] === true
      );
      if (allDone && onAllCompleted) {
        onAllCompleted();
      }
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    item: FillInBlankType
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCheck(item);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <Terminal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h3>
      </div>

      <div className="space-y-5">
        {items.map((item, idx) => {
          const isCorrect = results[item.id] === true;
          const isWrong = results[item.id] === false;
          const value = userInputs[item.id] || "";

          // Render code with the blank input box
          // Replace `______` with an interactive input
          const parts = item.code.split("______");

          return (
            <div
              key={item.id}
              className={`p-5 rounded-xl border transition-all ${
                isCorrect
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                  : isWrong
                  ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
              }`}
            >
              {/* Question / Prompt */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                    {idx + 1}
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {item.prompt}
                  </p>
                </div>

                {isCorrect && (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-4 h-4" /> 정답!
                  </span>
                )}
                {isWrong && (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 animate-shake">
                    <AlertCircle className="w-4 h-4" /> 다시 시도
                  </span>
                )}
              </div>

              {/* Code Snippet Box with Blank Input */}
              <div className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-sm border border-slate-800 overflow-x-auto">
                <div className="flex items-center flex-wrap gap-1 leading-relaxed">
                  {parts.map((part, pIdx) => (
                    <React.Fragment key={pIdx}>
                      <span className="whitespace-pre">{part}</span>
                      {pIdx < parts.length - 1 && (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            handleInputChange(item.id, e.target.value)
                          }
                          onKeyDown={(e) => handleKeyDown(e, item)}
                          placeholder="빈칸 입력"
                          className={`inline-block px-2.5 py-1 text-sm font-mono rounded border transition-colors outline-none focus:ring-2 ${
                            isCorrect
                              ? "bg-emerald-950 text-emerald-300 border-emerald-500 focus:ring-emerald-500"
                              : isWrong
                              ? "bg-rose-950 text-rose-300 border-rose-500 focus:ring-rose-500"
                              : "bg-slate-900 text-amber-300 border-amber-500/60 focus:border-amber-400 focus:ring-amber-400/30"
                          } min-w-[120px] max-w-[200px]`}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Action & Output Area */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => handleCheck(item)}
                  disabled={!value.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white disabled:opacity-50 transition-colors shadow-sm"
                >
                  확인하기 (Enter)
                </button>

                {isWrong && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    입력한 코드를 다시 확인해 보세요. (공백이나 따옴표는 자동 정규화됩니다)
                  </p>
                )}
              </div>

              {/* Stored Expected Output (SPEC 3.4) & Detailed Explanation */}
              {isCorrect && (
                <div className="mt-4 pt-3 border-t border-emerald-200 dark:border-emerald-900/50 space-y-3">
                  <div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5" />
                      예상 실행 결과:
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs whitespace-pre-wrap">
                      {item.output ? item.output : "(출력 없음)"}
                    </div>
                  </div>

                  {item.explain && (
                    <div className="p-3 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800/70 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 mr-1.5">
                        💡 상세 해설:
                      </span>
                      {item.explain}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
