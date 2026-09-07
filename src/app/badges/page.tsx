import { Metadata } from "next";
import {
  getAllCourses,
  getAllBadges,
  getGlobalBadges,
  getCourseBadges,
  getAllTracks,
} from "@/lib/content";
import { BadgesView } from "@/components/BadgesView";
import { BadgeDefinition } from "@/types/content";

export const metadata: Metadata = {
  title: "통합 배지 도감 — KDT DataLab",
  description: "파이썬 데이터 분석 및 디지털 금융 이론, 통합 성취 배지 도감",
};

export default function BadgesPage() {
  const courses = getAllCourses();
  const allBadges = getAllBadges();
  const globalBadges = getGlobalBadges();

  const courseBadgesMap: Record<string, BadgeDefinition[]> = {};
  const trackTitles: Record<string, string> = {};

  for (const course of courses) {
    courseBadgesMap[course.id] = getCourseBadges(course.id);
    const tracks = getAllTracks(course.id);
    tracks.forEach((t) => {
      trackTitles[t.id] = t.title;
    });
  }

  return (
    <BadgesView
      courses={courses}
      allBadges={allBadges}
      globalBadges={globalBadges}
      courseBadgesMap={courseBadgesMap}
      trackTitles={trackTitles}
    />
  );
}
