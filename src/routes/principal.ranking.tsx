import { createFileRoute } from "@tanstack/react-router";
import { RankingPage } from "@/components/pages/RankingPage";

export const Route = createFileRoute("/principal/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking · Ace Operations" },
      { name: "description", content: "Class and section leaderboards computed from exam scores." },
      { property: "og:title", content: "Ranking · Ace Operations" },
      { property: "og:description", content: "Leaderboards for the school." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RankingPage,
});
