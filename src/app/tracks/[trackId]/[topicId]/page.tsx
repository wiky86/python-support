import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllTracks,
  getTrack,
  getTopic,
  getAllTopics,
  getBadgesConfig,
} from "@/lib/content";
import { TopicView } from "@/components/TopicView";

interface TopicPageProps {
  params: {
    trackId: string;
    topicId: string;
  };
}

export function generateStaticParams() {
  const tracks = getAllTracks();
  const paramsList: { trackId: string; topicId: string }[] = [];

  for (const track of tracks) {
    for (const topicId of track.topicOrder) {
      paramsList.push({
        trackId: track.id,
        topicId,
      });
    }
  }

  return paramsList;
}

export function generateMetadata({ params }: TopicPageProps): Metadata {
  const topic = getTopic(params.trackId, params.topicId);
  if (!topic) {
    return {
      title: "토픽 상세 · PyDataLab",
    };
  }

  return {
    title: `${topic.title} · PyDataLab`,
    description: `파이썬 데이터 분석 ${topic.title} 개념 학습, 빈칸 채우기 실습, 퀴즈`,
  };
}

export default function TopicPage({ params }: TopicPageProps) {
  const { trackId, topicId } = params;
  const track = getTrack(trackId);
  const topic = getTopic(trackId, topicId);
  const allTracks = getAllTracks();
  const allTopics = getAllTopics();
  const badgesConfig = getBadgesConfig();

  if (!track || !topic) {
    notFound();
  }

  const allTrackTopicsCount: Record<string, number> = {};
  allTracks.forEach((t) => {
    allTrackTopicsCount[t.id] = t.topicOrder.length;
  });

  return (
    <TopicView
      track={track}
      topic={topic}
      allTracks={allTracks}
      allBadges={badgesConfig.badges}
      allTrackTopicsCount={allTrackTopicsCount}
      totalTopicsCount={allTopics.length}
      totalTracksCount={allTracks.length}
    />
  );
}
