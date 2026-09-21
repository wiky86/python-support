"use client";

import React, { useState } from "react";
import { PieChart, TrendingUp, ShieldCheck, RefreshCw } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  defaultWeight: number;
  defaultReturn: number;
  color: string;
  bgClass: string;
}

const INITIAL_ASSETS: Asset[] = [
  { id: "k-stock", name: "국내 주식", defaultWeight: 30, defaultReturn: 8.0, color: "bg-emerald-500", bgClass: "border-emerald-500/30" },
  { id: "us-stock", name: "해외 주식", defaultWeight: 30, defaultReturn: 10.0, color: "bg-cyan-500", bgClass: "border-cyan-500/30" },
  { id: "bond", name: "국공채 / 채권", defaultWeight: 30, defaultReturn: 4.0, color: "bg-indigo-500", bgClass: "border-indigo-500/30" },
  { id: "cash", name: "단기금융 / 현금", defaultWeight: 10, defaultReturn: 2.5, color: "bg-amber-500", bgClass: "border-amber-500/30" },
];

export function PortfolioReturnWidget() {
  const [totalAmount, setTotalAmount] = useState(1000); // 만원 단위
  const [weights, setWeights] = useState<Record<string, number>>({
    "k-stock": 30,
    "us-stock": 30,
    "bond": 30,
    "cash": 10,
  });
  const [returns, setReturns] = useState<Record<string, number>>({
    "k-stock": 8.0,
    "us-stock": 10.0,
    "bond": 4.0,
    "cash": 2.5,
  });

  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);

  // Weighted Expected Return: E(Rp) = sum(wi * Ri)
  const weightedReturn =
    weightSum > 0
      ? Object.keys(weights).reduce((acc, k) => {
          const w = (weights[k] || 0) / weightSum;
          const r = returns[k] || 0;
          return acc + w * r;
        }, 0)
      : 0;

  const expectedProfit = Math.round((totalAmount * 10000 * (weightedReturn / 100)) / 10000); // 만원
  const finalPortfolioTotal = totalAmount + expectedProfit;

  const handleWeightChange = (id: string, val: number) => {
    setWeights((prev) => ({
      ...prev,
      [id]: val,
    }));
  };

  const handleReturnChange = (id: string, val: number) => {
    setReturns((prev) => ({
      ...prev,
      [id]: val,
    }));
  };

  return (
    <div className="p-5 sm:p-7 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              포트폴리오 수익률 계산기 <span className="text-[11px] font-mono font-normal text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">Track 5 퀀트·자산배분 맛보기</span>
            </h3>
            <p className="text-xs text-slate-400">자산별 비중과 기대수익률을 조정해 포트폴리오 가중평균 수익률을 산출해보세요.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Asset Controls */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>자산 배분 비중 &amp; 기대수익률 설정</span>
            <span className={`font-mono font-bold ${weightSum === 100 ? "text-emerald-400" : "text-amber-400"}`}>
              비중 합계: {weightSum}% {weightSum !== 100 && "(자동 정규화 산출)"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INITIAL_ASSETS.map((asset) => {
              const curW = weights[asset.id] ?? asset.defaultWeight;
              const curR = returns[asset.id] ?? asset.defaultReturn;

              return (
                <div
                  key={asset.id}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${asset.color}`} />
                      <span className="text-xs font-bold text-slate-200">{asset.name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-300">{curW}%</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>비중</span>
                      <span className="font-mono">{curW}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={curW}
                      onChange={(e) => handleWeightChange(asset.id, Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>연간 기대수익률</span>
                      <span className="font-mono text-emerald-400">{curR}%</span>
                    </div>
                    <input
                      type="range"
                      min={-5}
                      max={25}
                      step={0.5}
                      value={curR}
                      onChange={(e) => handleReturnChange(asset.id, Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Allocation Stack Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="text-[11px] text-slate-400 font-mono">자산 배분 스택 비중:</div>
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
              {INITIAL_ASSETS.map((asset) => {
                const w = weightSum > 0 ? ((weights[asset.id] || 0) / weightSum) * 100 : 25;
                return (
                  <div
                    key={asset.id}
                    style={{ width: `${w}%` }}
                    className={`${asset.color} h-full transition-all duration-300`}
                    title={`${asset.name}: ${Math.round(w)}%`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Output Metrics */}
        <div className="space-y-4 border-l border-slate-800 pl-0 md:pl-5">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-center">
            <div className="text-xs text-slate-400 font-medium">포트폴리오 가중평균 기대수익률</div>
            <div className="text-3xl font-black font-mono text-cyan-400 mt-1">
              {weightedReturn.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-400">
              E(Rp) = Σ (wi × Ri)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-center">
            <div className="text-xs text-slate-400 font-medium">1,000만 원 투자 시 1년 후 예상 수익</div>
            <div className="text-xl font-extrabold font-mono text-emerald-400 mt-1">
              +{expectedProfit.toLocaleString()}만 원
            </div>
            <div className="text-[10px] text-slate-400">
              예상 총 자산: {finalPortfolioTotal.toLocaleString()}만 원
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
            <div className="font-bold text-slate-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              자산배분의 핵심 원리
            </div>
            <p>
              주식과 채권 등 상관관계가 낮은 자산을 섞으면, 전체 기대수익률을 지키면서도 특정 자산 폭락 시 변동성(위험)을 획기적으로 낮출 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
