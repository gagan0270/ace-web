import { createFileRoute } from "@tanstack/react-router";
import { AttendancePage } from "@/components/pages/AttendancePage";

export const Route = createFileRoute("/principal/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance · Ace Operations" },
      { name: "description", content: "Per-student attendance marking with section-level saves." },
      { property: "og:title", content: "Attendance · Ace Operations" },
      { property: "og:description", content: "Daily attendance oversight for the principal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AttendancePage,
});
