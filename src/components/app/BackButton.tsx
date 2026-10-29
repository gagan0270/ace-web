import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@tanstack/react-router";
import type { MouseEventHandler } from "react";

/**
 * Large, prominent back affordance for every drill-down screen.
 * Renders as a Link when `to` is provided, otherwise as a button that
 * pops history (or calls onClick).
 */
export function BackButton({
  to,
  params,
  label = "Back",
  onClick,
  className,
}: {
  to?: string;
  params?: Record<string, string>;
  label?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}) {
  const router = useRouter();
  const base =
    "inline-flex items-center gap-2 px-4 py-2.5 rounded-full glass-card hairline text-[13px] font-medium text-ink hover:bg-secondary transition outline-none focus-visible:ring-2 focus-visible:ring-ink/40";

  if (to) {
    return (
      <Link
        to={to as any}
        params={params as any}
        className={cn(base, className)}
        aria-label={label}
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        <span>{label}</span>
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={
        onClick ??
        (() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.history.back();
          }
        })
      }
      className={cn(base, className)}
      aria-label={label}
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}
