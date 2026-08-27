"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getLevelProgress } from "@/lib/gamification";
import { ThemeToggle } from "./ThemeToggle";
import { Flame, Award, LogIn, LogOut, Sparkles, BookOpen } from "lucide-react";

export function Navbar() {
  const { user, stats, badges, isConfigured, signOut } = useAuth();
  const { level, percent, xpInCurrentLevel, xpRequiredForNext, xp } = getLevelProgress(stats.xp);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-slate-900 dark:text-white group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="tracking-tight">
              <span className="text-emerald-600 dark:text-emerald-400">Py</span>DataLab
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 rounded-md transition-colors"
            >
              학습 지도
            </Link>
            <Link
              href="/badges"
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 rounded-md transition-colors flex items-center gap-1"
            >
              <Award className="w-4 h-4" />
              배지 도감
            </Link>
          </nav>
        </div>

        {/* Right: Gamification Stats + Theme + User Menu */}
        <div className="flex items-center gap-3">
          {/* Streak Flame */}
          <div
            title={`연속 학습 ${stats.streak_count || 0}일`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900 text-xs font-semibold cursor-default"
          >
            <span aria-hidden="true" className="text-sm leading-none">🔥</span>
            <span>{stats.streak_count || 0}일</span>
          </div>

          {/* Level & XP Bar */}
          <div
            title={`누적 XP: ${xp.toLocaleString()} XP\n다음 레벨(Lv.${level + 1})까지: ${xpInCurrentLevel.toLocaleString()} / ${xpRequiredForNext.toLocaleString()} XP (${percent}%)`}
            className="hidden sm:flex flex-col gap-0.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-w-[130px] cursor-default"
          >
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                <Sparkles className="w-3 h-3" />
                Lv.{level}
              </span>
              <span className="text-slate-600 dark:text-slate-300 text-[11px] font-mono whitespace-nowrap font-medium">
                {xp.toLocaleString()} XP
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Badges count shortcut */}
          <Link
            href="/badges"
            title={`획득한 배지: ${badges.length}개`}
            className="flex items-center gap-1 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors"
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span className="hidden xs:inline">{badges.length}</span>
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Auth */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden lg:inline text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                {user.email}
              </span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isConfigured ? "로그인" : "게스트 모드"}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
