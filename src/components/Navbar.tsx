"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getLevelProgress } from "@/lib/gamification";
import { emailToId } from "@/lib/config";
import { ThemeToggle } from "./ThemeToggle";
import {
  Flame,
  Award,
  LogIn,
  LogOut,
  Sparkles,
  BookOpen,
  User,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  Layers,
  Terminal,
  Landmark,
} from "lucide-react";

export function Navbar() {
  const { user, stats, badges, isConfigured, signOut, isAdmin } = useAuth();
  const pathname = usePathname();
  const { level, percent, xpInCurrentLevel, xpRequiredForNext, xp } = getLevelProgress(stats.xp);
  const studentId = emailToId(user?.email);
  const [coursesOpen, setCoursesOpen] = useState(false);

  const isPython = pathname?.startsWith("/python");
  const isFinance = pathname?.startsWith("/finance");

  return (
    <div className="sticky top-0 z-40 w-full flex flex-col">
      {/* Guest Mode Persistent Notice Bar */}
      {!user && (
        <div className="w-full bg-amber-500 text-amber-950 dark:bg-amber-950/80 dark:text-amber-200 text-[11px] sm:text-xs py-1.5 px-4 text-center font-medium border-b border-amber-600/30 flex items-center justify-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <strong>게스트 모드에서는 학습 진도가 저장되지 않습니다.</strong> 로그인하면 진도가 계정에 저장됩니다.
          </span>
          <Link
            href="/login"
            prefetch={false}
            className="ml-1 underline font-bold hover:text-white dark:hover:text-amber-100 transition-colors"
          >
            로그인하기 →
          </Link>
        </div>
      )}

      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Navigation */}
          <div className="flex items-center gap-6">
            <Link href="/" prefetch={false} className="flex items-center gap-2.5 font-bold text-lg text-slate-900 dark:text-white group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="tracking-tight text-base font-extrabold leading-tight">
                  <span className="text-emerald-600 dark:text-emerald-400">UBION KDT</span>
                  <span className="text-slate-800 dark:text-white"> DataLab</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal leading-none">
                  파이썬 · 디지털 금융
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1.5">
              <Link
                href="/"
                prefetch={false}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  pathname === "/"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                과목 선택
              </Link>

              {/* Course Switcher Tabs */}
              <Link
                href="/python"
                prefetch={false}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  isPython
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80"
                    : "text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400"
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                파이썬 데이터 분석
              </Link>

              <Link
                href="/finance"
                prefetch={false}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  isFinance
                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80"
                    : "text-slate-600 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400"
                }`}
              >
                <Landmark className="w-3.5 h-3.5 text-amber-500" />
                디지털 금융 이론
              </Link>

              <Link
                href="/badges"
                prefetch={false}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  pathname?.startsWith("/badges")
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400"
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                배지 도감
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  prefetch={false}
                  className="px-3 py-1.5 text-xs font-bold text-purple-700 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-200 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  관리자
                </Link>
              )}
            </nav>
          </div>

          {/* Right: Gamification Stats + Theme + User Menu */}
          <div className="flex items-center gap-3">
            {/* Streak Flame */}
            <div
              title={`연속 학습 ${stats.streak_count || 0}일 (계정 전체)`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900 text-xs font-semibold cursor-default"
            >
              <span aria-hidden="true" className="text-sm leading-none">🔥</span>
              <span>{stats.streak_count || 0}일</span>
            </div>

            {/* Unified Level & XP Bar */}
            <div
              title={`통합 누적 XP: ${xp.toLocaleString()} XP\n다음 레벨(Lv.${level + 1})까지: ${xpInCurrentLevel.toLocaleString()} / ${xpRequiredForNext.toLocaleString()} XP (${percent}%)`}
              className="hidden sm:flex flex-col gap-0.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-w-[130px] cursor-default"
            >
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                  <Sparkles className="w-3 h-3" />
                  통합 Lv.{level}
                </span>
                <span className="text-slate-600 dark:text-slate-300 text-[11px] font-mono whitespace-nowrap font-medium">
                  {xp.toLocaleString()} XP
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {/* Badges count shortcut */}
            <Link
              href="/badges"
              prefetch={false}
              title={`획득한 배지: ${badges.length}개`}
              className="flex items-center gap-1 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors"
            >
              <Award className="w-4 h-4 text-amber-500" />
              <span className="hidden xs:inline font-mono font-bold">{badges.length}</span>
            </Link>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Auth: ID Display & Logout or Login Button */}
            {user ? (
              <div className="flex items-center gap-2 pl-1">
                {isAdmin && (
                  <Link
                    href="/admin"
                    prefetch={false}
                    title="관리자 대시보드"
                    className="md:hidden p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </Link>
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700">
                  <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{studentId || user.email}</span>
                  {isAdmin && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold tracking-wider">
                      ADMIN
                    </span>
                  )}
                </div>
                <button
                  onClick={signOut}
                  title="로그아웃"
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                prefetch={false}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>로그인</span>
              </Link>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
