import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllCourses,
  getCourse,
  getAllTracks,
  getAllTopics,
  getCourseBadges,
  getProject,
} from "@/lib/content";
import { DashboardView } from "@/components/DashboardView";
import { Topic, Project } from "@/types/content";

interface CoursePageProps {
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

export function generateMetadata({ params }: CoursePageProps): Metadata {
  const course = getCourse(params.courseId);
  if (!course) {
    return { title: "과목을 찾을 수 없습니다" };
  }
  return {
    title: `${course.title} — KDT DataLab`,
    description: course.description,
  };
}

export default function CoursePage({ params }: CoursePageProps) {
  const course = getCourse(params.courseId);
  if (!course) {
    notFound();
  }

  const tracks = getAllTracks(params.courseId);
  const allTopics = getAllTopics(params.courseId);
  const badges = getCourseBadges(params.courseId);

  const topicsMap: Record<string, Topic> = {};
  allTopics.forEach((t) => {
    topicsMap[t.id] = t;
  });

  const projectsMap: Record<string, Project> = {};
  tracks.forEach((t) => {
    if (t.projectFile) {
      const proj = getProject(t.id, params.courseId);
      if (proj) {
        projectsMap[t.id] = proj;
      }
    }
  });

  return (
    <DashboardView
      course={course}
      tracks={tracks}
      topicsMap={topicsMap}
      badges={badges}
      projectsMap={projectsMap}
    />
  );
}
