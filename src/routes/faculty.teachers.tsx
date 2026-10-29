import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { SectionHeader, StatusDot, Pill, EmptyState } from "@/components/app/primitives";
import { ErrorBanner, Field, SubmitButton } from "@/components/app/form";
import { useTeachers, firestoreActions, type Teacher } from "@/lib/firestore-store";
import { Phone, Trash2, GraduationCap, UserPlus, Pencil } from "lucide-react";
import { useState } from "react";
import { TeacherEditDialog } from "@/components/app/TeacherEditDialog";
import { z } from "zod";
import { toast } from "sonner";

export const Route = createFileRoute("/faculty/teachers")({
  head: () => ({
    meta: [
      { title: "Teachers · Ace Operations" },
      { name: "description", content: "Faculty Management Console for the Ace Operations portal." },
      { property: "og:title", content: "Teachers · Ace Operations" },
      { property: "og:description", content: "Provision faculty access and manage teacher credentials." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeachersPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  email: z.string().trim().email("Valid email required"),
  mobile: z.string().trim().min(10, "Valid mobile number"),
  subject: z.string().trim().min(2, "Subject is required"),
});

type Form = z.input<typeof schema>;
type Errors = Partial<Record<keyof Form, string>>;

function TeachersPage() {
  const { teachers, loading } = useTeachers();
  const [values, setValues] = useState<Form>({ name: "", email: "", mobile: "", subject: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
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
      await firestoreActions.addTeacher({
        name: parsed.data.name,
        email: parsed.data.email,
        mobile: parsed.data.mobile,
        subject: parsed.data.subject,
      });

      toast.success("Faculty provisioned in Firestore", { description: parsed.data.name });
      setValues({ name: "", email: "", mobile: "", subject: "" });
    } catch (err) {
      console.error("Teacher add error:", err);
      setBanner("Firestore sync failed. Try again.");
    } finally {
      setPending(false);
    }
  };

  const onRevoke = async (t: Teacher) => {
    try {
      await firestoreActions.deleteTeacher(t.id);
      toast.success("Faculty revoked from Firestore", { description: `${t.name} · access removed` });
    } catch (err) {
      console.error("Delete teacher error:", err);
      toast.error("Could not revoke teacher.");
    }
  };

  return (
    <AppShell title="Teachers" subtitle="Faculty Management Console">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-4">
        <form onSubmit={onSubmit} noValidate className="glass-panel p-6 space-y-4">
          <SectionHeader
            title="Provision New Faculty Access"
            subtitle="Credentials sync to Firestore on save"
          />
          <ErrorBanner message={banner} />
          <div className="space-y-3">
            <Field
              label="Teacher Name"
              placeholder="Priya Menon"
              value={values.name}
              onChange={set("name")}
              error={errors.name}
            />
            <Field
              label="Email Address"
              placeholder="priya@ace.school"
              type="email"
              value={values.email}
              onChange={set("email")}
              error={errors.email}
            />
            <Field
              label="Mobile Number"
              placeholder="+91 98450 12034"
              inputMode="tel"
              value={values.mobile}
              onChange={set("mobile")}
              error={errors.mobile}
            />
            <Field
              label="Subject"
              placeholder="Mathematics"
              value={values.subject}
              onChange={set("subject")}
              error={errors.subject}
            />
          </div>
          <SubmitButton pending={pending} className="w-full">
            <UserPlus className="h-4 w-4" />
            {pending ? "Provisioning…" : "Provision Faculty"}
          </SubmitButton>
        </form>

        <div className="space-y-3">
          <SectionHeader
            title="Provisioned Faculty"
            subtitle={`${teachers.length} teachers connected`}
            action={<Pill tone="success">Live Firestore</Pill>}
          />
          {loading ? (
            <div className="text-[13px] text-subtle py-8 text-center">Loading faculty from Cloud Firestore...</div>
          ) : teachers.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No faculty provisioned yet"
              description="Provisioned accounts appear here in real time and can be reset or revoked at any moment."
            />
          ) : (
            <div className="space-y-3">
              {teachers.map((t) => (
                <div
                  key={t.id}
                  className="glass-card p-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-2xl bg-secondary grid place-items-center hairline shrink-0">
                      <span className="text-[13px] font-semibold text-ink">
                        {t.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-ink truncate">
                          {t.name}
                        </span>
                        <StatusDot tone={t.status === "online" ? "online" : "offline"} />
                      </div>
                      <div className="text-[12px] text-subtle flex items-center gap-3 mt-0.5">
                        <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{t.mobile}</span>
                        <span>· {t.subject}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditing(t)}
                      className="h-9 px-3 rounded-full glass-card hairline text-[12px] text-ink inline-flex items-center gap-1.5 hover:bg-secondary transition"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => onRevoke(t)}
                      aria-label={`Revoke ${t.name}`}
                      className="h-9 w-9 rounded-full glass-card hairline grid place-items-center text-[oklch(0.55_0.16_25)] hover:bg-secondary transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <TeacherEditDialog
        teacher={editing}
        onClose={() => setEditing(null)}
        onSave={async (patch) => {
          if (!editing) return;
          try {
            await firestoreActions.updateTeacher(editing.id, patch);
            toast.success("Teacher profile updated");
          } catch (err) {
            console.error("Update teacher error:", err);
            toast.error("Could not update teacher.");
          }
        }}
        onDelete={async () => {
          if (!editing) return;
          try {
            await firestoreActions.deleteTeacher(editing.id);
            toast.success("Teacher profile removed");
          } catch (err) {
            console.error("Delete teacher error:", err);
            toast.error("Could not delete teacher.");
          }
        }}
      />
    </AppShell>
  );
}
