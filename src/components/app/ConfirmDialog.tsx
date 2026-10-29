import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
  icon,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
  onConfirm: () => void;
  onCancel: () => void;
  icon?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onCancel]);

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />
      <div className="glass-panel relative z-10 w-full max-w-sm p-6 space-y-4 ace-modal-enter shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-secondary grid place-items-center hairline shrink-0">
            {icon ?? (
              <AlertTriangle
                className="h-5 w-5 text-ink"
                strokeWidth={1.75}
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[15.5px] font-semibold text-ink">{title}</div>
            <p className="mt-1 text-[12.5px] text-subtle leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-[12.5px] font-medium text-subtle hover:text-ink transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              tone === "danger"
                ? "px-4 py-2 rounded-full text-[12.5px] font-medium bg-[oklch(0.55_0.17_25)] text-white hover:bg-[oklch(0.5_0.17_25)] transition"
                : "px-4 py-2 rounded-full text-[12.5px] font-medium bg-ink text-primary-foreground hover:bg-ink/90 transition"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
