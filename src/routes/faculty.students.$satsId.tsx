import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { StudentProfilePage } from "@/components/pages/StudentProfilePage";
import { EmptyState } from "@/components/app/primitives";
import { UserX } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/faculty/students/$satsId")({
  head: ({ params }) => ({
    meta: [
      { title: `Student ${params.satsId} · Ace Operations` },
      { name: "description", content: "Editable student profile with fee ledger, academic matrix and account controls." },
      { property: "og:title", content: `Student ${params.satsId} · Ace Operations` },
      { property: "og:description", content: "Student profile drill-down for faculty operations." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfileRoute,
  notFoundComponent: () => (
    <div className="min-h-screen p-8">
      <EmptyState
        icon={UserX}
        title="Student not found"
        description="The requested SATS ID doesn't exist in the roster."
        action={<Link to="/faculty/students" className="ios-pill">Back to Students</Link>}
      />
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    useEffect(() => { console.error(error); }, [error]);
    return (
      <div className="min-h-screen p-8">
        <EmptyState
          icon={UserX}
          title="This profile didn't load"
          description={error.message}
          action={
            <button onClick={() => { router.invalidate(); reset(); }} className="ios-pill">Try again</button>
          }
        />
      </div>
    );
  },
});

function ProfileRoute() {
  const { satsId } = Route.useParams();
  return <StudentProfilePage satsId={satsId} basePath="/faculty/students" />;
}
