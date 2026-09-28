import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCodingTestProblems, getCodingTestCategories } from "@/lib/content";
import { CodingTestListView } from "@/components/coding-test/CodingTestListView";

interface CodingTestLangPageProps {
  params: {
    lang: string;
  };
}

export function generateStaticParams() {
  return [
    { lang: "python" },
    { lang: "sql" },
  ];
}

export async function generateMetadata({ params }: CodingTestLangPageProps): Promise<Metadata> {
  const { lang } = params;
  const langTitle = lang === "python" ? "파이썬" : lang === "sql" ? "SQL" : lang;
  return {
    title: `${langTitle} 코딩테스트 · UBION KDT DataLab`,
    description: `${langTitle} 실전 코딩테스트 문제 목록 — 유형별 풀이`,
  };
}

export default function CodingTestLangPage({ params }: CodingTestLangPageProps) {
  const { lang } = params;
  if (lang !== "python" && lang !== "sql") {
    notFound();
  }

  const problems = getCodingTestProblems(lang);
  const categories = getCodingTestCategories(lang);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 py-6 sm:py-8">
      <CodingTestListView
        lang={lang}
        problems={problems}
        categories={categories}
      />
    </div>
  );
}
