import { notFound } from "next/navigation";
import {
  getAllTracks,
  getTrack,
  getProject,
  getAllTopics,
  getBadgesConfig,
} from "@/lib/content";
import { ProjectView } from "@/components/ProjectView";

interface ProjectPageProps {
  params: {
    trackId: string;
  };
}

export function generateStaticParams() {
  const tracks = getAllTracks();
  return tracks
    .filter((t) => Boolean(t.projectFile))
    .map((track) => ({
      trackId: track.id,
    }));
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { trackId } = params;
  const track = getTrack(trackId);
  const project = getProject(trackId);
  const allTracks = getAllTracks();
  const allTopics = getAllTopics();
  const badgesConfig = getBadgesConfig();

  if (!track || !project) {
    notFound();
  }

  const allTrackTopicsCount: Record<string, number> = {};
  allTracks.forEach((t) => {
    allTrackTopicsCount[t.id] = t.topicOrder.length;
  });

  return (
    <ProjectView
      track={track}
      project={project}
      allTracks={allTracks}
      allBadges={badgesConfig.badges}
      allTrackTopicsCount={allTrackTopicsCount}
      totalTopicsCount={allTopics.length}
      totalTracksCount={allTracks.length}
    />
  );
}
