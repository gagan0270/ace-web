import { AppShell } from "@/components/app/AppShell";
import { SectionHeader, StatCard, Pill, EmptyState } from "@/components/app/primitives";
import { SegmentedPills } from "@/components/app/SegmentedPills";
import { BackButton } from "@/components/app/BackButton";
import { SkeletonGrid } from "@/components/app/Skeleton";
import { ErrorBanner, SubmitButton } from "@/components/app/form";
import { useStudents, useClassesAndSections, firestoreActions } from "@/lib/firestore-store";
import {
  CalendarCheck2,
  ClipboardCheck,
  Clock,
  ChevronRight,
  Save,
  ClipboardX,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Status = "P" | "A" | "L";

export function AttendancePage() {
  const { students, loading: studentsLoading } = useStudents();
  const { classes, sectionsByClass, loading: classesLoading } = useClassesAndSections();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const drilling = studentsLoading || classesLoading;

  const dateError = useMemo(() => {
    if (!date) return "Pick a date to mark attendance";
    const d = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (Number.isNaN(d.getTime())) return "Invalid date";
    if (d > today) return "Attendance cannot be marked for a future date";
    return null;
  }, [date]);

  const sectionStudents = useMemo(
    () =>
      students.filter(
        (s) => s.class === selectedClass && s.section === selectedSection,
      ),
    [students, selectedClass, selectedSection],
  );

  const setStatus = (satsId: string, status: Status) => {
    setStatuses((prev) => ({ ...prev, [satsId]: status }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    if (dateError) { setBanner(dateError); return; }
    if (!selectedClass || !selectedSection) { setBanner("Select a section first."); return; }
    if (sectionStudents.length === 0) { setBanner("No students in this section."); return; }

    const unmarked = sectionStudents.filter((s) => !statuses[s.satsId]).length;
    if (unmarked > 0) { setBanner(`${unmarked} student(s) still unmarked.`); return; }

    setPending(true);
    try {
      await firestoreActions.markAttendance(
        date,
        selectedClass,
        selectedSection,
        statuses,
        "teacher"
      );

      toast.success("Attendance saved to Cloud Firestore", {
        description: `${selectedClass} · ${selectedSection} · ${sectionStudents.length} students`,
      });
    } catch (err: any) {
      console.error("Save attendance error:", err);
      setBanner("Sync to Firestore failed. Try again.");
    } finally {
      setPending(false);
    }
  };

  // Stats
  const totalSections = classes.reduce((a, c) => a + (sectionsByClass[c]?.length ?? 0), 0);

  return (
    <AppShell title="Attendance" subtitle="Attendance Control Hub · per-student marking">
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr] gap-4">
        <div className="glass-card p-5">
          <label className="block">
            <span className="text-[11.5px] text-subtle mb-2 block">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={dateError ? "true" : undefined}
              className="rounded-2xl bg-white/70 hairline px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink/10 transition"
            />
            {dateError ? (
              <span className="mt-1 block text-[11.5px] text-[oklch(0.5_0.15_25)]">{dateError}</span>
            ) : null}
          </label>
        </div>
        <StatCard icon={ClipboardCheck} label="Active Students" value={students.length} trend={{ label: "total registered", tone: "up" }} />
        <StatCard icon={Clock} label="Configured Classes" value={classes.length} trend={{ label: `${totalSections} total sections`, tone: "up" }} />
      </div>

      {(selectedClass || selectedSection) ? (
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <BackButton
            label={selectedSection ? `Back to ${selectedClass} sections` : "Back to all classes"}
            onClick={() => {
              if (selectedSection) setSelectedSection(null);
              else setSelectedClass(null);
            }}
          />
          <div className="flex items-center gap-2 text-[12.5px] text-subtle flex-wrap">
            <button
              onClick={() => { setSelectedClass(null); setSelectedSection(null); }}
              className="hover:text-ink transition"
            >All Classes</button>
            {selectedClass ? (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <button onClick={() => setSelectedSection(null)} className="hover:text-ink transition">{selectedClass}</button>
              </>
            ) : null}
            {selectedSection ? (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-ink">{selectedSection}</span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {drilling ? (
        <div className="mt-4"><SkeletonGrid count={6} /></div>
      ) : !selectedClass ? (
        <div className="mt-4">
          <SectionHeader title="Class Selection" subtitle="Pick a class to open its sections" action={<Pill tone="success">Live Firestore</Pill>} />
          {classes.length === 0 ? (
            <EmptyState icon={ClipboardX} title="No classes configured" description="Add classes from the Students module." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {classes.map((c) => {
                const secs = sectionsByClass[c] ?? ["Section A", "Section B"];
                return (
                  <button
                    key={c}
                    onClick={() => setSelectedClass(c)}
                    className="glass-card p-5 text-left hover:shadow-[var(--shadow-glass-lg)] transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-11 w-11 rounded-2xl bg-secondary grid place-items-center hairline">
                        <CalendarCheck2 className="h-5 w-5 text-ink" strokeWidth={1.75} />
                      </div>
                      <Pill tone="neutral">Active</Pill>
                    </div>
                    <div className="mt-4">
                      <div className="text-[20px] font-semibold text-ink tracking-tight">{c}</div>
                      <div className="text-[12.5px] text-subtle mt-0.5">{secs.length} sections</div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[12.5px] text-subtle">
                      <span>Open register</span>
                      <ChevronRight className="h-4 w-4 group-hover:text-ink transition" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {!drilling && selectedClass && !selectedSection ? (
        <div className="mt-4">
          <SectionHeader title={`${selectedClass} · Sections`} subtitle="Pick a section to mark per-student attendance" />
          {(sectionsByClass[selectedClass] ?? ["Section A", "Section B", "Section C", "Section D"]).length === 0 ? (
            <EmptyState icon={ClipboardX} title="No sections yet" description="Add sections from the Students module." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(sectionsByClass[selectedClass] ?? ["Section A", "Section B", "Section C", "Section D"]).map((sec) => {
                const count = students.filter((s) => s.class === selectedClass && s.section === sec).length;
                return (
                  <button
                    key={sec}
                    onClick={() => {
                      setSelectedSection(sec);
                      // Pre-fill existing statuses if any
                      const initMap: Record<string, Status> = {};
                      students
                        .filter((s) => s.class === selectedClass && s.section === sec)
                        .forEach((s) => {
                          initMap[s.satsId] = "P";
                        });
                      setStatuses(initMap);
                    }}
                    className="glass-card p-5 text-left hover:shadow-[var(--shadow-glass-lg)] transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-11 w-11 rounded-2xl bg-secondary grid place-items-center hairline">
                        <Users className="h-5 w-5 text-ink" strokeWidth={1.75} />
                      </div>
                      <Pill tone="neutral">Ready</Pill>
                    </div>
                    <div className="mt-4">
                      <div className="text-[20px] font-semibold text-ink tracking-tight">{sec}</div>
                      <div className="text-[12.5px] text-subtle mt-0.5">{count} students</div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[12.5px] text-subtle">
                      <span>Open register</span>
                      <ChevronRight className="h-4 w-4 group-hover:text-ink transition" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {!drilling && selectedClass && selectedSection ? (
        <form onSubmit={submit} className="glass-panel p-6 mt-6 space-y-4">
          <SectionHeader
            title={`${selectedClass} · ${selectedSection}`}
            subtitle={`${sectionStudents.length} students · ${date}`}
          />
          <ErrorBanner message={banner} />
          {sectionStudents.length === 0 ? (
            <EmptyState icon={ClipboardX} title="No students to mark" description="Add students to this section from the Students module." />
          ) : (
            <ul className="rounded-2xl hairline overflow-hidden">
              {sectionStudents.map((s, i) => {
                const st = statuses[s.satsId];
                return (
                  <li
                    key={s.satsId}
                    className={
                      "flex items-center justify-between gap-3 px-4 py-3 bg-white/60 hover:bg-white/80 transition " +
                      (i > 0 ? "border-t hairline" : "")
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-2xl bg-secondary grid place-items-center hairline shrink-0">
                        <span className="text-[12px] font-semibold text-ink">
                          {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-medium text-ink truncate">{s.name}</div>
                        <div className="text-[11.5px] text-subtle truncate">{s.satsId} · {s.attendance.daysPresent}d present in record</div>
                      </div>
                    </div>
                    <SegmentedPills<Status>
                      size="sm"
                      value={st ?? "P"}
                      onChange={(v) => setStatus(s.satsId, v)}
                      options={[
                        { value: "P", label: "Present", tone: "success" },
                        { value: "A", label: "Absent", tone: "danger" },
                        { value: "L", label: "Late", tone: "warn" },
                      ]}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-subtle">
              {Object.keys(statuses).length}/{sectionStudents.length} marked
            </div>
            <SubmitButton pending={pending} disabled={!!dateError || sectionStudents.length === 0}>
              <Save className="h-4 w-4" />
              {pending ? "Saving…" : "Save attendance"}
            </SubmitButton>
          </div>
        </form>
      ) : null}
    </AppShell>
  );
}
