import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { StatCard, SectionHeader, Pill, EmptyState } from "@/components/app/primitives";
import {
  Users,
  Wallet,
  CalendarCheck2,
  Shuffle,
  Bus,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import {
  useStudents,
  useBuses,
  useTeachers,
  useNotices,
  useClassesAndSections,
} from "@/lib/firestore-store";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/principal/overview")({
  head: () => ({
    meta: [
      { title: "Overview · Ace Operations" },
      {
        name: "description",
        content:
          "Principal analytics gate — monitored students, revenue, attendance and transit efficiency at a glance.",
      },
      { property: "og:title", content: "Overview · Ace Operations" },
      {
        property: "og:description",
        content: "Live analytics for the Ace Operations school portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OverviewPage,
});

const currency = (n: number) =>
  "₹" + (n >= 100000 ? (n / 100000).toFixed(1) + "L" : n.toLocaleString("en-IN"));

function OverviewPage() {
  const { students } = useStudents();
  const { buses } = useBuses();
  const { teachers } = useTeachers();
  const { notices } = useNotices();
  const { classes } = useClassesAndSections();

  const totalStudents = students.length;
  const totalPaidRevenue = useMemo(() => students.reduce((acc, s) => acc + s.fees.paid, 0), [students]);

  const enrollmentByClass = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      counts[s.class] = (counts[s.class] || 0) + 1;
    });
    return classes.map((c) => ({ klass: c, count: counts[c] || 0 }));
  }, [students, classes]);

  const maxEnroll = Math.max(...enrollmentByClass.map((e) => e.count), 1);

  return (
    <AppShell title="Overview" subtitle="Principal Analytics Gate · Real Cloud Firestore Data">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Total Monitored Students" value={totalStudents} trend={{ label: "Live Count", tone: "up" }} />
        <StatCard icon={Wallet} label="Total Collected Fees" value={currency(totalPaidRevenue)} trend={{ label: "Live Revenue", tone: "up" }} />
        <StatCard icon={CalendarCheck2} label="Configured Classes" value={classes.length} hint="Primary to 10th" />
        <StatCard icon={Shuffle} label="Active Teachers" value={teachers.length} hint="Active Staff" />
        <StatCard icon={Bus} label="Active Transit Routes" value={buses.length} trend={{ label: "Fleet live" }} />
        <StatCard icon={CalendarDays} label="Announcements" value={notices.length} hint="Active Notices" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 mt-6">
        <TransitChart />

        <div className="glass-card p-6">
          <SectionHeader
            title="Enrollment Breakdown"
            subtitle={`${totalStudents} students across grades`}
            action={
              <div className="flex items-center gap-2 text-[11.5px] text-subtle">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-ink" />
                  Enrolled
                </span>
              </div>
            }
          />
          {enrollmentByClass.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              compact
              title="No enrollment data"
              description="Once classes are created and rosters imported, the breakdown surfaces here."
            />
          ) : (
            <div className="space-y-3">
              {enrollmentByClass.map((row) => {
                const pct = totalStudents > 0 ? Math.round((row.count / totalStudents) * 100) : 0;
                const bar = Math.round((row.count / maxEnroll) * 100);
                return (
                  <div key={row.klass}>
                    <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                      <span className="text-ink font-medium">{row.klass}</span>
                      <span className="text-subtle tabular-nums">{row.count} · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${bar}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function TransitChart() {
  const w = 560, h = 180, pad = 28;
  const data = [
    { d: "Mon", v: 88 },
    { d: "Tue", v: 91 },
    { d: "Wed", v: 86 },
    { d: "Thu", v: 94 },
    { d: "Fri", v: 92 },
    { d: "Sat", v: 85 },
  ];
  const avg = Math.round(data.reduce((a, b) => a + b.v, 0) / (data.length || 1));
  const [hover, setHover] = useState<number | null>(null);

  const xs = data.map((_, i) => pad + (i * (w - pad * 2)) / (data.length - 1));
  const ys = data.map((p) => h - pad - ((p.v - 70) / 30) * (h - pad * 2));
  const linePath = xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${xs[xs.length - 1]},${h - pad} L${xs[0]},${h - pad} Z`;

  return (
    <div className="glass-card p-6">
      <SectionHeader
        title="Transit Efficiency Curve"
        subtitle="On-time route completion, last 6 days"
        action={
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-subtle">
              <span className="h-[2px] w-4 bg-ink rounded" />
              On-time %
            </span>
            <Pill tone="success">{avg}% avg</Pill>
          </div>
        }
      />
      <div
        className="w-full relative"
        onMouseLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-[220px]"
          role="img"
          aria-label="Transit efficiency line chart"
        >
          <defs>
            <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.22 0.02 260)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="oklch(0.22 0.02 260)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((i) => {
            const y = pad + (i * (h - pad * 2)) / 3;
            const label = 100 - i * 10;
            return (
              <g key={i}>
                <line x1={pad} x2={w - pad} y1={y} y2={y} stroke="oklch(0.92 0.003 250)" strokeDasharray="3 4" />
                <text x={4} y={y + 3} fontSize={10} fill="oklch(0.62 0.01 260)">{label}%</text>
              </g>
            );
          })}
          <path d={areaPath} fill="url(#areaFill)" />
          <path d={linePath} fill="none" stroke="oklch(0.22 0.02 260)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {xs.map((x, i) => (
            <g key={i}>
              <circle
                cx={x}
                cy={ys[i]}
                r={hover === i ? 5 : 3.5}
                fill="white"
                stroke="oklch(0.22 0.02 260)"
                strokeWidth={2}
                className="transition-all"
              />
              <text x={x} y={h - 6} textAnchor="middle" fontSize={11} fill="oklch(0.62 0.01 260)">
                {data[i].d}
              </text>
              <rect
                x={x - (w - pad * 2) / (data.length * 2)}
                y={0}
                width={(w - pad * 2) / data.length}
                height={h}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            </g>
          ))}
          {hover !== null ? (
            <g>
              <line
                x1={xs[hover]}
                x2={xs[hover]}
                y1={pad}
                y2={h - pad}
                stroke="oklch(0.22 0.02 260)"
                strokeOpacity={0.15}
                strokeDasharray="2 3"
              />
            </g>
          ) : null}
        </svg>
        {hover !== null ? (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full glass-card px-3 py-2 text-[11.5px] text-ink whitespace-nowrap"
            style={{
              left: `${(xs[hover] / w) * 100}%`,
              top: `${(ys[hover] / h) * 100}%`,
              marginTop: -8,
            }}
          >
            <div className="text-subtle text-[10.5px] uppercase tracking-wide">
              {data[hover].d}
            </div>
            <div className="font-semibold tabular-nums">{data[hover].v}% on-time</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
