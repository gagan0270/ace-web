import { useEffect, useState } from "react";
import { X, Save, KeyRound, Trash2 } from "lucide-react";
import type { Teacher } from "@/lib/mock-data";
import { Field } from "./form";
import { SectionHeader, StatusDot } from "./primitives";
import { ConfirmDialog } from "./ConfirmDialog";
import { toast } from "sonner";

export function TeacherEditDialog({
  teacher,
  onClose,
  onSave,
  onDelete,
}: {
  teacher: Teacher | null;
  onClose: () => void;
  onSave: (patch: Partial<Teacher>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [subject, setSubject] = useState("");
  const [password, setPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (teacher) {
      setName(teacher.name);
      setMobile(teacher.mobile);
      setSubject(teacher.subject);
      setPassword("");
    }
  }, [teacher]);

  useEffect(() => {
    if (!teacher) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [teacher, onClose]);

  if (!teacher) return null;

  const save = () => {
    onSave({ name: name.trim(), mobile: mobile.trim(), subject: subject.trim() });
    toast.success("Teacher updated", { description: name });
    onClose();
  };

  const savePassword = () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    toast.success("Password reset", { description: `${teacher.name} · new credentials issued` });
    setPassword("");
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={onClose} />
        <div className="glass-panel relative w-full max-w-lg p-6 space-y-5 ace-modal-enter max-h-[90vh] overflow-y-auto">
          <SectionHeader
            title="Faculty Edit Console"
            subtitle={`${teacher.id} · manage credentials & profile`}
            action={
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-full grid place-items-center bg-secondary hairline text-subtle hover:text-ink transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            }
          />

          <div className="flex items-center gap-2 text-[12px] text-subtle">
            <StatusDot tone={teacher.status === "online" ? "online" : "offline"} />
            {teacher.status === "online" ? "Session active" : "Signed out"}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Field label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            <Field
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="md:col-span-2"
            />
          </div>

          <div className="rounded-2xl bg-secondary/60 hairline p-4 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-subtle" />
              <div className="text-[13px] font-medium text-ink">Password Override</div>
            </div>
            <p className="text-[11.5px] text-subtle leading-relaxed">
              Set a new password for this teacher. They will use this credential on next sign-in.
            </p>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="flex-1 rounded-2xl bg-white/70 hairline px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink/10 transition"
              />
              <button
                type="button"
                onClick={savePassword}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-ink text-primary-foreground text-[12.5px] font-medium hover:bg-ink/90 transition"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Save Password
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-medium text-[oklch(0.5_0.15_25)] hover:bg-[oklch(0.72_0.17_25/.08)] transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete teacher
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-[12.5px] font-medium text-subtle hover:text-ink transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-primary-foreground text-[12.5px] font-medium hover:bg-ink/90 transition"
              >
                <Save className="h-3.5 w-3.5" />
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${teacher.name}?`}
        description="This removes the teacher from the active roster and revokes their sign-in credentials. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
          toast.success("Teacher removed", { description: teacher.name });
          onClose();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
