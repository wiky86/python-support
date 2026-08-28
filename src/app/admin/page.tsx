import { Metadata } from "next";
import { getAllTopics } from "@/lib/content";
import { AdminView } from "@/components/AdminView";

export const metadata: Metadata = {
  title: "관리자 대시보드 — PyDataLab",
  description: "PyDataLab 수강생 학습 진도 및 현황 관리자 대시보드",
};

export default function AdminPage() {
  const allTopics = getAllTopics();
  return <AdminView totalTopicsCount={allTopics.length} />;
}
