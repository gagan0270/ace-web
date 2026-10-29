import { FeesPage } from "@/components/pages/FeesPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/faculty/fees")({
  component: FeesPage,
});
