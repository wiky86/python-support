import { Metadata } from "next";
import {
  getAllCourses,
  getGlobalBadges,
  getAllTopics,
  getDiagnostic,
  getRoadmap,
} from "@/lib/content";
import { CourseSelectorView } from "@/components/CourseSelectorView";

export const metadata: Metadata = {
  title: "UBION KDT DataLab — 파이썬 · 디지털 금융 · SQL · 금융 데이터 분석 통합 학습",
  description: "실습과 퀴즈, 미니 프로젝트로 완성하는 UBION KDT 파이썬 데이터 분석, 디지털 금융 이론, SQL 데이터베이스 및 금융 데이터 분석 통합 학습 공간",
};

export default function HomePage() {
  const courses = getAllCourses();
  const globalBadges = getGlobalBadges();

  // Dynamic topic counts per course without hardcoding
  const courseTopicCounts: Record<string, number> = {};
  const courseHasDiagnostic: Record<string, boolean> = {};
  const courseHasRoadmap: Record<string, boolean> = {};

  for (const course of courses) {
    const topics = getAllTopics(course.id);
    courseTopicCounts[course.id] = topics.length;
    courseHasDiagnostic[course.id] = getDiagnostic(course.id) !== null;
    courseHasRoadmap[course.id] = getRoadmap(course.id) !== null;
  }

  return (
    <CourseSelectorView
      courses={courses}
      globalBadges={globalBadges}
      courseTopicCounts={courseTopicCounts}
      courseHasDiagnostic={courseHasDiagnostic}
      courseHasRoadmap={courseHasRoadmap}
    />
  );
}
