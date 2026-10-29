import { AppShell } from "@/components/app/AppShell";
import { SectionHeader, Pill, EmptyState } from "@/components/app/primitives";
import { ErrorBanner, Field, SelectField, SubmitButton } from "@/components/app/form";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { BackButton } from "@/components/app/BackButton";
import { SkeletonGrid } from "@/components/app/Skeleton";
import { useDrillLoading } from "@/hooks/use-drill-loading";
import { useStudents, useClassesAndSections, useBuses, firestoreActions, type FullStudent } from "@/lib/firestore-store";
import {
  Users,
  Search,
  Plus,
  ChevronRight,
  UserPlus,
  SearchX,
  Trash2,
  School,
  Pencil,
  Check,
  X as XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";

const studentSchema = z.object({
  satsId: z.string().trim().min(3, "SATS ID required"),
  name: z.string().trim().min(2, "Name is required").max(80),
  gender: z.enum(["M", "F"], { errorMap: () => ({ message: "Select gender" }) }),
  klass: z.string().trim().min(1, "Class is required"),
  section: z.string().trim().min(1, "Section is required"),
  bus: z.string().trim().optional(),
  parentUserId: z.string().trim().optional(),
});

type StudentForm = z.input<typeof studentSchema>;
type FieldErrors = Partial<Record<keyof StudentForm, string>>;

export function StudentsPage({ basePath }: { basePath: "/faculty/students" | "/principal/students" }) {
  const { students, loading: studentsLoading } = useStudents();
  const { classes, sectionsByClass, loading: classesLoading } = useClassesAndSections();

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"classes" | "sections" | "students">("classes");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [openRegister, setOpenRegister] = useState(false);
  const [openAddClass, setOpenAddClass] = useState(false);
  const [newClassNameInput, setNewClassNameInput] = useState("");

  const [confirmClass, setConfirmClass] = useState<string | null>(null);
  const [confirmSection, setConfirmSection] = useState<string | null>(null);

  // Optimistic UI state for instant deletion
  const [deletedClasses, setDeletedClasses] = useState<string[]>([]);
  const [deletedSections, setDeletedSections] = useState<string[]>([]);

  const drillKey = `${view}::${selectedClass ?? ""}::${selectedSection ?? ""}`;
  const drilling = useDrillLoading(drillKey) || studentsLoading || classesLoading;

  const visibleClasses = useMemo(
    () => classes.filter((c) => !deletedClasses.includes(c)),
    [classes, deletedClasses]
  );

  const inClass = (s: FullStudent) => (!selectedClass || s.class === selectedClass) && !deletedClasses.includes(s.class);
  const inSection = (s: FullStudent) => !selectedSection || s.section === selectedSection;
  const matchQuery = (s: FullStudent) =>
    query === "" ||
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.satsId.toLowerCase().includes(query.toLowerCase());

  const studentsInSelection = useMemo(
    () => students.filter((s) => inClass(s) && inSection(s) && matchQuery(s)),
    [students, selectedClass, selectedSection, query, deletedClasses],
  );

  const backTo = (target: "classes" | "sections") => {
    if (target === "classes") {
      setSelectedClass(null);
      setSelectedSection(null);
      setView("classes");
    } else {
      setSelectedSection(null);
      setView("sections");
    }
  };

  const handleCreateClass = async () => {
    const clean = newClassNameInput.trim();
    if (!clean) return;
    try {
      await firestoreActions.addClass(clean);
      toast.success(`${clean} added to Cloud Firestore`);
      setNewClassNameInput("");
      setOpenAddClass(false);
    } catch (err) {
      console.error("Add class error:", err);
      toast.error("Could not add class to Firestore");
    }
  };

  const handleConfirmDeleteClass = async () => {
    if (!confirmClass) return;
    const targetClass = confirmClass;
    setConfirmClass(null);

    setDeletedClasses((prev) => [...prev, targetClass]);
    toast.success(`${targetClass} removed from UI`, {
      description: `Deleting class & all enrolled students from Cloud Firestore...`
    });

    try {
      await firestoreActions.deleteClass(targetClass);
      toast.success(`${targetClass} & all students deleted from Cloud Firestore`);
    } catch (err) {
      console.error("Error deleting class in Firestore:", err);
      toast.error(`Failed to delete ${targetClass} in Firestore`);
    }
  };

  const handleConfirmDeleteSection = async () => {
    if (!confirmSection || !selectedClass) return;
    const targetSection = confirmSection;
    setConfirmSection(null);

    setDeletedSections((prev) => [...prev, `${selectedClass}::${targetSection}`]);
    toast.success(`Section ${targetSection} removed from UI`, {
      description: `Deleting all students in ${selectedClass} · Section ${targetSection} from Cloud Firestore...`
    });

    try {
      await firestoreActions.deleteSection(selectedClass, targetSection);
      toast.success(`Section ${targetSection} deleted from Cloud Firestore`);
    } catch (err) {
      console.error("Error deleting section in Firestore:", err);
      toast.error(`Failed to delete section ${targetSection} in Firestore`);
    }
  };

  const activeStudentsForClass = (c: string) =>
    students.filter((s) => s.class === c && !deletedClasses.includes(c)).length;

  return (
    <AppShell
      title="Students"
      subtitle="Enrollment register · class and section drill-down"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenAddClass((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-secondary hover:bg-secondary/80 text-ink text-[12.5px] font-medium hairline transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Class
          </button>
          <button
            onClick={() => setOpenRegister((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-ink text-primary-foreground text-[12.5px] font-medium hover:bg-ink/90 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Register Student
          </button>
        </div>
      }
    >
      {openAddClass ? (
        <div className="glass-panel p-5 mt-6 max-w-md space-y-3">
          <SectionHeader title="Add New Class" subtitle="Create class entry in Cloud Firestore" />
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Class Name (e.g. 1st Class, 5th Class)"
              value={newClassNameInput}
              onChange={(e) => setNewClassNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
              className="flex-1 rounded-xl bg-white hairline px-3.5 py-2 text-[13.5px] text-ink outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCreateClass}
              className="px-4 py-2 bg-ink text-primary-foreground text-[12.5px] font-medium rounded-xl shrink-0"
            >
              Add Class
            </button>
            <button
              type="button"
              onClick={() => setOpenAddClass(false)}
              className="text-[12.5px] text-subtle hover:text-ink px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {openRegister ? (
        <RegisterCard
          defaultClass={selectedClass ?? ""}
          defaultSection={selectedSection ?? ""}
          onClose={() => setOpenRegister(false)}
        />
      ) : null}

      {view !== "classes" ? (
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <BackButton
            label={view === "students" ? `Back to ${selectedClass} sections` : "Back to all classes"}
            onClick={() => (view === "students" ? backTo("sections") : backTo("classes"))}
          />
          <div className="flex items-center gap-2 text-[12.5px] text-subtle flex-wrap">
            <button onClick={() => backTo("classes")} className="hover:text-ink transition">All Classes</button>
            {selectedClass ? (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <button onClick={() => backTo("sections")} className="hover:text-ink transition">{selectedClass}</button>
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

      <div className="glass-card p-5 mt-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or SATS ID"
            aria-label="Search students"
            className="w-full pl-9 pr-4 py-2.5 rounded-full bg-white/70 hairline text-[13.5px] text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink/10 transition"
          />
        </div>
      </div>

      {drilling ? <SkeletonGrid count={6} /> : null}

      {!drilling && view === "classes" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4 ace-stagger">
          {visibleClasses.map((c) => {
            const count = activeStudentsForClass(c);
            const sectionCount = (sectionsByClass[c] ?? ["Section A", "Section B"]).length;
            return (
              <EditableCard
                key={c}
                label={c}
                onRename={(v) => toast.info("Rename requested", { description: v })}
                onDelete={() => setConfirmClass(c)}
                onOpen={() => {
                  setSelectedClass(c);
                  setView("sections");
                }}
                icon={<School className="h-5 w-5 text-ink" strokeWidth={1.75} />}
                sub={`${count} students · ${sectionCount} sections`}
                openLabel="Open sections"
              />
            );
          })}
        </div>
      ) : null}

      {!drilling && view === "sections" && selectedClass ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4 ace-stagger">
          {(sectionsByClass[selectedClass] ?? ["Section A", "Section B", "Section C", "Section D"])
            .filter((sec) => !deletedSections.includes(`${selectedClass}::${sec}`))
            .map((sec) => {
              const count = students.filter(
                (s) => s.class === selectedClass && s.section === sec && !deletedClasses.includes(selectedClass)
              ).length;
              return (
                <EditableCard
                  key={sec}
                  label={sec}
                  onRename={(v) => toast.info("Rename requested", { description: v })}
                  onDelete={() => setConfirmSection(sec)}
                  onOpen={() => {
                    setSelectedSection(sec);
                    setView("students");
                  }}
                  icon={<Users className="h-5 w-5 text-ink" strokeWidth={1.75} />}
                  sub={`${count} students enrolled`}
                  openLabel="Open register"
                />
              );
            })}
        </div>
      ) : null}

      {!drilling && view === "students" && selectedClass && selectedSection ? (
        <>
          {studentsInSelection.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={SearchX}
                title="No students in this section"
                description="Add a student using the card below or via Register Student."
              />
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4 ace-stagger">
            {studentsInSelection.map((s) => (
              <Link
                key={s.satsId}
                to={`${basePath}/$satsId` as any}
                params={{ satsId: s.satsId } as any}
                className="glass-card p-5 ace-card-hover ace-press-fx transition group block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-2xl bg-secondary grid place-items-center hairline shrink-0">
                      <span className="text-[13px] font-semibold text-ink">
                        {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-semibold text-ink truncate">{s.name}</div>
                      <div className="text-[11.5px] text-subtle truncate">{s.satsId} · {s.gender === "F" ? "Female" : "Male"}</div>
                    </div>
                  </div>
                  <Pill tone={s.bus === "No Bus" || s.bus === "Unassigned" ? "neutral" : "accent"}>{s.bus}</Pill>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
                  <MetaCell label="Class" value={s.class} />
                  <MetaCell label="Section" value={s.section} />
                  <MetaCell label="Fee Status" value={`₹${s.fees.paid.toLocaleString()}`} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[12px] text-subtle group-hover:text-ink transition">Open profile</span>
                  <ChevronRight className="h-4 w-4 text-subtle group-hover:text-ink transition" />
                </div>
              </Link>
            ))}
            <AddStudentHereCard
              klass={selectedClass}
              section={selectedSection}
              onClick={() => setOpenRegister(true)}
            />
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={!!confirmClass}
        title={`Delete ${confirmClass}?`}
        description={`CRITICAL WARNING: This will permanently delete ${confirmClass}, along with all ${
          confirmClass ? activeStudentsForClass(confirmClass) : 0
        } students enrolled in this class and their fee/attendance records. This action cannot be undone.`}
        confirmLabel="Delete class & all students"
        onConfirm={handleConfirmDeleteClass}
        onCancel={() => setConfirmClass(null)}
      />
      <ConfirmDialog
        open={!!confirmSection}
        title={`Delete Section ${confirmSection}?`}
        description={`WARNING: Deleting Section ${confirmSection} will permanently remove all students registered in this section from Cloud Firestore.`}
        confirmLabel="Delete section & students"
        onConfirm={handleConfirmDeleteSection}
        onCancel={() => setConfirmSection(null)}
      />
    </AppShell>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/70 hairline px-3 py-2">
      <div className="text-[10.5px] uppercase tracking-wide text-subtle">{label}</div>
      <div className="text-[13px] text-ink font-medium mt-0.5 truncate">{value}</div>
    </div>
  );
}

function EditableCard({
  label,
  sub,
  icon,
  openLabel,
  onOpen,
  onRename,
  onDelete,
}: {
  label: string;
  sub: string;
  icon: React.ReactNode;
  openLabel: string;
  onOpen: () => void;
  onRename: (v: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  const commit = () => {
    if (draft.trim() && draft !== label) {
      onRename(draft.trim());
    }
    setEditing(false);
  };

  return (
    <div className="glass-card p-5 hover:shadow-[var(--shadow-glass-lg)] transition group relative">
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDraft(label);
            setEditing(true);
          }}
          className="h-8 w-8 rounded-full grid place-items-center text-subtle hover:text-ink hover:bg-secondary transition"
          aria-label={`Rename ${label}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-8 w-8 rounded-full grid place-items-center text-subtle hover:text-[oklch(0.55_0.16_25)] hover:bg-[oklch(0.72_0.17_25/.08)] transition"
          aria-label={`Delete ${label}`}
        >
          <Trash2 className="h-3.5 w-3.5 text-[oklch(0.55_0.16_25)]" />
        </button>
      </div>
      <button onClick={onOpen} className="block text-left w-full pl-2">
        <div className="h-11 w-11 rounded-2xl bg-secondary grid place-items-center hairline">
          {icon}
        </div>
        {editing ? (
          <div className="mt-4 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="flex-1 rounded-xl bg-white/70 hairline px-3 py-1.5 text-[14px] text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink/10 transition"
            />
            <button
              type="button"
              onClick={commit}
              className="h-8 w-8 rounded-full grid place-items-center bg-ink text-primary-foreground"
              aria-label="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-8 w-8 rounded-full grid place-items-center text-subtle hover:bg-secondary"
              aria-label="Cancel"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 text-[20px] font-semibold text-ink tracking-tight">{label}</div>
            <div className="text-[12.5px] text-subtle mt-0.5">{sub}</div>
          </>
        )}
        <div className="mt-4 flex items-center justify-between text-[12.5px] text-subtle">
          <span>{openLabel}</span>
          <ChevronRight className="h-4 w-4 group-hover:text-ink transition" />
        </div>
      </button>
    </div>
  );
}

function AddStudentHereCard({ klass, section, onClick }: { klass: string; section: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass-card p-5 border-dashed text-left hover:shadow-[var(--shadow-glass-lg)] transition"
    >
      <div className="h-11 w-11 rounded-2xl bg-secondary grid place-items-center hairline">
        <UserPlus className="h-5 w-5 text-ink" strokeWidth={1.75} />
      </div>
      <div className="mt-4 text-[15px] font-semibold text-ink">Add Student Here</div>
      <div className="text-[12.5px] text-subtle mt-0.5">
        Opens enrollment form pre-filled for {klass} · {section}.
      </div>
      <div className="mt-4 inline-flex items-center gap-1 text-[12.5px] text-ink">
        Open form <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

const emptyForm: StudentForm = {
  satsId: "",
  name: "",
  gender: "M",
  klass: "",
  section: "",
  bus: "No Bus",
  parentUserId: "",
};

function RegisterCard({
  onClose,
  defaultClass,
  defaultSection,
}: {
  onClose: () => void;
  defaultClass: string;
  defaultSection: string;
}) {
  const { buses } = useBuses();
  const [values, setValues] = useState<StudentForm>({
    ...emptyForm,
    klass: defaultClass || "1st Class",
    section: defaultSection || "Section A",
    satsId: `SATS${Math.floor(1000 + Math.random() * 9000)}`,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (k: keyof StudentForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.value;
    setValues((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const parsed = studentSchema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const iss of parsed.error.issues) {
        const k = iss.path[0] as keyof StudentForm;
        if (!next[k]) next[k] = iss.message;
      }
      setErrors(next);
      setBanner("Please correct the highlighted fields.");
      return;
    }

    setPending(true);
    try {
      await firestoreActions.addStudent({
        satsId: parsed.data.satsId,
        name: parsed.data.name,
        gender: parsed.data.gender,
        class: parsed.data.klass,
        section: parsed.data.section,
        bus: parsed.data.bus || "No Bus",
      });

      toast.success("Student registered in Firestore", { description: `${parsed.data.name} · ${parsed.data.satsId}` });
      setValues({ ...emptyForm, klass: defaultClass, section: defaultSection });
      onClose();
    } catch (err: any) {
      console.error("Add student error:", err);
      setBanner("Could not save student to Firestore.");
    } finally {
      setPending(false);
    }
  };

  const busOptions = [
    { value: "No Bus", label: "No Bus" },
    ...buses.map((b) => ({ value: b.id, label: `${b.id} (${b.route} - ₹${(b.fee || 12000).toLocaleString()})` })),
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="glass-panel p-6 mt-6 space-y-4">
      <SectionHeader
        title="Enrollment Register"
        subtitle={defaultClass ? `Adding to ${defaultClass} · ${defaultSection}` : "Add a new student to the roster"}
        action={
          <button type="button" onClick={onClose} className="text-[12.5px] text-subtle hover:text-ink">
            Cancel
          </button>
        }
      />
      <ErrorBanner message={banner} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <Field label="SATS ID" placeholder="SATS01A001" value={values.satsId} onChange={set("satsId")} error={errors.satsId} />
        <Field label="Student Name" placeholder="Full name" value={values.name} onChange={set("name")} error={errors.name} />
        <SelectField
          label="Gender"
          value={values.gender}
          onChange={set("gender")}
          error={errors.gender}
          options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }]}
        />
        <Field label="Class" placeholder="e.g. 1st Class" value={values.klass} onChange={set("klass")} error={errors.klass} />
        <Field label="Section" placeholder="e.g. Section A" value={values.section} onChange={set("section")} error={errors.section} />
        <SelectField
          label="Assigned Bus Route"
          value={values.bus || "No Bus"}
          onChange={set("bus")}
          error={errors.bus}
          options={busOptions}
        />
      </div>
      <div className="flex justify-end">
        <SubmitButton pending={pending}>
          <UserPlus className="h-4 w-4" />
          {pending ? "Registering…" : "Add Student"}
        </SubmitButton>
      </div>
    </form>
  );
}
