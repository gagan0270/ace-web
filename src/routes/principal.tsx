import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { canEnterShell, landingFor, readSession, type Session } from "@/lib/auth";

// Component-based guard: session is read once on mount and cached in state.
// Client-side sub-navigations do not re-mount this layout, so they never
// trigger a spurious redirect if localStorage is momentarily unavailable.
function PrincipalShell() {
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

  if (session === undefined) return null;
  if (session === null) return null;
  return <Outlet />;
}

export const Route = createFileRoute("/principal")({
  component: PrincipalShell,
});
