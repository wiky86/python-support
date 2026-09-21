import { Metadata } from "next";
import { getAllCourses, getGlobalBadges, getAllTopics } from "@/lib/content";
import { CourseSelectorView } from "@/components/CourseSelectorView";

export const metadata: Metadata = {
  title: "UBION KDT DataLab — 파이썬 데이터 분석 & 디지털 금융 통합 학습",
  description: "실습과 퀴즈, 미니 프로젝트로 완성하는 UBION KDT 파이썬 데이터 분석 및 디지털 금융 이론 통합 학습 공간",
};

export default function HomePage() {
  const courses = getAllCourses();
  const globalBadges = getGlobalBadges();

  // Dynamic topic counts per course without hardcoding
  const courseTopicCounts: Record<string, number> = {};
  for (const course of courses) {
    const topics = getAllTopics(course.id);
    courseTopicCounts[course.id] = topics.length;
  }

  return (
    <CourseSelectorView
      courses={courses}
      globalBadges={globalBadges}
      courseTopicCounts={courseTopicCounts}
    />
  );
}
