import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: { label: string; tone?: "up" | "down" | "neutral" };
  className?: string;
}) {
  return (
    <div className={cn("glass-card p-5 flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between">
        <div className="h-11 w-11 rounded-2xl bg-secondary grid place-items-center hairline">
          <Icon className="h-5 w-5 text-ink" strokeWidth={1.75} />
        </div>
        {trend ? (
          <span
            className={cn(
              "ios-pill",
              trend.tone === "up" &&
                "bg-[color-mix(in_oklab,var(--color-success)_18%,transparent)] text-[oklch(0.42_0.09_155)]",
              trend.tone === "down" &&
                "bg-[color-mix(in_oklab,var(--color-danger)_18%,transparent)] text-[oklch(0.42_0.14_25)]",
            )}
          >
            {trend.label}
          </span>
        ) : null}
      </div>
      <div className="space-y-1">
        <div className="text-3xl font-semibold tracking-tight text-ink tabular-nums">
          {value}
        </div>
        <div className="text-[13px] text-subtle">{label}</div>
        {hint ? <div className="text-[12px] text-subtle/80">{hint}</div> : null}
      </div>
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div className="min-w-0">
        <h2 className="text-[22px] font-semibold tracking-tight text-ink truncate">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-[13px] text-subtle mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Empty / no-data placeholder — iOS-glass, monochrome.
 * Used as fallback for lists, filtered results and charts.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "glass-card flex flex-col items-center text-center gap-3",
        compact ? "p-6" : "p-10",
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 -m-2 rounded-3xl bg-[radial-gradient(circle,rgba(120,130,160,0.12),transparent_70%)]" />
        <div className="relative h-14 w-14 rounded-2xl bg-secondary grid place-items-center hairline">
          <Icon className="h-6 w-6 text-subtle" strokeWidth={1.5} />
        </div>
      </div>
      <div className="text-[15px] font-medium text-ink">{title}</div>
      <div className="text-[12.5px] text-subtle max-w-sm leading-relaxed">
        {description}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function StatusDot({
  tone = "online",
}: {
  tone?: "online" | "offline" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        tone === "online" &&
          "bg-[oklch(0.72_0.14_155)] shadow-[0_0_0_3px_oklch(0.72_0.14_155/.18)]",
        tone === "offline" && "bg-[oklch(0.7_0.02_260)]",
        tone === "warn" && "bg-[oklch(0.82_0.14_85)]",
      )}
    />
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger" | "accent";
}) {
  return (
    <span
      className={cn(
        "ios-pill",
        tone === "success" &&
          "bg-[color-mix(in_oklab,var(--color-success)_18%,transparent)] text-[oklch(0.4_0.09_155)]",
        tone === "warn" &&
          "bg-[color-mix(in_oklab,var(--color-warning)_22%,transparent)] text-[oklch(0.4_0.09_85)]",
        tone === "danger" &&
          "bg-[color-mix(in_oklab,var(--color-danger)_18%,transparent)] text-[oklch(0.42_0.14_25)]",
        tone === "accent" && "bg-ink text-primary-foreground",
      )}
    >
      {children}
    </span>
  );
}
