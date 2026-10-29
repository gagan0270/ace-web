import { createFileRoute } from "@tanstack/react-router";
import { StudentsPage } from "@/components/pages/StudentsPage";

export const Route = createFileRoute("/faculty/students/")({
  head: () => ({
    meta: [
      { title: "Students · Ace Operations" },
      { name: "description", content: "Register, monitor and reclassify students across classes and sections." },
      { property: "og:title", content: "Students · Ace Operations" },
      { property: "og:description", content: "Student roster and enrollment for the Ace Operations portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StudentsPage basePath="/faculty/students" />,
});
