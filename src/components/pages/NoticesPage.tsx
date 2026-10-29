import { AppShell } from "@/components/app/AppShell";
import { Pill, EmptyState } from "@/components/app/primitives";
import { ErrorBanner, Field, SubmitButton } from "@/components/app/form";
import { SectionTargetPicker } from "@/components/app/SectionTargetPicker";
import { useNotices, useClassesAndSections, firestoreActions } from "@/lib/firestore-store";
import type { Notice } from "@/lib/mock-data";
import { Plus, Calendar, Clock, Trash2, Megaphone, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { z } from "zod";
import { toast } from "sonner";

const schema = z.object({
  title: z.string().trim().min(3, "Title is required").max(100),
  body: z.string().trim().max(500).optional(),
  date: z
    .string()
    .min(1, "Pick a date")
    .refine((d) => !Number.isNaN(new Date(d).getTime()), "Invalid date"),
  time: z.string().min(1, "Pick a time"),
});
type Form = z.input<typeof schema>;
type Errors = Partial<Record<keyof Form, string>>;

function targetLabel(n: Notice): string {
  if (!n.klass) return "Whole school";
  if (!n.sections || n.sections.length === 0) return `${n.klass} · All Sections`;
  return `${n.klass} · ${n.sections.join(", ")}`;
}

export function NoticesPage() {
  const { notices, loading } = useNotices();
  const [open, setOpen] = useState(false);

  return (
    <AppShell
      title="Notices"
      subtitle="Broadcast to school, class or section · Live Cloud Events"
      actions={
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-ink text-primary-foreground text-[12.5px] font-medium hover:bg-ink/90 transition ace-press-fx"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Notice
        </button>
      }
    >
      {loading ? (
        <div className="text-[13px] text-subtle py-8 text-center">Loading notices from Cloud Firestore...</div>
      ) : notices.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No notices yet"
          description="Whole-school announcements and class/section notices you post will surface here and in the parent app in real time."
          action={
            <button
              onClick={() => setOpen(true)}
              className="ios-pill bg-ink !text-primary-foreground"
            >
              <Plus className="h-3 w-3" /> Create notice
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ace-stagger">
          {notices.map((n) => (
            <div key={n.id} className="glass-card p-5 ace-card-hover">
              <div className="flex items-start justify-between">
                <Pill tone={n.klass ? "accent" : "success"}>{targetLabel(n)}</Pill>
                <button
                  onClick={async () => {
                    try {
                      await firestoreActions.deleteNotice(n.id);
                      toast.success("Notice deleted from Firestore", { description: n.title });
                    } catch (err) {
                      console.error("Delete notice error:", err);
                      toast.error("Could not delete notice.");
                    }
                  }}
                  aria-label={`Delete ${n.title}`}
                  className="h-8 w-8 rounded-full grid place-items-center text-subtle hover:text-[oklch(0.55_0.16_25)] hover:bg-secondary transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 text-[16px] font-semibold text-ink tracking-tight">
                {n.title}
              </div>
              {n.body ? <div className="mt-1 text-[12.5px] text-subtle">{n.body}</div> : null}
              <div className="mt-3 flex items-center gap-4 text-[12.5px] text-subtle">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {n.date}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {n.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? <CreateNoticeDialog onClose={() => setOpen(false)} /> : null}
    </AppShell>
  );
}

function CreateNoticeDialog({ onClose }: { onClose: () => void }) {
  const { classes, sectionsByClass } = useClassesAndSections();

  const [values, setValues] = useState<Form>({
    title: "",
    body: "",
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
  });
  const [klass, setKlass] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [allSections, setAllSections] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const iss of parsed.error.issues) {
        const k = iss.path[0] as keyof Form;
        if (!next[k]) next[k] = iss.message;
      }
      setErrors(next);
      setBanner("Please correct the highlighted fields.");
      return;
    }

    setPending(true);
    try {
      await firestoreActions.addNotice({
        title: parsed.data.title,
        body: parsed.data.body,
        date: parsed.data.date,
        time: parsed.data.time,
        targetClass: klass || "All Classes",
      });

      toast.success("Notice posted to Cloud Firestore", { description: parsed.data.title });
      onClose();
    } catch (err: any) {
      console.error("Notice post error:", err);
      setBanner("Could not post notice to Cloud Firestore.");
    } finally {
      setPending(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create notice"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <form
        onSubmit={submit}
        noValidate
        className="glass-panel relative z-10 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto ace-modal-enter shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[18px] font-semibold text-ink">Create notice</div>
            <div className="text-[12.5px] text-subtle">
              Scope is enforced on live cloud database
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full grid place-items-center text-subtle hover:bg-secondary hover:text-ink transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ErrorBanner message={banner} />
        <Field label="Title" placeholder="Founders Day Assembly" value={values.title} onChange={set("title")} error={errors.title} />
        <Field label="Message (optional)" placeholder="Short details for parents…" value={values.body ?? ""} onChange={set("body")} error={errors.body} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Date" type="date" value={values.date} onChange={set("date")} error={errors.date} />
          <Field label="Time" type="time" value={values.time} onChange={set("time")} error={errors.time} />
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
          includeWholeSchool
        />

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-[13px] text-ink hover:bg-secondary transition"
          >
            Cancel
          </button>
          <SubmitButton pending={pending}>
            <Plus className="h-4 w-4" />
            {pending ? "Posting…" : "Post notice"}
          </SubmitButton>
        </div>
      </form>
    </div>,
    document.body
  );
}
