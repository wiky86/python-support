import { Metadata } from "next";
import { getBadgesConfig, getAllTracks } from "@/lib/content";
import { BadgesView } from "@/components/BadgesView";

export const metadata: Metadata = {
  title: "배지 도감 · PyDataLab",
  description: "학습, 퀴즈 만점, 연속 접속, 트랙 완주 등으로 획득할 수 있는 24종 배지 도감",
};

export default function BadgesPage() {
  const badgesConfig = getBadgesConfig();
  const tracks = getAllTracks();
  const trackTitles: Record<string, string> = {};
  tracks.forEach((t) => {
    trackTitles[t.id] = t.title;
  });

  return <BadgesView badgesConfig={badgesConfig} trackTitles={trackTitles} />;
}
