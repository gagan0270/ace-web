import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Sparkles, LogIn } from "lucide-react";
import { ErrorBanner, Field, SubmitButton } from "@/components/app/form";
import { signIn, demoCredentials } from "@/lib/auth";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in · Ace Management Portal" },
      {
        name: "description",
        content:
          "Secure sign-in for the Ace Operations Hub — a modern school management portal for principals, workers, and faculty.",
      },
      { property: "og:title", content: "Ace Management Portal" },
      {
        property: "og:description",
        content: "Sign in to the Ace Operations Hub school management portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid work email").max(120),
  password: z.string().min(6, "At least 6 characters").max(72),
});
type Form = z.input<typeof schema>;
type Errors = Partial<Record<keyof Form, string>>;

function LoginPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<Form>({
    email: "gagan00270@gmail.com",
    password: "password123",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const useDemo = (email: string) => {
    setValues({ email, password: "password123" });
    setErrors({});
    setBanner(null);
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
      const s = await signIn(parsed.data.email, parsed.data.password);
      toast.success("Signed in via Firebase Auth", { description: `${s.displayName} · ${s.role}` });
      const dest = s.role === "principal" ? "/principal/overview" : "/faculty/students";
      navigate({ to: dest as unknown as "/" });
    } catch (err: any) {
      setBanner(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.05fr_1fr]">
      <div className="hidden lg:flex flex-col justify-between p-10 relative overflow-hidden">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-2xl bg-ink grid place-items-center">
            <span className="text-primary-foreground font-semibold text-[13px]">A</span>
          </div>
          <div>
            <div className="text-[14px] font-semibold text-ink">Ace Operations</div>
            <div className="text-[11px] text-subtle">Management Portal</div>
          </div>
        </div>

        <div className="max-w-md">
          <div className="ios-pill mb-5">
            <Sparkles className="h-3 w-3" />
            <span>v4.2 · Live Cloud Firestore</span>
          </div>
          <h1 className="text-[46px] leading-[1.05] font-bold tracking-tight text-ink">
            A calm home for
            <br /> everything your school runs on.
          </h1>
          <p className="mt-4 text-[15px] text-subtle max-w-sm">
            Students, buses, faculty, attendance, exams and reports —
            connected to live Cloud Firestore.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-md">
          {[
            { k: "119+", v: "Students" },
            { k: "10", v: "Classes" },
            { k: "100%", v: "Firestore connected" },
          ].map((s) => (
            <div key={s.v} className="glass-card p-4">
              <div className="text-[22px] font-semibold text-ink tabular-nums">{s.k}</div>
              <div className="text-[11px] text-subtle mt-0.5">{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <form onSubmit={onSubmit} noValidate className="glass-panel w-full max-w-md p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-xl bg-secondary grid place-items-center hairline">
              <ShieldCheck className="h-4 w-4 text-ink" strokeWidth={1.75} />
            </div>
            <div className="text-[13px] text-subtle">Firebase Auth · secure access</div>
          </div>

          <h2 className="text-[28px] font-bold tracking-tight text-ink">Sign in</h2>
          <p className="text-[13.5px] text-subtle mt-1">
            Access the Ace Management Portal
          </p>

          <div className="mt-6 space-y-3">
            <ErrorBanner message={banner} />
            <Field
              label="Work email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={set("email")}
              error={errors.email}
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              value={values.password}
              onChange={set("password")}
              error={errors.password}
            />
          </div>

          <SubmitButton pending={pending} className="mt-6 w-full">
            <LogIn className="h-4 w-4" />
            {pending ? "Signing in…" : "Access Secure Portal"}
          </SubmitButton>

          <div className="mt-6 rounded-2xl bg-secondary/60 hairline p-3">
            <div className="text-[11px] uppercase tracking-wide text-subtle mb-2">
              Quick Test Accounts
            </div>
            <div className="flex flex-wrap gap-2">
              {demoCredentials.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => useDemo(d.email)}
                  className="ios-pill hover:bg-white transition"
                >
                  {d.email.split("@")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-[12.5px]">
            <span className="text-subtle">Roles are enforced per module.</span>
            <span className="inline-flex items-center gap-1.5 text-subtle">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.14_155)]" />
              Firebase online
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
