import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus } from "lucide-react";
import { Field, SubmitButton, ErrorBanner } from "./form";
import { firestoreActions } from "@/lib/firestore-store";
import { z } from "zod";
import { toast } from "sonner";
import { SectionHeader } from "./primitives";

const schema = z.object({
  id: z.string().trim().min(3, "Bus ID / Number required (e.g. Bus-104)"),
  route: z.string().trim().min(3, "Route name required"),
  driver: z.string().trim().min(2, "Driver name required"),
  driverMobile: z.string().trim().min(8, "Driver phone number required"),
  capacity: z.coerce.number().int().min(4, "Min 4").max(80, "Max 80"),
  fee: z.coerce.number().min(0, "Bus fee must be ≥ 0"),
  status: z.enum(["active", "idle", "offline"]),
});
type Form = z.input<typeof schema>;
type Errors = Partial<Record<keyof Form, string>>;

export function BusAddDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Form>({
    id: "Bus-104",
    route: "Route 4 · North Suburban Loop",
    driver: "M. Bhatia",
    driverMobile: "+91 98765 43210",
    capacity: 40 as any,
    fee: 12000 as any,
    status: "active",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const setK =
    (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((p) => ({ ...p, [k]: e.target.value }));
      setErrors((p) => ({ ...p, [k]: undefined }));
    };

  const submit = async (e: React.FormEvent) => {
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
      await firestoreActions.addBus({
        id: parsed.data.id,
        routeName: parsed.data.route,
        driverName: parsed.data.driver,
        driverMobile: parsed.data.driverMobile,
        capacity: parsed.data.capacity,
        fee: parsed.data.fee,
      });

      toast.success("Bus added to Cloud Firestore", {
        description: `${parsed.data.id} (${parsed.data.route}) · Fee: ₹${parsed.data.fee.toLocaleString()}`
      });
      onClose();
    } catch (err) {
      console.error("Add bus error:", err);
      setBanner("Could not save bus to Cloud Firestore.");
    } finally {
      setPending(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add active bus"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
    >
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <form
        onSubmit={submit}
        noValidate
        className="glass-panel relative z-10 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto ace-modal-enter shadow-2xl"
      >
        <SectionHeader
          title="Add Active Bus"
          subtitle="Provision a new bus route with driver details and monthly transit fee"
          action={
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full grid place-items-center text-subtle hover:bg-secondary hover:text-ink transition"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          }
        />
        <ErrorBanner message={banner} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Bus Name / Number" placeholder="e.g. Bus-104" value={values.id} onChange={setK("id")} error={errors.id} />
          <Field label="Route Name" placeholder="e.g. Route 4 · North Loop" value={values.route} onChange={setK("route")} error={errors.route} />
          <Field label="Driver Name" placeholder="Full name" value={values.driver} onChange={setK("driver")} error={errors.driver} />
          <Field label="Driver Phone Number" placeholder="+91 98765 43210" value={values.driverMobile} onChange={setK("driverMobile")} error={errors.driverMobile} />
          <Field label="Bus Capacity" type="number" value={String(values.capacity)} onChange={setK("capacity")} error={errors.capacity as any} />
          <Field label="Bus Fee (₹)" type="number" value={String(values.fee)} onChange={setK("fee")} error={errors.fee as any} placeholder="e.g. 12000" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-[13px] text-ink hover:bg-secondary transition"
          >
            Cancel
          </button>
          <SubmitButton pending={pending}>
            <Plus className="h-4 w-4" />
            {pending ? "Adding…" : "Add bus"}
          </SubmitButton>
        </div>
      </form>
    </div>,
    document.body
  );
}
