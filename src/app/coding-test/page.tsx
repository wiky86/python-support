import { Metadata } from "next";
import { getCodingTestProblems, getCodingTestCategories } from "@/lib/content";
import { CodingTestLandingView } from "@/components/coding-test/CodingTestLandingView";

export const metadata: Metadata = {
  title: "코딩테스트 · UBION KDT DataLab",
  description: "파이썬 및 SQL 실전 문제은행 — 유형별 문제 풀이 및 실력 검증",
};

export default function CodingTestPage() {
  const pythonProblems = getCodingTestProblems("python");
  const sqlProblems = getCodingTestProblems("sql");
  const pythonCategories = getCodingTestCategories("python");
  const sqlCategories = getCodingTestCategories("sql");

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 py-6 sm:py-8">
      <CodingTestLandingView
        pythonProblems={pythonProblems}
        sqlProblems={sqlProblems}
        pythonCategories={pythonCategories}
        sqlCategories={sqlCategories}
      />
    </div>
  );
}
