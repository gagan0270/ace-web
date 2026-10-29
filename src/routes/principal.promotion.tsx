import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { SectionHeader, Pill, EmptyState } from "@/components/app/primitives";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { SelectField } from "@/components/app/form";
import { useStudents, useClassesAndSections, firestoreActions, type FullStudent } from "@/lib/firestore-store";
import { ArrowRight, ArrowUpRight, GraduationCap, RotateCcw, UserMinus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/principal/promotion")({
  head: () => ({
    meta: [
      { title: "Promote Students · Ace Operations" },
      { name: "description", content: "Close an academic year and promote students to the next class." },
      { property: "og:title", content: "Promote Students · Ace Operations" },
      { property: "og:description", content: "Annual promotion workflow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PromotionPage,
});

type Action = "Promote" | "Retain" | "TransferredOut";
type Decision = { action: Action; nextClass: string; nextSection: string };

function defaultNextClass(current: string, ordered: string[]): string {
  const i = ordered.indexOf(current);
  if (i >= 0 && i < ordered.length - 1) return ordered[i + 1];
  return current;
}

function PromotionPage() {
  const { students, loading: studentsLoading } = useStudents();
  const { classes, sectionsByClass } = useClassesAndSections();

  const [fromYear, setFromYear] = useState("2026-27");
  const [toYear, setToYear] = useState("2027-28");
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

  function getDecision(satsId: string, curClass: string, curSection: string): Decision {
    return decisions[satsId] ?? {
      action: "Promote",
      nextClass: defaultNextClass(curClass, classes),
      nextSection: curSection,
    };
  }

  function updateDecision(satsId: string, patch: Partial<Decision>) {
    setDecisions((prev) => {
      const cur = prev[satsId] ?? getDecision(satsId, "", "");
      return { ...prev, [satsId]: { ...cur, ...patch } };
    });
  }

  async function commit() {
    setPending(true);
    try {
      for (const s of students) {
        const d = getDecision(s.satsId, s.class, s.section);
        if (d.action === "Promote") {
          await firestoreActions.updateStudent(s.satsId, {
            class: d.nextClass,
            section: d.nextSection,
          });
        } else if (d.action === "TransferredOut") {
          await firestoreActions.updateStudent(s.satsId, {
            status: "transferred",
          });
        }
      }

      toast.success("Academic year closed in Cloud Firestore", { description: `${students.length} students updated` });
      setConfirmOpen(false);
      setDecisions({});
    } catch (err: any) {
      console.error("Promotion commit error:", err);
      toast.error("Failed to commit promotions to Firestore.");
    } finally {
      setPending(false);
    }
  }

  const summary = useMemo(() => {
    const s = { Promote: 0, Retain: 0, TransferredOut: 0 };
    for (const st of students) s[getDecision(st.satsId, st.class, st.section).action]++;
    return s;
  }, [students, decisions, classes]);

  return (
    <AppShell
      title="Promote Students"
      subtitle="Close a year and move students forward in Cloud Firestore"
      actions={
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={students.length === 0 || pending}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-ink text-primary-foreground text-[12.5px] font-medium hover:bg-ink/90 transition ace-press-fx disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" /> Review & Commit
        </button>
      }
    >
      <div className="glass-panel p-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <SelectField
          label="Close year"
          value={fromYear}
          onChange={(e) => setFromYear(e.target.value)}
          options={[{ value: "2026-27", label: "2026-27" }]}
        />
        <div className="grid place-items-center">
          <ArrowRight className="h-5 w-5 text-subtle" />
        </div>
        <SelectField
          label="Move students to"
          value={toYear}
          onChange={(e) => setToYear(e.target.value)}
          options={[{ value: "2027-28", label: "2027-28" }]}
        />
        <div className="text-[12.5px] text-subtle grid grid-cols-3 gap-1">
          <Pill>{summary.Promote} promote</Pill>
          <Pill tone="warn">{summary.Retain} retain</Pill>
          <Pill tone="danger">{summary.TransferredOut} out</Pill>
        </div>
      </div>

      {studentsLoading ? (
        <div className="text-[13px] text-subtle py-8 text-center">Loading students from Cloud Firestore...</div>
      ) : classes.map((klass) => {
        const rows = students.filter((s) => s.class === klass);
        if (rows.length === 0) return null;
        const defaultTo = defaultNextClass(klass, classes);
        return (
          <section key={klass} className="mt-6">
            <SectionHeader
              title={klass}
              subtitle={`${rows.length} students · default → ${defaultTo === klass ? "same (top class)" : defaultTo}`}
              action={<Pill tone="accent"><GraduationCap className="h-3 w-3 inline mr-1" />Promotion</Pill>}
            />
            <div className="rounded-2xl hairline overflow-hidden">
              <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr] text-[11.5px] uppercase tracking-wide text-subtle bg-secondary/60 px-4 py-2.5">
                <span>Student</span>
                <span>Action</span>
                <span>Next class</span>
                <span>Next section</span>
                <span className="text-right">Result</span>
              </div>
              {rows.map((s) => {
                const d = getDecision(s.satsId, s.class, s.section);
                const nextSections = sectionsByClass[d.nextClass] ?? sectionsByClass[s.class] ?? ["Section A", "Section B"];
                return (
                  <div key={s.satsId} className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr] items-center gap-2 px-4 py-3 border-t hairline bg-white/60">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium text-ink truncate">{s.name}</div>
                      <div className="text-[11.5px] text-subtle truncate">{s.satsId} · {s.class} · {s.section}</div>
                    </div>
                    <div className="flex gap-1">
                      <ActionPill icon={<ArrowUpRight className="h-3 w-3" />} label="Promote" active={d.action === "Promote"} onClick={() => updateDecision(s.satsId, { action: "Promote" })} />
                      <ActionPill icon={<RotateCcw className="h-3 w-3" />} label="Retain" active={d.action === "Retain"} onClick={() => updateDecision(s.satsId, { action: "Retain" })} />
                      <ActionPill icon={<UserMinus className="h-3 w-3" />} label="Out" active={d.action === "TransferredOut"} onClick={() => updateDecision(s.satsId, { action: "TransferredOut" })} />
                    </div>
                    <select
                      disabled={d.action !== "Promote"}
                      value={d.nextClass}
                      onChange={(e) => updateDecision(s.satsId, { nextClass: e.target.value })}
                      className="rounded-xl bg-white/70 hairline px-2 py-1.5 text-[12.5px] text-ink outline-none disabled:opacity-50"
                    >
                      {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                      disabled={d.action === "TransferredOut"}
                      value={d.nextSection}
                      onChange={(e) => updateDecision(s.satsId, { nextSection: e.target.value })}
                      className="rounded-xl bg-white/70 hairline px-2 py-1.5 text-[12.5px] text-ink outline-none disabled:opacity-50"
                    >
                      {nextSections.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                    </select>
                    <span className="text-[12px] text-subtle text-right">
                      {d.action === "TransferredOut"
                        ? "Marked as transferred"
                        : d.action === "Retain"
                          ? `${s.class} · ${toYear}`
                          : `${d.nextClass} · ${d.nextSection}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <ConfirmDialog
        open={confirmOpen}
        tone="neutral"
        title={`Move ${students.length} students to ${toYear}?`}
        description={`Promote ${summary.Promote} · Retain ${summary.Retain} · Transfer out ${summary.TransferredOut}. History is preserved in Cloud Firestore.`}
        confirmLabel={pending ? "Committing..." : "Commit promotion"}
        onConfirm={commit}
        onCancel={() => setConfirmOpen(false)}
      />
    </AppShell>
  );
}

function ActionPill({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-medium transition hairline " +
        (active ? "bg-ink text-primary-foreground" : "bg-white/70 text-ink hover:bg-secondary")
      }
    >
      {icon}
      {label}
    </button>
  );
}
