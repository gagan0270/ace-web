import { AppShell } from "@/components/app/AppShell";
import { SectionHeader, StatCard, Pill } from "@/components/app/primitives";
import { ErrorBanner, SubmitButton } from "@/components/app/form";
import { BigCheckbox } from "@/components/app/BigCheckbox";
import { useStudents, useClassesAndSections, firestoreActions } from "@/lib/firestore-store";
import { useState, useMemo } from "react";
import { IndianRupee, Save, Wallet, School, Users, CheckCircle2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FeesPage() {
  const { students } = useStudents();
  const { classes, sectionsByClass } = useClassesAndSections();

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("All Sections");
  const [allSections, setAllSections] = useState<boolean>(true);

  const [feeInput, setFeeInput] = useState<string>("50000");
  const [pending, setPending] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const activeClass = selectedClass || classes[0] || "2nd Class";
  const availableSections = sectionsByClass[activeClass] || ["Section A", "Section B", "Section C"];

  // Quick fee presets
  const feePresets = [30000, 40000, 50000, 60000, 75000];

  // Overall fee statistics
  const stats = useMemo(() => {
    let totalAllocated = 0;
    let totalPaid = 0;

    students.forEach((s) => {
      totalAllocated += Number(s.fees.allocated || 0);
      totalPaid += Number(s.fees.paid || 0);
    });

    const outstanding = Math.max(0, totalAllocated - totalPaid);
    return { totalAllocated, totalPaid, outstanding };
  }, [students]);

  // Section fee breakdown
  const sectionBreakdown = useMemo(() => {
    const map: Record<string, { count: number; allocated: number; paid: number; outstanding: number }> = {};

    classes.forEach((c) => {
      const secs = sectionsByClass[c] || ["Section A", "Section B"];
      secs.forEach((sec) => {
        const key = `${c} · ${sec}`;
        map[key] = { count: 0, allocated: 0, paid: 0, outstanding: 0 };
      });
    });

    students.forEach((s) => {
      const key = `${s.class} · ${s.section}`;
      if (!map[key]) {
        map[key] = { count: 0, allocated: 0, paid: 0, outstanding: 0 };
      }
      map[key].count += 1;
      map[key].allocated += Number(s.fees.allocated || 0);
      map[key].paid += Number(s.fees.paid || 0);
      map[key].outstanding += Math.max(0, Number(s.fees.allocated || 0) - Number(s.fees.paid || 0));
    });

    return map;
  }, [classes, sectionsByClass, students]);

  // Students impacted by current selection
  const targetStudents = useMemo(() => {
    return students.filter((s) => {
      if (s.class !== activeClass) return false;
      if (allSections || selectedSection === "All Sections") return true;
      return s.section === selectedSection;
    });
  }, [students, activeClass, selectedSection, allSections]);

  const handleApplyFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);

    const feeNum = Number(feeInput);
    if (!feeNum || feeNum <= 0) {
      setBanner("Please enter a valid positive fee amount.");
      return;
    }

    const targetSecName = allSections ? "All Sections" : selectedSection;

    setPending(true);
    try {
      await firestoreActions.updateSectionSchoolFee(activeClass, targetSecName, feeNum);
      toast.success(`School Fee updated in Cloud Firestore`, {
        description: `${activeClass} · ${targetSecName} set to ₹${feeNum.toLocaleString()} across ${targetStudents.length} students`
      });
    } catch (err: any) {
      console.error("Fee structure update error:", err);
      setBanner("Failed to update fee structure in Cloud Firestore.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AppShell
      title="Fee Structure & Allocations"
      subtitle="Class-wise and section-wise school tuition fee management · Live Cloud Sync"
    >
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Wallet} label="Total School Fee Allocated" value={`₹${stats.totalAllocated.toLocaleString()}`} />
        <StatCard icon={IndianRupee} label="Total School Fee Collected" value={`₹${stats.totalPaid.toLocaleString()}`} trend={{ label: "collected", tone: "up" }} />
        <StatCard
          icon={Wallet}
          label="Total School Outstanding"
          value={`₹${stats.outstanding.toLocaleString()}`}
          trend={stats.outstanding > 0 ? { label: "due", tone: "down" } : { label: "settled", tone: "up" }}
        />
      </div>

      {/* Class & Section Fee Allocation Panel with Pill Chips UI */}
      <div className="glass-panel p-6 mb-6 space-y-5">
        <SectionHeader
          title="Class & Section Fee Allocation"
          subtitle="Configure & update School Tuition Fee using target class and section pills"
          action={<Pill tone="accent"><School className="h-3 w-3 inline mr-1" />Fee Allocator</Pill>}
        />
        <ErrorBanner message={banner} />

        <form onSubmit={handleApplyFee} className="space-y-5">
          {/* Target Class Pills */}
          <div>
            <div className="text-[11.5px] font-medium text-subtle mb-2 uppercase tracking-wider">Target Class</div>
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => {
                const active = c === activeClass;
                const displayC = c.toLowerCase().includes("class") ? c : `${c} Class`;
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => {
                      setSelectedClass(c);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full text-[12.5px] font-medium transition hairline",
                      active
                        ? "bg-ink text-primary-foreground shadow-sm"
                        : "bg-white/70 text-ink hover:bg-secondary"
                    )}
                  >
                    {displayC}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Selection with All Sections Checkbox */}
          <div className="space-y-3">
            <BigCheckbox
              checked={allSections}
              onChange={(v) => {
                setAllSections(v);
                if (v) setSelectedSection("All Sections");
                else if (availableSections.length > 0) setSelectedSection(availableSections[0]);
              }}
              label="All Sections"
              description={`Applies to every section of ${activeClass.toLowerCase().includes("class") ? activeClass : `${activeClass} Class`}`}
            />

            <div>
              <div className="text-[11.5px] font-medium text-subtle mb-2 uppercase tracking-wider">
                {allSections ? "Section (all selected)" : "Target Section"}
              </div>
              <div
                className={cn(
                  "flex flex-wrap gap-2",
                  allSections && "opacity-40 pointer-events-none"
                )}
              >
                {availableSections.map((sec) => {
                  const on = allSections || selectedSection === sec;
                  const displaySec = sec.toLowerCase().includes("section") ? sec : `Section ${sec}`;
                  return (
                    <button
                      type="button"
                      key={sec}
                      onClick={() => {
                        setSelectedSection(sec);
                        setAllSections(false);
                      }}
                      className={cn(
                        "px-4 py-2 rounded-full text-[12.5px] font-medium transition hairline",
                        on
                          ? "bg-ink text-primary-foreground shadow-sm"
                          : "bg-white/70 text-ink hover:bg-secondary"
                      )}
                    >
                      {displaySec}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Fee Input & Presets */}
          <div className="rounded-2xl bg-secondary/50 hairline p-4 space-y-3">
            <div className="text-[12.5px] font-semibold text-ink">Set School Tuition Fee Amount (₹)</div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full rounded-xl bg-white hairline px-3.5 py-2.5 text-[14px] font-medium text-ink outline-none focus:ring-2 focus:ring-ink/10 transition"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                {feePresets.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setFeeInput(String(preset))}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[12px] font-medium transition hairline",
                      Number(feeInput) === preset
                        ? "bg-ink text-primary-foreground"
                        : "bg-white text-ink hover:bg-secondary"
                    )}
                  >
                    ₹{(preset / 1000)}k
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-[12.5px] text-subtle">
              Target Scope: <span className="font-semibold text-ink">{activeClass} · {allSections ? "All Sections" : selectedSection}</span> ({targetStudents.length} enrolled students)
            </div>
            <SubmitButton pending={pending}>
              <Save className="h-4 w-4" />
              {pending ? "Applying…" : `Apply Fee Allocation to ${activeClass} · ${allSections ? "All Sections" : selectedSection}`}
            </SubmitButton>
          </div>
        </form>
      </div>

      {/* Class & Section Fee Register Table */}
      <div className="glass-panel p-6 space-y-4">
        <SectionHeader
          title="Section-Wise Fee Matrix"
          subtitle="Real-time breakdown of student enrollments and fee collection per section"
          action={<Pill tone="success"><CheckCircle2 className="h-3 w-3 inline mr-1" />Live Matrix</Pill>}
        />

        <div className="overflow-x-auto rounded-2xl hairline">
          <table className="w-full text-[13px]">
            <thead className="bg-secondary/70">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-subtle">Class & Section</th>
                <th className="text-left px-4 py-2.5 font-medium text-subtle">Enrolled Students</th>
                <th className="text-left px-4 py-2.5 font-medium text-subtle">Total Allocated</th>
                <th className="text-left px-4 py-2.5 font-medium text-subtle">Total Collected</th>
                <th className="text-left px-4 py-2.5 font-medium text-subtle">Outstanding</th>
                <th className="text-right px-4 py-2.5 font-medium text-subtle">Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(sectionBreakdown).map(([classSec, d]) => (
                <tr key={classSec} className="border-t hairline hover:bg-secondary/30 transition">
                  <td className="px-4 py-3 font-semibold text-ink">{classSec}</td>
                  <td className="px-4 py-3 text-subtle">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {d.count} students
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink font-medium">₹{d.allocated.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[oklch(0.5_0.15_140)] font-medium">₹{d.paid.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[oklch(0.5_0.15_25)] font-medium">₹{d.outstanding.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        const [c, sec] = classSec.split(" · ");
                        setSelectedClass(c);
                        setSelectedSection(sec);
                        setAllSections(false);
                        setFeeInput(String(d.count > 0 && d.allocated > 0 ? Math.round(d.allocated / d.count) : 50000));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-[12px] px-3 py-1 rounded-full bg-secondary hover:bg-secondary/80 hairline text-ink transition"
                    >
                      Configure Fee
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
