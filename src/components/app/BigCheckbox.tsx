import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/**
 * Large, tappable, brand-styled checkbox — used where a checkbox controls a
 * whole group (e.g. "All Sections"). Deliberately bigger than the native
 * default so it reads as an intentional control on touch and desktop alike.
 */
export function BigCheckbox({
  checked,
  onChange,
  label,
  description,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl hairline cursor-pointer transition select-none",
        checked ? "bg-ink/[0.04]" : "bg-white/70 hover:bg-white",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "h-6 w-6 rounded-lg grid place-items-center transition shrink-0",
          checked
            ? "bg-ink shadow-[0_4px_14px_rgba(15,15,20,0.18)]"
            : "bg-secondary hairline",
        )}
      >
        {checked ? (
          <Check className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-ink">{label}</span>
        {description ? (
          <span className="block text-[11.5px] text-subtle mt-0.5">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
