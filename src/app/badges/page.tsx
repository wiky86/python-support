import { getBadgesConfig } from "@/lib/content";
import { BadgesView } from "@/components/BadgesView";

export default function BadgesPage() {
  const badgesConfig = getBadgesConfig();

  return <BadgesView badgesConfig={badgesConfig} />;
}
