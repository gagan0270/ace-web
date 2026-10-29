import { cn } from "@/lib/utils";

export type SegTone = "neutral" | "success" | "danger" | "warn";
export type SegOption<T extends string = string> = {
  value: T;
  label: string;
  tone?: SegTone;
};

// Per-tone active styles (color-mix keeps design-token compliance).
const toneClasses: Record<SegTone, string> = {
  neutral: "bg-white text-ink shadow-[0_2px_6px_rgba(15,15,20,0.08)]",
  success:
    "bg-[color-mix(in_oklab,var(--color-success)_28%,white)] text-[oklch(0.36_0.09_155)] shadow-[0_2px_6px_rgba(15,15,20,0.08)]",
  danger:
    "bg-[color-mix(in_oklab,var(--color-danger)_26%,white)] text-[oklch(0.4_0.14_25)] shadow-[0_2px_6px_rgba(15,15,20,0.08)]",
  warn:
    "bg-[color-mix(in_oklab,var(--color-warning)_34%,white)] text-[oklch(0.36_0.09_85)] shadow-[0_2px_6px_rgba(15,15,20,0.08)]",
};

export function SegmentedPills<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: SegOption<T>[] | T[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const opts: SegOption<T>[] = (options as any[]).map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <div
      className={cn(
        "inline-flex items-center p-1 rounded-full bg-secondary hairline",
        className,
      )}
    >
      {opts.map((opt) => {
        const active = value === opt.value;
        const tone: SegTone = opt.tone ?? "neutral";
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full font-medium transition",
              size === "sm"
                ? "px-2.5 py-1 text-[11.5px]"
                : "px-3.5 py-1.5 text-[12.5px]",
              active ? toneClasses[tone] : "text-subtle hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
