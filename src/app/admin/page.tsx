import { Metadata } from "next";
import { getAllCourses, getAllTopics } from "@/lib/content";
import { AdminView } from "@/components/AdminView";

export const metadata: Metadata = {
  title: "관리자 대시보드 — KDT DataLab",
  description: "KDT DataLab 파이썬 및 디지털 금융 수강생 학습 진도 및 현황 관리자 대시보드",
};

export default function AdminPage() {
  const courses = getAllCourses();
  const allTopics = getAllTopics();

  const courseTopicCounts: Record<string, number> = {};
  for (const course of courses) {
    const topics = getAllTopics(course.id);
    courseTopicCounts[course.id] = topics.length;
  }

  return (
    <AdminView
      courses={courses}
      courseTopicCounts={courseTopicCounts}
      totalTopicsCount={allTopics.length}
    />
  );
}
