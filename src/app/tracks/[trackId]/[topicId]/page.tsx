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
