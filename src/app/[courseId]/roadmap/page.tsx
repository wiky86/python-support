import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getAllCourses, getCourse, getRoadmap, getAllTracks } from "@/lib/content";
import { RoadmapView } from "@/components/RoadmapView";

interface RoadmapPageProps {
  params: {
    courseId: string;
  };
}

export function generateStaticParams() {
  const courses = getAllCourses();
  return courses.map((course) => ({
    courseId: course.id,
  }));
}

export function generateMetadata({ params }: RoadmapPageProps): Metadata {
  const course = getCourse(params.courseId);
  const roadmap = getRoadmap(params.courseId);

  if (!course || !roadmap) {
    return { title: "로드맵을 찾을 수 없습니다" };
  }

  return {
    title: `${course.title} 로드맵 & 여정 · UBION KDT DataLab`,
    description: roadmap.headline,
  };
}

export default function RoadmapPage({ params }: RoadmapPageProps) {
  const course = getCourse(params.courseId);
  const roadmap = getRoadmap(params.courseId);
  const tracks = getAllTracks(params.courseId);

  if (!course || !roadmap) {
    notFound();
  }

  return (
    <RoadmapView
      course={course}
      roadmap={roadmap}
      tracks={tracks}
    />
  );
}
