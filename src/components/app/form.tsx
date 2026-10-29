import { forwardRef, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type ButtonHTMLAttributes } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * iOS-glass form primitives shared across all add/provision/edit forms.
 * Handles: field-level errors, error banner, spinner submit button.
 */

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-2xl border border-[oklch(0.72_0.17_25/.3)] bg-[oklch(0.72_0.17_25/.08)] px-3.5 py-2.5 text-[12.5px] text-[oklch(0.42_0.14_25)]"
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.75} />
      <span>{message}</span>
    </div>
  );
}

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const inputId = id ?? label.replace(/\s+/g, "-").toLowerCase();
  return (
    <label htmlFor={inputId} className="block">
      <span className="text-[11.5px] text-subtle">{label}</span>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={
          error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined
        }
        className={cn(
          "mt-1 w-full rounded-2xl bg-white/70 hairline px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition focus:bg-white focus:ring-2 focus:ring-ink/10",
          error &&
            "border-[oklch(0.72_0.17_25/.6)] focus:ring-[oklch(0.72_0.17_25/.2)]",
          className,
        )}
        {...rest}
      />
      {error ? (
        <span
          id={`${inputId}-err`}
          className="mt-1 block text-[11.5px] text-[oklch(0.5_0.15_25)]"
        >
          {error}
        </span>
      ) : hint ? (
        <span
          id={`${inputId}-hint`}
          className="mt-1 block text-[11px] text-subtle/80"
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
});

type SelectFieldProps = {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
} & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({
  label,
  error,
  options,
  className,
  id,
  ...rest
}: SelectFieldProps) {
  const inputId = id ?? label.replace(/\s+/g, "-").toLowerCase();
  return (
    <label htmlFor={inputId} className="block">
      <span className="text-[11.5px] text-subtle">{label}</span>
      <select
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${inputId}-err` : undefined}
        className={cn(
          "mt-1 w-full rounded-2xl bg-white/70 hairline px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition focus:bg-white focus:ring-2 focus:ring-ink/10",
          error &&
            "border-[oklch(0.72_0.17_25/.6)] focus:ring-[oklch(0.72_0.17_25/.2)]",
          className,
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <span
          id={`${inputId}-err`}
          className="mt-1 block text-[11.5px] text-[oklch(0.5_0.15_25)]"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function SubmitButton({
  pending,
  children,
  className,
  ...rest
}: { pending?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      disabled={pending || rest.disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl bg-ink text-primary-foreground px-5 py-3 text-[13px] font-medium transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
      {...rest}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

/** Simulated async submit used by the mock UI. */
export function fakeSubmit<T>(payload: T, ms = 900): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(payload), ms));
}
