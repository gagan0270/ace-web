import { createFileRoute } from "@tanstack/react-router";
import { ExamsPageInner } from "@/components/pages/ExamsPage";

export const Route = createFileRoute("/faculty/exams")({
  head: () => ({
    meta: [
      { title: "Exam Scheduler · Ace Operations" },
      { name: "description", content: "Deploy class-wide mass exams across sections." },
      { property: "og:title", content: "Exam Scheduler · Ace Operations" },
      { property: "og:description", content: "Class-Wide Mass Exam Scheduler." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExamsPageInner,
});
