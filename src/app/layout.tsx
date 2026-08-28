import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "PyDataLab — 파이썬 데이터 분석 학습 공간",
  description: "실습과 퀴즈, 미니 프로젝트로 완성하는 파이썬 데이터 분석 학습 공간",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col transition-colors duration-200">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col w-full">{children}</main>
          <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 w-full">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>© {new Date().getFullYear()} PyDataLab. 파이썬 데이터 분석 학습 플랫폼</span>
              <span className="font-mono text-[11px]">Next.js • React • Supabase</span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
