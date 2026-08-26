import { getAllTracks, getAllTopics, getBadgesConfig } from "@/lib/content";
import { DashboardView } from "@/components/DashboardView";
import { Topic } from "@/types/content";

export default function HomePage() {
  const tracks = getAllTracks();
  const allTopics = getAllTopics();
  const badgesConfig = getBadgesConfig();

  const topicsMap: Record<string, Topic> = {};
  allTopics.forEach((t) => {
    topicsMap[t.id] = t;
  });

  return (
    <DashboardView
      tracks={tracks}
      topicsMap={topicsMap}
      badges={badgesConfig.badges}
    />
  );
}
