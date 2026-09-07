import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllCourses,
  getAllTracks,
  getAllTopics,
  getTrack,
  getTopic,
  getAllBadges,
} from "@/lib/content";
import { TopicView } from "@/components/TopicView";

interface TopicPageProps {
  params: {
    courseId: string;
    trackId: string;
    topicId: string;
  };
}

export function generateStaticParams() {
  const courses = getAllCourses();
  const params: { courseId: string; trackId: string; topicId: string }[] = [];

  for (const course of courses) {
    const topics = getAllTopics(course.id);
    for (const topic of topics) {
      params.push({
        courseId: course.id,
        trackId: topic.trackId,
        topicId: topic.id,
      });
    }
  }

  return params;
}

export function generateMetadata({ params }: TopicPageProps): Metadata {
  const topic = getTopic(params.trackId, params.topicId, params.courseId);
  const track = getTrack(params.trackId, params.courseId);

  if (!topic || !track) {
    return { title: "토픽을 찾을 수 없습니다" };
  }

  return {
    title: `${topic.title} (${track.title}) — KDT DataLab`,
    description: `개념 학습, 빈칸 실습, 복습 퀴즈: ${topic.title}`,
  };
}

export default function TopicPage({ params }: TopicPageProps) {
  const { courseId, trackId, topicId } = params;

  const track = getTrack(trackId, courseId);
  const topic = getTopic(trackId, topicId, courseId);

  if (!track || !topic) {
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
    <TopicView
      track={track}
      topic={topic}
      allTracks={allTracks}
      allBadges={allBadges}
      allTrackTopicsCount={allTrackTopicsCount}
      totalTopicsCount={totalTopicsCount}
      totalTracksCount={allTracks.length}
    />
  );
}
