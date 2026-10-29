import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { canEnterShell, landingFor, readSession, type Session } from "@/lib/auth";

// Component-based guard: session is read once on mount and cached in state.
// Client-side sub-navigations (e.g. Students → Student Profile) do NOT
// re-mount this layout, so they never trigger a spurious redirect to /
// even if localStorage is momentarily unavailable.
function FacultyShell() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const s = readSession();
    setSession(s);
    if (!s) {
      navigate({ to: "/", search: { redirect: window.location.pathname } as any });
      return;
    }
    if (!canEnterShell(window.location.pathname, s.role)) {
      navigate({ to: landingFor(s.role) as any });
    }
  }, [navigate]);

  if (session === undefined) return null; // brief mount tick — avoids flash
  if (session === null) return null;
  return <Outlet />;
}

export const Route = createFileRoute("/faculty")({
  component: FacultyShell,
});
