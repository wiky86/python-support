"use client";

import React, { useState } from "react";
import { Calculator, TrendingUp, Sparkles, RefreshCw } from "lucide-react";

export function CompoundInterestWidget() {
  const [principal, setPrincipal] = useState(1000); // 단위: 만원
  const [annualRate, setAnnualRate] = useState(7); // %
  const [years, setYears] = useState(10); // 년
  const [frequency, setFrequency] = useState<"yearly" | "monthly">("yearly");

  // Calculations
  const r = annualRate / 100;
  const n = frequency === "monthly" ? 12 : 1;
  const t = years;
  const P = principal * 10000; // 원 단위

  // Compound amount: A = P * (1 + r/n)^(n*t)
  const compoundTotal = Math.round(P * Math.pow(1 + r / n, n * t));
  const compoundInterest = compoundTotal - P;

  // Simple amount: A = P * (1 + r*t)
  const simpleTotal = Math.round(P * (1 + r * t));
  const simpleInterest = simpleTotal - P;

  const extraFromCompound = compoundInterest - simpleInterest;

  // Yearly progression data for visual chart
  const milestones = [];
  const step = Math.max(1, Math.floor(years / 5));
  for (let y = 1; y <= years; y++) {
    if (y === 1 || y % step === 0 || y === years) {
      const cAmt = Math.round(P * Math.pow(1 + r / n, n * y));
      const sAmt = Math.round(P * (1 + r * y));
      milestones.push({ year: y, compound: cAmt, simple: sAmt });
    }
  }

  return (
    <div className="p-5 sm:p-7 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              복리 계산기 <span className="text-[11px] font-mono font-normal text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">Track 2 Finance 입문 맛보기</span>
            </h3>
            <p className="text-xs text-slate-400">원금과 이율, 기간을 조절해 복리의 마법을 체감해보세요.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Controls */}
        <div className="space-y-4 md:col-span-1 border-r border-slate-800 pr-0 md:pr-5">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>초기 원금</span>
              <span className="font-bold text-amber-400 font-mono">{principal.toLocaleString()}만 원</span>
            </div>
            <input
              type="range"
              min={100}
              max={10000}
              step={100}
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>연 이자율 / 수익률</span>
              <span className="font-bold text-amber-400 font-mono">{annualRate}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              step={0.5}
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>투자 / 거치 기간</span>
              <span className="font-bold text-amber-400 font-mono">{years}년</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1.5">복리 계산 주기</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFrequency("yearly")}
                className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  frequency === "yearly"
                    ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow"
                    : "bg-slate-800/60 text-slate-300 border-slate-700"
                }`}
              >
                연복리 (1년 단위)
              </button>
              <button
                type="button"
                onClick={() => setFrequency("monthly")}
                className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  frequency === "monthly"
                    ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow"
                    : "bg-slate-800/60 text-slate-300 border-slate-700"
                }`}
              >
                월복리 (1개월 단위)
              </button>
            </div>
          </div>
        </div>

        {/* Results Overview */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
              <div className="text-[11px] text-slate-400">최종 만기 수령액</div>
              <div className="text-xl font-extrabold font-mono text-amber-400 mt-1">
                {(compoundTotal / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만 원
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                원금 대비 {Math.round((compoundTotal / P) * 100)}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
              <div className="text-[11px] text-slate-400">복리 총 이자 수익</div>
              <div className="text-xl font-extrabold font-mono text-emerald-400 mt-1">
                +{(compoundInterest / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만 원
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                순수 이자 수익
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
              <div className="text-[11px] text-slate-400">단리 대비 추가 수익</div>
              <div className="text-xl font-extrabold font-mono text-cyan-400 mt-1">
                +{(extraFromCompound / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만 원
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                이자가 낳은 이자
              </div>
            </div>
          </div>

          {/* Mini Milestone Growth Bar */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>연도별 자산 성장 시뮬레이션</span>
              <span className="text-[10px] text-slate-500 font-mono">단리 vs 복리 격차</span>
            </div>

            <div className="space-y-2">
              {milestones.map((m) => {
                const maxVal = compoundTotal;
                const cWidth = Math.max(8, (m.compound / maxVal) * 100);
                const sWidth = Math.max(8, (m.simple / maxVal) * 100);

                return (
                  <div key={m.year} className="space-y-1 text-xs">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>{m.year}년차</span>
                      <span>
                        복리 {(m.compound / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원 / 단리 {(m.simple / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                      <div
                        className="h-full bg-slate-600 absolute left-0 top-0 rounded-full"
                        style={{ width: `${sWidth}%` }}
                      />
                      <div
                        className="h-full bg-amber-500 absolute left-0 top-0 rounded-full opacity-80"
                        style={{ width: `${cWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              💡 <strong>핵심 포인트:</strong> 아인슈타인이 &quot;세계 8대 불가사의&quot;라 칭한 복리는 시간이 지날수록 이자가 원금에 가산되어 자산이 지수 곡선으로 폭발적 성장합니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
