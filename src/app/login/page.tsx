"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { idToEmail, ALLOW_SELF_SIGNUP } from "@/lib/config";
import { useAuth } from "@/lib/auth-context";
import {
  LogIn,
  UserPlus,
  User,
  Lock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Info,
} from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { user, refreshData } = useAuth();
  const isConfigured = isSupabaseConfigured();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMsg("아이디를 입력해 주세요.");
      return;
    }

    if (!password) {
      setErrorMsg("비밀번호를 입력해 주세요.");
      return;
    }

    if (!isConfigured) {
      setErrorMsg("Supabase 연결 설정(NEXT_PUBLIC_SUPABASE_URL, ANON_KEY)을 확인해 주세요.");
      return;
    }

    const email = idToEmail(cleanUsername);
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
          }
          throw error;
        }
        if (data.user) {
          await refreshData();
          router.push("/");
        }
      } else if (mode === "signup") {
        if (!ALLOW_SELF_SIGNUP) {
          setErrorMsg("수강생 계정은 관리자가 일괄 발급합니다. 관리자에게 문의해 주세요.");
          return;
        }

        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          await refreshData();
          router.push("/");
        } else {
          setSuccessMsg("계정이 생성되었습니다. 로그인해 주세요.");
          setMode("signin");
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Guest Mode Notice Banner */}
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            게스트 모드 및 진도 저장 안내
          </div>
          <p className="leading-relaxed text-amber-700 dark:text-amber-300/90">
            게스트 모드에서는 학습 진도가 저장되지 않습니다. 발급받으신 아이디로 로그인하면 진도와 획득한 배지가 계정에 안전하게 저장됩니다.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {mode === "signin" ? "학습 공간 로그인" : "계정 안내"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              발급된 수강생 아이디와 비밀번호로 로그인하세요.
            </p>
          </div>

          {/* Mode Switch Tabs (Login / Signup) */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === "signin"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === "signup"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
              }`}
            >
              회원가입
            </button>
          </div>

          {/* Mode: Sign In or Signup */}
          {mode === "signup" && !ALLOW_SELF_SIGNUP ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  계정 발급 안내
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  수강생 계정은 관리자가 일괄 발급하여 안내해 드립니다.
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  계정 정보(아이디/비밀번호)를 전달받지 못하셨거나 분실하신 경우 교육 담당 관리자 또는 강사에게 문의해 주세요.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMode("signin")}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
              >
                로그인 화면으로 이동
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Username Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  아이디
                </label>
                <input
                  type="text"
                  required
                  autoCapitalize="characters"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="예: DF08001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all uppercase placeholder:normal-case placeholder:font-sans"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  비밀번호
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>로그인 중...</span>
                ) : mode === "signin" ? (
                  <>
                    <LogIn className="w-4 h-4" /> 로그인하기
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> 가입하기
                  </>
                )}
              </button>
            </form>
          )}

          {/* Continue as Guest Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
            >
              로그인 없이 둘러보기 (게스트 모드) →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
