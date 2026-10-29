import { AppShell } from "@/components/app/AppShell";
import { SectionHeader, StatCard, Pill } from "@/components/app/primitives";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { BackButton } from "@/components/app/BackButton";
import { SkeletonProfile } from "@/components/app/Skeleton";
import { Field, SelectField, SubmitButton, ErrorBanner } from "@/components/app/form";
import { useStudentProfile, useBuses, firestoreActions, type FeePayment, type FullStudent } from "@/lib/firestore-store";
import { Link, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Save,
  Trash2,
  Wallet,
  BookOpen,
  IdCard,
  Plus,
  KeyRound,
  Smartphone,
  Check,
  Bus,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

export function StudentProfilePage({
  satsId,
  basePath,
}: {
  satsId: string;
  basePath: "/faculty/students" | "/principal/students";
}) {
  const { student, loading } = useStudentProfile(satsId);
  const { buses } = useBuses();
  const navigate = useNavigate();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [core, setCore] = useState<Partial<FullStudent>>({});
  
  // Credentials / Mobile Password state
  const [studentPassword, setStudentPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Dynamic Academic Matrix state
  const [marksState, setMarksState] = useState<Record<string, Record<string, number>>>({});
  const [subjectsList, setSubjectsList] = useState<string[]>(["Math", "Science", "English"]);
  const [categoriesList, setCategoriesList] = useState<string[]>(["midterm", "final"]);
  const [newSubjectInput, setNewSubjectInput] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  useEffect(() => {
    if (student) {
      setCore({
        name: student.name,
        class: student.class,
        section: student.section,
        gender: student.gender,
        bus: student.bus || "No Bus",
        status: student.status
      });

      const rawMarks = student.marks || {};
      const presentCategories = Object.keys(rawMarks);
      
      const defaultCats = ["midterm", "final"];
      const allCategories = Array.from(new Set([...defaultCats, ...presentCategories]));
      setCategoriesList(allCategories);

      const foundSubjectsSet = new Set<string>(["Math", "Science", "English"]);
      const initialMarksState: Record<string, Record<string, number>> = {};

      allCategories.forEach((cat) => {
        initialMarksState[cat] = {};
        const catScores = rawMarks[cat]?.scores || {};
        
        Object.entries(catScores).forEach(([sub, val]) => {
          const normSub = sub.charAt(0).toUpperCase() + sub.slice(1);
          foundSubjectsSet.add(normSub);
          const cleanedStr = String(val ?? 0).replace(/^0+(?=\d)/, "");
          const numVal = parseInt(cleanedStr, 10);
          initialMarksState[cat][normSub] = isNaN(numVal) ? 0 : Math.min(100, Math.max(0, numVal));
        });
      });

      const subjectsArr = Array.from(foundSubjectsSet);
      setSubjectsList(subjectsArr);

      allCategories.forEach((cat) => {
        subjectsArr.forEach((sub) => {
          if (initialMarksState[cat][sub] === undefined) {
            initialMarksState[cat][sub] = cat === "midterm" ? 80 : 85;
          }
        });
      });

      setMarksState(initialMarksState);
    }
  }, [student]);

  if (loading) {
    return (
      <AppShell title="Loading Profile..." subtitle="Fetching student information from Firestore">
        <SkeletonProfile />
      </AppShell>
    );
  }

  if (!student) {
    throw notFound();
  }

  const isNoBus = !core.bus || core.bus === "No Bus" || core.bus === "Unassigned" || core.bus === "None";

  // School Fee breakdown
  const schoolPayments = student.fees.payments.filter((p) => p.category !== "Bus Fee");
  const schoolPaid = student.fees.paid;
  const schoolAllocated = student.fees.allocated;
  const schoolOutstanding = Math.max(0, schoolAllocated - schoolPaid);

  // Bus Fee breakdown
  const busPayments = student.fees.payments.filter((p) => p.category === "Bus Fee");
  const busPaid = student.fees.busPaid;
  const busAllocated = student.fees.busAllocated;
  const busOutstanding = Math.max(0, busAllocated - busPaid);

  // Auto-save helper for Core Registry fields
  const autoSaveField = async (patch: Partial<FullStudent>) => {
    try {
      await firestoreActions.updateStudent(satsId, patch);
      toast.success("Auto-saved to Cloud Firestore", { id: "autosave-toast" });
    } catch (err) {
      console.error("Auto-save error:", err);
    }
  };

  const handleUpdatePassword = async () => {
    if (!studentPassword || studentPassword.trim().length < 4) {
      toast.error("Enter a new password of at least 4 characters");
      return;
    }

    setUpdatingPassword(true);
    try {
      console.log("[Admin UI] Updating password and setting requiresPasswordReset: true for:", satsId);
      await firestoreActions.updateStudentPassword(satsId, studentPassword.trim());
      console.log("[Admin UI] Password write completed & verified in Firestore for:", satsId);
      toast.success("Student password updated in Cloud Firestore & Parent App notified", {
        description: `Mobile App Login for ${student.name} updated successfully`
      });
      setStudentPassword("");
    } catch (err) {
      console.error("Password update error:", err);
      toast.error("Failed to update password in Firestore");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleScoreChange = async (cat: string, sub: string, rawVal: string | number) => {
    const cleanedStr = String(rawVal ?? 0).replace(/^0+(?=\d)/, "");
    const numVal = parseInt(cleanedStr, 10);
    const sanitizedVal = isNaN(numVal) ? 0 : Math.min(100, Math.max(0, numVal));

    const updatedCategoryScores = {
      ...(marksState[cat] || {}),
      [sub]: sanitizedVal,
    };

    setMarksState((prev) => ({
      ...prev,
      [cat]: updatedCategoryScores,
    }));

    // Instant auto-save to Cloud Firestore
    try {
      const payloadScores: Record<string, number> = {};
      Object.entries(updatedCategoryScores).forEach(([sName, sVal]) => {
        const sCleaned = String(sVal ?? 0).replace(/^0+(?=\d)/, "");
        const sNum = parseInt(sCleaned, 10);
        payloadScores[sName.toLowerCase()] = isNaN(sNum) ? 0 : Math.min(100, Math.max(0, sNum));
      });
      await firestoreActions.saveExamScores(satsId, cat, payloadScores);
      toast.success("Score auto-saved to Cloud Firestore", { id: "autosave-toast" });
    } catch (err) {
      console.error("Score auto-save error:", err);
    }
  };

  const handleAddSubject = () => {
    const clean = newSubjectInput.trim();
    if (!clean) return;
    const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
    if (!subjectsList.includes(formatted)) {
      setSubjectsList((prev) => [...prev, formatted]);
      setMarksState((prev) => {
        const next = { ...prev };
        categoriesList.forEach((cat) => {
          next[cat] = { ...(next[cat] || {}), [formatted]: 75 };
        });
        return next;
      });
    }
    setNewSubjectInput("");
    setShowAddSubject(false);
  };

  const handleAddCategory = () => {
    const clean = newCategoryInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!clean) return;
    if (!categoriesList.includes(clean)) {
      setCategoriesList((prev) => [...prev, clean]);
      setMarksState((prev) => {
        const next = { ...prev };
        next[clean] = {};
        subjectsList.forEach((sub) => {
          next[clean][sub] = 80;
        });
        return next;
      });
    }
    setNewCategoryInput("");
    setShowAddCategory(false);
  };

  const saveAll = async () => {
    try {
      await firestoreActions.updateStudent(satsId, {
        ...core,
        ...(studentPassword.trim() ? { password: studentPassword.trim() } : {}),
      });

      if (studentPassword.trim()) {
        setStudentPassword("");
      }

      for (const cat of categoriesList) {
        const scores = marksState[cat] || {};
        const payloadScores: Record<string, number> = {};
        Object.entries(scores).forEach(([sub, score]) => {
          payloadScores[sub.toLowerCase()] = score;
        });
        await firestoreActions.saveExamScores(satsId, cat, payloadScores);
      }

      toast.success("Profile & Academic Matrix saved to Cloud Firestore", { description: student.name });
    } catch (err) {
      console.error("Error saving profile:", err);
      toast.error("Failed to save changes to Firestore.");
    }
  };

  const busOptions = [
    { value: "No Bus", label: "No Bus" },
    ...buses.map((b) => ({ value: b.id, label: `${b.id} (${b.route} - ₹${(b.fee || 12000).toLocaleString()})` })),
  ];

  return (
    <AppShell
      title={student.name}
      subtitle={`${student.satsId} · ${student.class} · ${student.section}`}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={saveAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-ink text-primary-foreground text-[12.5px] font-medium hover:bg-ink/90 transition"
          >
            <Save className="h-3.5 w-3.5" />
            Save All Changes
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-3 flex-wrap">
        <BackButton to={basePath} label={`Back to ${student.class} · ${student.section}`} />
        <nav className="flex items-center gap-2 text-[12.5px] text-subtle flex-wrap">
          <Link to={basePath} className="hover:text-ink transition">All Classes</Link>
          <span>/</span>
          <span>{student.class}</span>
          <span>/</span>
          <span>{student.section}</span>
          <span>/</span>
          <span className="text-ink">{student.name}</span>
        </nav>
      </div>

      {/* Core Registry */}
      <section className="glass-panel p-6 mt-6 space-y-4">
        <SectionHeader
          title="Core Registry"
          subtitle="Editable identity + assignment details · Auto-saves instantly on change"
          action={<Pill tone="accent"><IdCard className="h-3 w-3 inline mr-1" />{student.satsId}</Pill>}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <Field label="SATS ID" value={student.satsId} disabled />
          <Field
            label="Student Name"
            value={core.name || ""}
            onChange={(e) => setCore({ ...core, name: e.target.value })}
            onBlur={() => core.name && autoSaveField({ name: core.name })}
          />
          <SelectField
            label="Gender"
            value={core.gender || "M"}
            onChange={(e) => {
              const val = e.target.value as "M" | "F";
              setCore({ ...core, gender: val });
              autoSaveField({ gender: val });
            }}
            options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }]}
          />
          <Field
            label="Class"
            value={core.class || ""}
            onChange={(e) => setCore({ ...core, class: e.target.value })}
            onBlur={() => core.class && autoSaveField({ class: core.class })}
          />
          <Field
            label="Section"
            value={core.section || ""}
            onChange={(e) => setCore({ ...core, section: e.target.value.toUpperCase() })}
            onBlur={() => core.section && autoSaveField({ section: core.section.toUpperCase() })}
          />
          <SelectField
            label="Assigned Bus"
            value={core.bus || "No Bus"}
            onChange={(e) => {
              const val = e.target.value;
              setCore({ ...core, bus: val });
              autoSaveField({ bus: val });
            }}
            options={busOptions}
          />
        </div>
      </section>

      {/* Student & Parent Mobile Credentials Section */}
      <section className="glass-panel p-6 mt-6 space-y-4">
        <SectionHeader
          title="Student & Parent Mobile App Credentials"
          subtitle="Manage login password for student / parent mobile app access · Real-Time Parent App Sync"
          action={<Pill tone="success"><Smartphone className="h-3 w-3 inline mr-1" />Mobile Access</Pill>}
        />
        <div className="rounded-2xl bg-secondary/60 hairline p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <div className="text-[13px] font-semibold text-ink flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-ink" />
                Mobile App Password
              </div>
              <p className="text-[12px] text-subtle mt-1">
                Username / SATS ID: <span className="font-medium text-ink">{student.satsId}</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  placeholder="Enter new password to update..."
                  className="w-full rounded-xl bg-white hairline px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:ring-2 focus:ring-ink/10 transition"
                />
              </div>

              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={updatingPassword || !studentPassword.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-ink text-primary-foreground text-[12.5px] font-medium hover:bg-ink/90 transition disabled:opacity-50 shrink-0"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {updatingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 1. SCHOOL TUITION FEE LEDGER ─── */}
      <section className="glass-panel p-6 mt-6 space-y-4">
        <SectionHeader
          title="School Tuition Fee Console"
          subtitle="Academic & tuition fee allocations, receipts, and balance"
          action={<Pill tone="accent"><GraduationCap className="h-3 w-3 inline mr-1" />School Fee</Pill>}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={Wallet} label="Total School Fee Allocated" value={`₹${schoolAllocated.toLocaleString()}`} />
          <StatCard icon={Wallet} label="Total School Fee Paid" value={`₹${schoolPaid.toLocaleString()}`} trend={{ label: "settled", tone: "up" }} />
          <StatCard
            icon={Wallet}
            label="Outstanding School Balance"
            value={`₹${schoolOutstanding.toLocaleString()}`}
            trend={schoolOutstanding > 0 ? { label: "due", tone: "down" } : { label: "settled", tone: "up" }}
          />
        </div>
        <div className="rounded-2xl bg-secondary/60 hairline p-4">
          <div className="text-[13px] font-medium text-ink mb-3">School Fee Payment Timeline</div>
          {schoolPayments.length === 0 ? (
            <div className="text-[12.5px] text-subtle">No school fee payments recorded yet.</div>
          ) : (
            <ul className="divide-y divide-[oklch(0.92_0.005_260)]">
              {schoolPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-[13px]">
                  <div className="min-w-0">
                    <div className="text-ink font-medium">₹{p.amount.toLocaleString()}</div>
                    <div className="text-[11.5px] text-subtle">{p.date} · {p.method}{p.note ? ` · ${p.note}` : ""}</div>
                  </div>
                  <Pill tone="success">School Fee</Pill>
                </li>
              ))}
            </ul>
          )}
        </div>
        <FeePaymentForm satsId={satsId} defaultCategory="School Fee" title="Record School Fee Payment" />
      </section>

      {/* ─── 2. BUS TRANSIT FEE LEDGER (Hides completely if No Bus) ─── */}
      {!isNoBus ? (
        <section className="glass-panel p-6 mt-6 space-y-4 animate-in fade-in-0">
          <SectionHeader
            title="Bus Transit Fee Console"
            subtitle={`Allocated for ${core.bus} · Transit receipts & balance`}
            action={<Pill tone="accent"><Bus className="h-3 w-3 inline mr-1" />Bus Fee</Pill>}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={Bus} label="Total Bus Fee Allocated" value={`₹${busAllocated.toLocaleString()}`} />
            <StatCard icon={Bus} label="Total Bus Fee Paid" value={`₹${busPaid.toLocaleString()}`} trend={{ label: "transit settled", tone: "up" }} />
            <StatCard
              icon={Bus}
              label="Outstanding Bus Balance"
              value={`₹${busOutstanding.toLocaleString()}`}
              trend={busOutstanding > 0 ? { label: "due", tone: "down" } : { label: "settled", tone: "up" }}
            />
          </div>
          <div className="rounded-2xl bg-secondary/60 hairline p-4">
            <div className="text-[13px] font-medium text-ink mb-3">Bus Fee Payment Timeline</div>
            {busPayments.length === 0 ? (
              <div className="text-[12.5px] text-subtle">No bus fee payments recorded yet.</div>
            ) : (
              <ul className="divide-y divide-[oklch(0.92_0.005_260)]">
                {busPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-[13px]">
                    <div className="min-w-0">
                      <div className="text-ink font-medium">₹{p.amount.toLocaleString()}</div>
                      <div className="text-[11.5px] text-subtle">{p.date} · {p.method}{p.note ? ` · ${p.note}` : ""}</div>
                    </div>
                    <Pill tone="accent">Bus Fee</Pill>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <FeePaymentForm satsId={satsId} defaultCategory="Bus Fee" title="Record Bus Fee Payment" />
        </section>
      ) : null}

      {/* Dynamic Academic Matrix */}
      <section className="glass-panel p-6 mt-6 space-y-4">
        <SectionHeader
          title="Academic Matrix"
          subtitle="Dynamic scores per exam category & subject · Auto-saves instantly on change"
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddSubject(true)}
                className="text-[12px] px-3 py-1 rounded-full bg-secondary hover:bg-secondary/80 hairline text-ink inline-flex items-center gap-1 transition"
              >
                <Plus className="h-3 w-3" /> Add Subject
              </button>
              <button
                type="button"
                onClick={() => setShowAddCategory(true)}
                className="text-[12px] px-3 py-1 rounded-full bg-secondary hover:bg-secondary/80 hairline text-ink inline-flex items-center gap-1 transition"
              >
                <Plus className="h-3 w-3" /> Add Exam Type
              </button>
              <Pill><BookOpen className="h-3 w-3 inline mr-1" />Live Matrix</Pill>
            </div>
          }
        />

        {showAddSubject ? (
          <div className="p-3 bg-white/80 rounded-xl hairline flex items-center gap-2 max-w-md">
            <input
              type="text"
              placeholder="New Subject Name (e.g. Social Studies)"
              value={newSubjectInput}
              onChange={(e) => setNewSubjectInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
              className="flex-1 text-[13px] px-3 py-1.5 rounded-lg bg-secondary/50 outline-none"
              autoFocus
            />
            <button
              onClick={handleAddSubject}
              className="px-3 py-1.5 bg-ink text-primary-foreground text-[12px] rounded-lg font-medium inline-flex items-center gap-1"
            >
              <Check className="h-3.5 w-3.5" /> Add
            </button>
            <button
              onClick={() => setShowAddSubject(false)}
              className="text-[12px] text-subtle hover:text-ink px-2"
            >
              Cancel
            </button>
          </div>
        ) : null}

        {showAddCategory ? (
          <div className="p-3 bg-white/80 rounded-xl hairline flex items-center gap-2 max-w-md">
            <input
              type="text"
              placeholder="New Exam Category (e.g. Unit Test 1)"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              className="flex-1 text-[13px] px-3 py-1.5 rounded-lg bg-secondary/50 outline-none"
              autoFocus
            />
            <button
              onClick={handleAddCategory}
              className="px-3 py-1.5 bg-ink text-primary-foreground text-[12px] rounded-lg font-medium inline-flex items-center gap-1"
            >
              <Check className="h-3.5 w-3.5" /> Add
            </button>
            <button
              onClick={() => setShowAddCategory(false)}
              className="text-[12px] text-subtle hover:text-ink px-2"
            >
              Cancel
            </button>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl hairline">
          <table className="w-full text-[13px]">
            <thead className="bg-secondary/70">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-subtle">Subject</th>
                {categoriesList.map((cat) => (
                  <th key={cat} className="text-left px-4 py-2.5 font-medium text-subtle capitalize">
                    {cat.replace("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjectsList.map((subject) => (
                <tr key={subject} className="border-t hairline">
                  <td className="px-4 py-2.5 text-ink font-medium">{subject}</td>
                  {categoriesList.map((cat) => {
                    const rawScore = marksState[cat]?.[subject];
                    const displayVal = rawScore === undefined || rawScore === null ? 0 : parseInt(String(rawScore).replace(/^0+(?=\d)/, ""), 10) || 0;

                    return (
                      <td key={cat} className="px-4 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={displayVal}
                          onChange={(e) => {
                            const val = e.target.value.replace(/^0+(?=\d)/, "");
                            handleScoreChange(cat, subject, val);
                          }}
                          onBlur={(e) => {
                            const val = e.target.value.replace(/^0+(?=\d)/, "");
                            handleScoreChange(cat, subject, val);
                          }}
                          className="w-20 rounded-xl bg-white/70 hairline px-2.5 py-1.5 text-[13px] text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink/10 transition"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer actions */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-medium text-[oklch(0.5_0.15_25)] hover:bg-[oklch(0.72_0.17_25/.08)] transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Student
        </button>
        <button
          type="button"
          onClick={saveAll}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-primary-foreground text-[12.5px] font-medium hover:bg-ink/90 transition"
        >
          <Save className="h-3.5 w-3.5" />
          Save All Changes
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${student.name}?`}
        description="This removes the student record permanently from Cloud Firestore. This action cannot be undone."
        confirmLabel="Delete student"
        onConfirm={async () => {
          try {
            await firestoreActions.deleteStudent(satsId);
            toast.success("Student removed permanently from Firestore", { description: student.name });
            setConfirmDelete(false);
            navigate({ to: basePath });
          } catch (err) {
            console.error("Error deleting student:", err);
            toast.error("Could not delete student.");
          }
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </AppShell>
  );
}

function FeePaymentForm({
  satsId,
  defaultCategory,
  title,
}: {
  satsId: string;
  defaultCategory: "School Fee" | "Bus Fee";
  title: string;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<FeePayment["method"]>("UPI");
  const [category, setCategory] = useState<string>(defaultCategory);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const n = Number(amount);
    if (!n || n <= 0) {
      setBanner("Enter a positive payment amount.");
      return;
    }
    setPending(true);
    try {
      const payment: FeePayment = {
        id: `REC-${Date.now().toString().slice(-4)}`,
        date,
        amount: n,
        method,
        category,
        note: note.trim() || undefined,
      };

      await firestoreActions.addFeePayment(satsId, payment);
      toast.success(`${category} payment saved to Cloud Firestore`, {
        description: `₹${n.toLocaleString()} · ${method}`
      });
      setAmount("");
      setNote("");
    } catch (err) {
      console.error("Payment save error:", err);
      setBanner("Failed to record payment in Firestore.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl bg-secondary/40 hairline p-4 space-y-3">
      <div className="text-[13px] font-medium text-ink flex items-center justify-between">
        <span>{title}</span>
        <Pill tone={category === "Bus Fee" ? "accent" : "success"}>{category}</Pill>
      </div>
      <ErrorBanner message={banner} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <SelectField
          label="Method"
          value={method}
          onChange={(e) => setMethod(e.target.value as FeePayment["method"])}
          options={[
            { value: "UPI", label: "UPI" },
            { value: "Cash", label: "Cash" },
            { value: "Bank", label: "Bank" },
            { value: "Card", label: "Card" },
          ]}
        />
        <Field label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Term fee, route fee…" />
      </div>
      <div className="flex justify-end">
        <SubmitButton pending={pending}>
          <Plus className="h-4 w-4" />
          {pending ? "Recording…" : `Record ${category} payment`}
        </SubmitButton>
      </div>
    </form>
  );
}
