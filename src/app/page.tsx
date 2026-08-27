import { Metadata } from "next";
import { getAllTracks, getAllTopics, getBadgesConfig, getProject } from "@/lib/content";
import { DashboardView } from "@/components/DashboardView";
import { Topic, Project } from "@/types/content";

export const metadata: Metadata = {
  title: "PyDataLab — 파이썬 데이터 분석 학습 공간",
  description: "실습과 퀴즈, 미니 프로젝트로 완성하는 파이썬 데이터 분석 학습 공간",
};

export default function HomePage() {
  const tracks = getAllTracks();
  const allTopics = getAllTopics();
  const badgesConfig = getBadgesConfig();

  const topicsMap: Record<string, Topic> = {};
  allTopics.forEach((t) => {
    topicsMap[t.id] = t;
  });

  const projectsMap: Record<string, Project> = {};
  tracks.forEach((t) => {
    if (t.projectFile) {
      const proj = getProject(t.id);
      if (proj) {
        projectsMap[t.id] = proj;
      }
    }
  });

  return (
    <DashboardView
      tracks={tracks}
      topicsMap={topicsMap}
      badges={badgesConfig.badges}
      projectsMap={projectsMap}
    />
  );
}
