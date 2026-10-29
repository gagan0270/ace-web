import { createFileRoute } from "@tanstack/react-router";
import { NoticesPage } from "@/components/pages/NoticesPage";

export const Route = createFileRoute("/faculty/notices")({
  head: () => ({
    meta: [
      { title: "Notices · Ace Operations" },
      { name: "description", content: "Broadcast notices to the whole school, a class, or specific sections." },
      { property: "og:title", content: "Notices · Ace Operations" },
      { property: "og:description", content: "Manage school-wide and section-scoped notices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NoticesPage,
});
