import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCodingTestProblem,
  getCodingTestProblems,
  getAllCodingTestProblems,
  getSampleDatabase,
} from "@/lib/content";
import { CodingTestRunner } from "@/components/coding-test/CodingTestRunner";

interface CodingTestProblemPageProps {
  params: {
    lang: string;
    problemId: string;
  };
}

export function generateStaticParams() {
  const problems = getAllCodingTestProblems();
  if (!problems || problems.length === 0) {
    return [{ lang: "python", problemId: "_empty" }];
  }
  return problems.map((p) => ({
    lang: p.lang,
    problemId: p.id,
  }));
}

export async function generateMetadata({
  params,
}: CodingTestProblemPageProps): Promise<Metadata> {
  const { lang, problemId } = params;
  if (lang !== "python" && lang !== "sql") {
    return { title: "코딩테스트 · UBION KDT DataLab" };
  }
  const problem = getCodingTestProblem(lang, problemId);
  const langTitle = lang === "python" ? "파이썬" : "SQL";

  if (!problem) {
    return {
      title: `문제 풀이 · ${langTitle} 코딩테스트 · UBION KDT DataLab`,
    };
  }

  return {
    title: `${problem.title} · ${langTitle} 코딩테스트 · UBION KDT DataLab`,
    description: `${problem.title} — ${langTitle} ${problem.category} 실전 코딩테스트 문제`,
  };
}

export default function CodingTestProblemPage({
  params,
}: CodingTestProblemPageProps) {
  const { lang, problemId } = params;
  if (lang !== "python" && lang !== "sql") {
    notFound();
  }

  const problem = getCodingTestProblem(lang, problemId);
  if (!problem) {
    notFound();
  }

  const allProblems = getCodingTestProblems(lang);
  const sampleDb = lang === "sql" ? getSampleDatabase("sql") : null;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 py-6 sm:py-8">
      <CodingTestRunner
        lang={lang}
        problem={problem}
        allProblems={allProblems}
        sampleDb={sampleDb}
      />
    </div>
  );
}
