import { redirect, notFound } from "next/navigation";
import { getAllTracks, getTrack } from "@/lib/content";

interface TrackPageProps {
  params: {
    trackId: string;
  };
}

export function generateStaticParams() {
  const tracks = getAllTracks();
  return tracks.map((track) => ({
    trackId: track.id,
  }));
}

export default function TrackPage({ params }: TrackPageProps) {
  const { trackId } = params;
  const track = getTrack(trackId);

  if (!track || !track.topicOrder || track.topicOrder.length === 0) {
    notFound();
  }

  // Redirect to the first topic of this track
  const firstTopicId = track.topicOrder[0];
  redirect(`/tracks/${track.id}/${firstTopicId}`);
}
