import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllCourses,
  getAllTracks,
  getTrack,
  getProject,
  getAllBadges,
} from "@/lib/content";
import { ProjectView } from "@/components/ProjectView";

interface ProjectPageProps {
  params: {
    courseId: string;
    trackId: string;
  };
}

export function generateStaticParams() {
  const courses = getAllCourses();
  const params: { courseId: string; trackId: string }[] = [];

  for (const course of courses) {
    const tracks = getAllTracks(course.id);
    for (const track of tracks) {
      if (track.projectFile) {
        params.push({
          courseId: course.id,
          trackId: track.id,
        });
      }
    }
  }

  return params;
}

export function generateMetadata({ params }: ProjectPageProps): Metadata {
  const track = getTrack(params.trackId, params.courseId);
  const project = getProject(params.trackId, params.courseId);

  if (!track || !project) {
    return { title: "프로젝트를 찾을 수 없습니다" };
  }

  return {
    title: `${project.title} (${track.title} 미니 프로젝트) · UBION KDT DataLab`,
    description: project.intro,
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { courseId, trackId } = params;

  const track = getTrack(trackId, courseId);
  const project = getProject(trackId, courseId);

  if (!track || !project) {
    notFound();
  }

  const allTracks = getAllTracks(courseId);
  const allBadges = getAllBadges();

  const allTrackTopicsCount: Record<string, number> = {};
  allTracks.forEach((t) => {
    allTrackTopicsCount[t.id] = t.topicOrder.length;
  });

  const totalTopicsCount = allTracks.reduce(
    (acc, t) => acc + t.topicOrder.length,
    0
  );

  return (
    <ProjectView
      track={track}
      project={project}
      allTracks={allTracks}
      allBadges={allBadges}
      allTrackTopicsCount={allTrackTopicsCount}
      totalTopicsCount={totalTopicsCount}
      totalTracksCount={allTracks.length}
    />
  );
}
