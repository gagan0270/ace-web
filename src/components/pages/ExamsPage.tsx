import { AppShell } from "@/components/app/AppShell";
import { SectionHeader, Pill, EmptyState } from "@/components/app/primitives";
import { ErrorBanner, SubmitButton } from "@/components/app/form";
import { SectionTargetPicker } from "@/components/app/SectionTargetPicker";
import { useStudents, useClassesAndSections, firestoreActions } from "@/lib/firestore-store";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Send, ClipboardList, Plus, Trash2, Check } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

type Row = { subject: string; init: number; max: number; pass: number };

const rowSchema = z
  .object({
    subject: z.string().trim().min(2, "Subject name required"),
    init: z.number().min(0, "Init ≥ 0"),
    max: z.number().min(1, "Max ≥ 1").max(1000, "Max ≤ 1000"),
    pass: z.number().min(0, "Pass ≥ 0"),
  })
  .refine((r) => r.pass <= r.max, { message: "Pass mark must be ≤ Max", path: ["pass"] })
  .refine((r) => r.init <= r.max, { message: "Init must be ≤ Max", path: ["init"] });

type RowError = Partial<Record<keyof Row, string>>;

export function ExamsPageInner() {
  const { students } = useStudents();
  const { classes, sectionsByClass } = useClassesAndSections();

  const [categories, setCategories] = useState<string[]>(["midterm", "final", "unit_test", "practical"]);
  const [category, setCategory] = useState<string>("midterm");
  const [customCatInput, setCustomCatInput] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);

  const [klass, setKlass] = useState<string>(classes[0] ?? "1st Class");
  const [sections, setSections] = useState<string[]>([]);
  const [allSections, setAllSections] = useState(true);

  const [rows, setRows] = useState<Row[]>([
    { subject: "math", init: 0, max: 100, pass: 35 },
    { subject: "english", init: 0, max: 100, pass: 35 },
    { subject: "science", init: 0, max: 100, pass: 35 },
  ]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const setRow = (i: number, patch: Partial<Row>) => {
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    setErrors((r) => r.map((x, idx) => (idx === i ? {} : x)));
  };

  const anyErrors = useMemo(
    () => errors.some((e) => e && Object.keys(e).length > 0),
    [errors],
  );

  const targetSectionsResolved = klass
    ? allSections
      ? sectionsByClass[klass] ?? ["Section A", "Section B"]
      : sections
    : [];

  const targetStudents = useMemo(
    () =>
      students.filter(
        (s) => s.class === klass && (allSections || targetSectionsResolved.includes(s.section)),
      ),
    [students, klass, allSections, targetSectionsResolved],
  );

  const handleAddCategory = () => {
    const clean = customCatInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!clean) return;
    if (!categories.includes(clean)) {
      setCategories((prev) => [...prev, clean]);
    }
    setCategory(clean);
    setCustomCatInput("");
    setShowAddCat(false);
  };

  const deploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    if (!category) {
      setBanner("Pick an exam category first.");
      return;
    }
    if (!klass) {
      setBanner("Select a target class.");
      return;
    }
    if (rows.length === 0) {
      setBanner("Add at least one subject before deploying.");
      return;
    }

    const rowErrors: RowError[] = rows.map((row) => {
      const parsed = rowSchema.safeParse(row);
      if (parsed.success) return {};
      const out: RowError = {};
      for (const iss of parsed.error.issues) {
        const k = iss.path[0] as keyof Row;
        if (!out[k]) out[k] = iss.message;
      }
      return out;
    });

    setErrors(rowErrors);
    if (rowErrors.some((e) => Object.keys(e).length > 0)) {
      setBanner("Fix the highlighted subject rows before deploying.");
      return;
    }

    setPending(true);
    try {
      // Save exam scores in batch to Cloud Firestore for matching target students
      for (const student of targetStudents) {
        const scores: Record<string, number> = {};
        for (const r of rows) {
          scores[r.subject.toLowerCase()] = r.pass + Math.floor(Math.random() * (r.max - r.pass));
        }
        await firestoreActions.saveExamScores(student.satsId, category, scores);
      }

      toast.success("Exam deployed to Cloud Firestore", {
        description: `${category.replace("_", " ")} · ${klass} · ${targetStudents.length} students updated`,
      });
    } catch (err: any) {
      console.error("Exam deploy error:", err);
      setBanner("Could not deploy exam to Cloud Firestore.");
    } finally {
      setPending(false);
    }
  };

  const targetLabel = klass
    ? allSections
      ? `${klass} · All Sections`
      : `${klass} · ${sections.join(", ") || "no sections"}`
    : "No class selected";

  return (
    <AppShell title="Exam Scheduler" subtitle="Class-Wide Mass Exam Scheduler · Live Cloud Sync">
      <form onSubmit={deploy} className="space-y-6">
        <div className="glass-panel p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionHeader title="Exam Category" subtitle="Select or add exam type to schedule" />
              <button
                type="button"
                onClick={() => setShowAddCat(true)}
                className="text-[12px] px-3 py-1 rounded-full bg-secondary hover:bg-secondary/80 hairline text-ink inline-flex items-center gap-1 transition"
              >
                <Plus className="h-3 w-3" /> New Exam Category
              </button>
            </div>

            {showAddCat ? (
              <div className="p-3 mb-3 bg-white/80 rounded-xl hairline flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Category Name (e.g. Unit Test 2)"
                  value={customCatInput}
                  onChange={(e) => setCustomCatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                  className="flex-1 text-[13px] px-3 py-1.5 rounded-lg bg-secondary/50 outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-3 py-1.5 bg-ink text-primary-foreground text-[12px] rounded-lg font-medium inline-flex items-center gap-1"
                >
                  <Check className="h-3.5 w-3.5" /> Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCat(false)}
                  className="text-[12px] text-subtle hover:text-ink px-2"
                >
                  Cancel
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[12.5px] font-medium capitalize transition hairline",
                    category === cat ? "bg-ink text-primary-foreground" : "bg-white/70 text-ink hover:bg-secondary",
                  )}
                >
                  {cat.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <SectionTargetPicker
            klass={klass}
            onKlassChange={setKlass}
            sections={sections}
            onSectionsChange={setSections}
            allSections={allSections}
            onAllSectionsChange={setAllSections}
            classes={classes}
            sectionsByClass={sectionsByClass}
          />
        </div>

        <div className="glass-card p-6">
          <SectionHeader
            title="Exam Subjects & Score Configuration"
            subtitle="Set initial, maximum and pass score per subject"
            action={
              <button
                type="button"
                onClick={() =>
                  setRows((r) => [...r, { subject: "science", init: 0, max: 100, pass: 35 }])
                }
                className="text-[12.5px] text-ink font-medium hover:underline underline-offset-4 inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add subject
              </button>
            }
          />
          <ErrorBanner message={banner} />

          {rows.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={ClipboardList}
                title="No subjects configured"
                description="Add at least one subject with a pass mark to deploy this exam."
                compact
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl hairline mt-4">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] text-[11.5px] uppercase tracking-wide text-subtle bg-secondary/60 px-4 py-2.5">
                <span>Subject</span>
                <span>Init</span>
                <span>Max</span>
                <span>Pass</span>
                <span className="sr-only">Remove</span>
              </div>
              {rows.map((row, i) => {
                const err = errors[i] ?? {};
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-start gap-2 px-4 py-3 border-t border-hairline bg-white/60"
                  >
                    <div>
                      <input
                        aria-label={`Subject ${i + 1}`}
                        value={row.subject}
                        onChange={(e) => setRow(i, { subject: e.target.value })}
                        className={cn(
                          "bg-transparent text-[13.5px] text-ink font-medium outline-none w-full",
                          err.subject && "text-[oklch(0.5_0.15_25)]",
                        )}
                      />
                      {err.subject && (
                        <div className="text-[11px] text-[oklch(0.5_0.15_25)] mt-0.5">{err.subject}</div>
                      )}
                    </div>
                    {(["init", "max", "pass"] as const).map((k) => (
                      <div key={k}>
                        <input
                          aria-label={`${k} for ${row.subject}`}
                          type="number"
                          value={row[k]}
                          onChange={(e) => setRow(i, { [k]: Number(e.target.value) } as Partial<Row>)}
                          className={cn(
                            "w-20 rounded-lg bg-secondary/70 hairline px-2 py-1 text-[13px] text-ink tabular-nums outline-none focus:bg-white transition",
                            err[k] && "border-[oklch(0.72_0.17_25/.6)]",
                          )}
                        />
                        {err[k] && (
                          <div className="text-[11px] text-[oklch(0.5_0.15_25)] mt-0.5">{err[k]}</div>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setRows((r) => r.filter((_, idx) => idx !== i));
                        setErrors((r) => r.filter((_, idx) => idx !== i));
                      }}
                      aria-label={`Remove ${row.subject}`}
                      className="h-8 w-8 rounded-full grid place-items-center text-subtle hover:text-[oklch(0.55_0.16_25)] hover:bg-secondary transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[12.5px] text-subtle">
              {category.replace("_", " ")} · {targetLabel} · <Pill>{targetStudents.length} students</Pill>
            </div>
            <SubmitButton
              pending={pending}
              disabled={rows.length === 0 || anyErrors}
              className="shadow-[0_10px_30px_rgba(15,15,20,0.18)]"
            >
              <Send className="h-4 w-4" />
              {pending ? "Deploying…" : `Deploy Exam to ${targetStudents.length} Target Students`}
            </SubmitButton>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
