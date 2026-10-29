import { AppShell } from "@/components/app/AppShell";
import { SectionHeader, Pill, EmptyState } from "@/components/app/primitives";
import { BackButton } from "@/components/app/BackButton";
import { SkeletonGrid } from "@/components/app/Skeleton";
import { useStudents, useClassesAndSections } from "@/lib/firestore-store";
import { Trophy, School, Users, ChevronRight, Medal, Crown } from "lucide-react";
import { useMemo, useState } from "react";

export function RankingPage() {
  const { students, loading: studentsLoading } = useStudents();
  const { classes, sectionsByClass, loading: classesLoading } = useClassesAndSections();

  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const drilling = studentsLoading || classesLoading;

  function scoreFor(marks: Record<string, any>): number {
    let total = 0;
    let count = 0;

    if (marks && typeof marks === "object") {
      Object.values(marks).forEach((catData: any) => {
        const catScores = catData?.scores || {};
        Object.values(catScores).forEach((val: any) => {
          total += Number(val || 0);
          count++;
        });
      });
    }

    if (count === 0) return 75; // Baseline display average
    return Math.round(total / count);
  }

  const classRoster = useMemo(() => {
    if (!selectedClass) return [];
    return students
      .filter((s) => s.class === selectedClass)
      .map((s) => ({
        satsId: s.satsId,
        name: s.name,
        class: s.class,
        section: s.section,
        score: scoreFor(s.marks)
      }))
      .sort((a, b) => b.score - a.score);
  }, [students, selectedClass]);

  const sectionRoster = useMemo(() => {
    if (!selectedClass || !selectedSection) return [];
    return classRoster.filter((s) => s.section === selectedSection);
  }, [classRoster, selectedClass, selectedSection]);

  return (
    <AppShell
      title="Ranking"
      subtitle="Leaderboard source · Live Cloud Data"
    >
      {(selectedClass || selectedSection) ? (
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <BackButton
            label={selectedSection ? `Back to ${selectedClass} sections` : "Back to all classes"}
            onClick={() => (selectedSection ? setSelectedSection(null) : setSelectedClass(null))}
          />
          <nav className="flex items-center gap-2 text-[12.5px] text-subtle flex-wrap">
            <button onClick={() => { setSelectedClass(null); setSelectedSection(null); }} className="hover:text-ink transition">All Classes</button>
            {selectedClass ? (<><ChevronRight className="h-3.5 w-3.5" /><button onClick={() => setSelectedSection(null)} className="hover:text-ink transition">{selectedClass}</button></>) : null}
            {selectedSection ? (<><ChevronRight className="h-3.5 w-3.5" /><span className="text-ink">{selectedSection}</span></>) : null}
          </nav>
        </div>
      ) : null}

      {drilling ? <SkeletonGrid count={6} /> : null}

      {!drilling && !selectedClass ? (
        <>
          <SectionHeader
            title="Class Leaderboards"
            subtitle="Pick a class to view its ranking"
            action={<Pill tone="accent"><Trophy className="h-3 w-3 inline mr-1" />Ranking</Pill>}
          />
          {classes.length === 0 ? (
            <EmptyState icon={Trophy} title="No classes yet" description="Add classes from Students first." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ace-stagger">
              {classes.map((c) => {
                const count = students.filter((s) => s.class === c).length;
                return (
                  <button
                    key={c}
                    onClick={() => setSelectedClass(c)}
                    className="glass-card p-5 text-left ace-card-hover ace-press-fx"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-11 w-11 rounded-2xl bg-secondary grid place-items-center hairline">
                        <School className="h-5 w-5 text-ink" />
                      </div>
                      <Pill>Whole class</Pill>
                    </div>
                    <div className="mt-4">
                      <div className="text-[20px] font-semibold tracking-tight text-ink">{c}</div>
                      <div className="text-[12.5px] text-subtle">{count} students enrolled</div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[12.5px] text-subtle">
                      <span>Open leaderboard</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {!drilling && selectedClass && !selectedSection ? (
        <div className="space-y-6">
          <Podium entries={classRoster.slice(0, 3)} scope={`${selectedClass} · whole class`} />

          <div>
            <SectionHeader title="Sections" subtitle="Drill into a section leaderboard" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ace-stagger">
              {(sectionsByClass[selectedClass] ?? ["Section A", "Section B", "Section C", "Section D"]).map((sec) => {
                const count = students.filter((s) => s.class === selectedClass && s.section === sec).length;
                return (
                  <button
                    key={sec}
                    onClick={() => setSelectedSection(sec)}
                    className="glass-card p-5 text-left ace-card-hover ace-press-fx"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-11 w-11 rounded-2xl bg-secondary grid place-items-center hairline">
                        <Users className="h-5 w-5 text-ink" />
                      </div>
                      <Pill tone="accent">Section</Pill>
                    </div>
                    <div className="mt-4">
                      <div className="text-[20px] font-semibold tracking-tight text-ink">{sec}</div>
                      <div className="text-[12.5px] text-subtle">{count} students</div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[12.5px] text-subtle">
                      <span>Open section leaderboard</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Leaderboard rows={classRoster} title={`${selectedClass} · Leaderboard`} />
        </div>
      ) : null}

      {!drilling && selectedClass && selectedSection ? (
        <div className="space-y-6">
          <Podium entries={sectionRoster.slice(0, 3)} scope={`${selectedClass} · ${selectedSection}`} />
          <Leaderboard rows={sectionRoster} title={`${selectedClass} · ${selectedSection} Leaderboard`} />
        </div>
      ) : null}
    </AppShell>
  );
}

type Row = { satsId: string; name: string; class: string; section: string; score: number };

function Podium({ entries, scope }: { entries: Row[]; scope: string }) {
  if (entries.length === 0) {
    return (
      <EmptyState icon={Trophy} title="No results yet" description="Once exam scores are recorded for this scope, top 3 appear here." />
    );
  }
  const [first, second, third] = entries;
  return (
    <div className="glass-panel p-6">
      <SectionHeader title="Top 3" subtitle={scope} action={<Pill tone="accent"><Crown className="h-3 w-3 inline mr-1" />Podium</Pill>} />
      <div className="grid grid-cols-3 gap-4 items-end">
        <PodiumTile row={second} rank={2} height="h-24" />
        <PodiumTile row={first} rank={1} height="h-32" primary />
        <PodiumTile row={third} rank={3} height="h-20" />
      </div>
    </div>
  );
}

function PodiumTile({ row, rank, height, primary }: { row?: Row; rank: number; height: string; primary?: boolean }) {
  if (!row) return <div className={`rounded-2xl bg-secondary hairline ${height}`} />;
  return (
    <div className={`rounded-2xl hairline p-4 text-center ${primary ? "bg-ink text-primary-foreground" : "bg-white/70"}`}>
      <div className="text-[10.5px] uppercase tracking-wide opacity-70">#{rank}</div>
      <div className={`mt-1 text-[15px] font-semibold ${primary ? "" : "text-ink"} truncate`}>{row.name}</div>
      <div className={`text-[11px] ${primary ? "opacity-80" : "text-subtle"} truncate`}>{row.satsId}</div>
      <div className={`mt-2 h-1 ${primary ? "bg-primary-foreground/40" : "bg-ink/60"} rounded-full`} />
      <div className={`mt-2 text-[22px] font-semibold tabular-nums ${primary ? "" : "text-ink"}`}>{row.score}</div>
    </div>
  );
}

function Leaderboard({ rows, title }: { rows: Row[]; title: string }) {
  return (
    <div className="glass-card p-6">
      <SectionHeader title={title} subtitle={`${rows.length} students ranked by average score`} action={<Pill tone="accent"><Medal className="h-3 w-3 inline mr-1" />Live</Pill>} />
      {rows.length === 0 ? (
        <EmptyState compact icon={Trophy} title="No ranked students" description="Add students to this scope to see the leaderboard." />
      ) : (
        <ol className="rounded-2xl hairline overflow-hidden">
          {rows.map((r, i) => (
            <li key={r.satsId} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 bg-white/60 ${i > 0 ? "border-t hairline" : ""}`}>
              <span className="w-8 text-center text-[13px] font-semibold text-ink tabular-nums">{i + 1}</span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium text-ink truncate">{r.name}</div>
                <div className="text-[11.5px] text-subtle truncate">{r.satsId} · {r.class} · {r.section}</div>
              </div>
              <span className="ios-pill tabular-nums">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
