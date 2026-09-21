import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getAllCourses, getCourse, getDiagnostic, getAllTracks } from "@/lib/content";
import { DiagnosticRunner } from "@/components/DiagnosticRunner";

interface DiagnosticPageProps {
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

export function generateMetadata({ params }: DiagnosticPageProps): Metadata {
  const course = getCourse(params.courseId);
  const diagnostic = getDiagnostic(params.courseId);

  if (!course || !diagnostic) {
    return { title: "진단 테스트를 찾을 수 없습니다" };
  }

  return {
    title: `${diagnostic.title} · UBION KDT DataLab`,
    description: diagnostic.description,
  };
}

export default function DiagnosticPage({ params }: DiagnosticPageProps) {
  const course = getCourse(params.courseId);
  const diagnostic = getDiagnostic(params.courseId);
  const tracks = getAllTracks(params.courseId);

  if (!course || !diagnostic) {
    notFound();
  }

  return (
    <DiagnosticRunner
      course={course}
      diagnostic={diagnostic}
      tracks={tracks}
    />
  );
}
