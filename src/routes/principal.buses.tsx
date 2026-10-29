import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Pill, EmptyState, StatusDot } from "@/components/app/primitives";
import { BusAddDialog } from "@/components/app/BusAddDialog";
import { useBuses } from "@/lib/firestore-store";
import { Bus, Plus, MapPin, Users2, Gauge } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/principal/buses")({
  head: () => ({
    meta: [
      { title: "Bus Fleet · Ace Operations" },
      { name: "description", content: "Live bus fleet management for the Ace Operations portal." },
      { property: "og:title", content: "Bus Fleet · Ace Operations" },
      { property: "og:description", content: "Live bus fleet and route management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusesPage,
});

function BusesPage() {
  const { buses, loading } = useBuses();
  const [open, setOpen] = useState(false);

  return (
    <AppShell
      title="Bus Fleet"
      subtitle="Live Bus Fleet Management · Cloud Firestore"
      actions={
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-ink text-primary-foreground text-[12.5px] font-medium hover:bg-ink/90 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Active Bus
        </button>
      }
    >
      {loading ? (
        <div className="text-[13px] text-subtle py-8 text-center">Loading bus fleet from Cloud Firestore...</div>
      ) : buses.length === 0 ? (
        <EmptyState
          icon={Bus}
          title="No active bus route documents found"
          description="Provision a new route to begin tracking driver, capacity and live onboarding data."
          action={
            <button
              onClick={() => setOpen(true)}
              className="px-4 py-2 rounded-full bg-ink text-primary-foreground text-[12.5px] font-medium"
            >
              Add active bus
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {buses.map((b) => {
            const pct = Math.round((b.onboard / b.capacity) * 100);
            return (
              <div key={b.id} className="glass-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-2xl bg-secondary grid place-items-center hairline">
                      <Bus className="h-5 w-5 text-ink" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-semibold text-ink truncate">
                        {b.route}
                      </div>
                      <div className="text-[11.5px] text-subtle">{b.id}</div>
                    </div>
                  </div>
                  <Pill tone={b.status === "active" ? "success" : b.status === "idle" ? "warn" : "danger"}>
                    <StatusDot tone={b.status === "active" ? "online" : b.status === "idle" ? "warn" : "offline"} />
                    {b.status}
                  </Pill>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-[12px]">
                  <Meta icon={MapPin} label="Driver" value={b.driver} />
                  <Meta icon={Users2} label="Onboard" value={`${b.onboard}/${b.capacity}`} />
                  <Meta icon={Gauge} label="Load" value={`${pct}%`} />
                </div>

                <div className="mt-4">
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <BusAddDialog open={open} onClose={() => setOpen(false)} />
    </AppShell>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bus;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-secondary/70 hairline px-3 py-2">
      <div className="flex items-center gap-1 text-[10.5px] uppercase tracking-wide text-subtle">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-[13px] text-ink font-medium mt-0.5 truncate">
        {value}
      </div>
    </div>
  );
}
