import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { SectionHeader, StatusDot, Pill, EmptyState } from "@/components/app/primitives";
import { ErrorBanner, Field, SubmitButton } from "@/components/app/form";
import { useStaff, type Worker } from "@/lib/firestore-store";
import { KeyRound, ShieldOff, UserCog, UserPlus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const Route = createFileRoute("/principal/staff")({
  head: () => ({
    meta: [
      { title: "Operations Staff · Ace Operations" },
      { name: "description", content: "Operations Staff Console — provision workers and manage access." },
      { property: "og:title", content: "Operations Staff · Ace Operations" },
      { property: "og:description", content: "Provision, monitor and revoke worker access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffPage,
});

const schema = z.object({
  displayName: z.string().trim().min(2, "Name is required").max(80),
  email: z.string().trim().email("Enter a valid email").max(120),
});
type Form = z.input<typeof schema>;
type Errors = Partial<Record<keyof Form, string>>;

function StaffPage() {
  const { workers, loading } = useStaff();
  const [values, setValues] = useState<Form>({ displayName: "", email: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

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
      const fakeUid = `user-${Date.now().toString().slice(-6)}`;
      await setDoc(doc(db, "users", fakeUid), {
        uid: fakeUid,
        name: parsed.data.displayName,
        email: parsed.data.email,
        role: "worker",
        status: "active",
        createdAt: serverTimestamp()
      });

      toast.success("Worker provisioned in Firestore", { description: parsed.data.email });
      setValues({ displayName: "", email: "" });
    } catch (err: any) {
      console.error("Worker add error:", err);
      setBanner("Could not create worker profile in Firestore.");
    } finally {
      setPending(false);
    }
  };

  const onRevoke = async (w: Worker) => {
    setBusy(w.id + ":x");
    try {
      await updateDoc(doc(db, "users", w.id), {
        accessRevoked: true,
        status: "inactive",
        updatedAt: serverTimestamp()
      });
      toast.success("Worker access revoked", { description: w.displayName });
    } catch (err) {
      console.error("Revoke error:", err);
      toast.error("Could not revoke worker access.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell title="Operations Staff" subtitle="Operations Staff Console · Live Cloud Users">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-4">
        <form onSubmit={onSubmit} noValidate className="glass-panel p-6 space-y-4">
          <SectionHeader
            title="Provision New Worker Access"
            subtitle="Creates a signed Firestore worker profile"
          />
          <ErrorBanner message={banner} />
          <div className="space-y-3">
            <Field
              label="Display Name"
              placeholder="Neha Gupta"
              value={values.displayName}
              onChange={set("displayName")}
              error={errors.displayName}
            />
            <Field
              label="Email"
              type="email"
              placeholder="neha@aceops.school"
              value={values.email}
              onChange={set("email")}
              error={errors.email}
            />
          </div>
          <SubmitButton pending={pending} className="w-full">
            <UserPlus className="h-4 w-4" />
            {pending ? "Provisioning…" : "Provision Worker"}
          </SubmitButton>
        </form>

        <div>
          <SectionHeader
            title="Active Workers"
            subtitle={`${workers.filter((w) => w.status === "online").length} active of ${workers.length}`}
            action={<Pill tone="success">Live Firestore</Pill>}
          />
          {loading ? (
            <div className="text-[13px] text-subtle py-8 text-center">Loading operations staff from Cloud Firestore...</div>
          ) : workers.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title="No workers on shift"
              description="Provisioned worker profiles appear here as soon as they are created in Firestore."
            />
          ) : (
            <div className="space-y-3">
              {workers.map((w) => (
                <div
                  key={w.id}
                  className="glass-card p-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-2xl bg-secondary grid place-items-center hairline shrink-0">
                      <span className="text-[13px] font-semibold text-ink">
                        {w.displayName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-ink truncate">
                          {w.displayName}
                        </span>
                        <StatusDot tone={w.status === "online" ? "online" : "offline"} />
                      </div>
                      <div className="text-[12px] text-subtle truncate">{w.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onRevoke(w)}
                      disabled={busy === w.id + ":x"}
                      className="h-9 px-3 rounded-full glass-card hairline text-[12px] text-[oklch(0.55_0.16_25)] inline-flex items-center gap-1.5 hover:bg-secondary transition disabled:opacity-60"
                    >
                      <ShieldOff className="h-3.5 w-3.5" />
                      {busy === w.id + ":x" ? "Revoking…" : "Revoke"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
