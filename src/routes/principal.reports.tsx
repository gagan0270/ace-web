import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { SectionHeader, Pill } from "@/components/app/primitives";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { useStudents, useTeachers, useBuses } from "@/lib/firestore-store";
import { toast } from "sonner";

export const Route = createFileRoute("/principal/reports")({
  head: () => ({
    meta: [
      { title: "Reports · Ace Operations" },
      { name: "description", content: "System diagnostics and downloadable operational reports." },
      { property: "og:title", content: "Reports · Ace Operations" },
      { property: "og:description", content: "Download attendance, fleet and financial reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const { buses } = useBuses();

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const content = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filename}`, { description: `${rows.length} records generated from Firestore` });
  };

  const exportStudents = () => {
    const headers = ["SATS ID", "Name", "Gender", "Class", "Section", "Bus Number", "Fee Allocated", "Fee Paid"];
    const rows = students.map((s) => [
      s.satsId,
      s.name,
      s.gender,
      s.class,
      s.section,
      s.bus,
      String(s.fees.allocated),
      String(s.fees.paid),
    ]);
    downloadCSV("Students_Roster_Report.csv", headers, rows);
  };

  const exportTeachers = () => {
    const headers = ["Teacher ID", "Name", "Mobile", "Subject", "Status"];
    const rows = teachers.map((t) => [t.id, t.name, t.mobile, t.subject, t.status]);
    downloadCSV("Teachers_Roster_Report.csv", headers, rows);
  };

  const exportBuses = () => {
    const headers = ["Bus ID", "Route Name", "Driver Name", "Capacity", "Status"];
    const rows = buses.map((b) => [b.id, b.route, b.driver, String(b.capacity), b.status]);
    downloadCSV("Bus_Fleet_Report.csv", headers, rows);
  };

  return (
    <AppShell title="Reports" subtitle="System Diagnostics & Real-Time Cloud Exports">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-secondary grid place-items-center hairline shrink-0">
              <FileText className="h-5 w-5 text-ink" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-[14.5px] font-semibold text-ink truncate">
                Active Student Roster Export
              </div>
              <div className="text-[12px] text-subtle mt-0.5 flex items-center gap-2">
                <span>{students.length} Records</span>·<span>Live Cloud</span>
                <Pill tone="success"><ShieldCheck className="h-3 w-3" /> Audited</Pill>
              </div>
            </div>
          </div>
          <button onClick={exportStudents} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-primary-foreground text-[12.5px] font-medium hover:bg-ink/90 transition shrink-0">
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>

        <div className="glass-card p-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-secondary grid place-items-center hairline shrink-0">
              <FileText className="h-5 w-5 text-ink" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-[14.5px] font-semibold text-ink truncate">
                Faculty & Teacher Roster Export
              </div>
              <div className="text-[12px] text-subtle mt-0.5 flex items-center gap-2">
                <span>{teachers.length} Records</span>·<span>Live Cloud</span>
                <Pill tone="success"><ShieldCheck className="h-3 w-3" /> Audited</Pill>
              </div>
            </div>
          </div>
          <button onClick={exportTeachers} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-primary-foreground text-[12.5px] font-medium hover:bg-ink/90 transition shrink-0">
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>

        <div className="glass-card p-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-secondary grid place-items-center hairline shrink-0">
              <FileText className="h-5 w-5 text-ink" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-[14.5px] font-semibold text-ink truncate">
                Transit & Fleet Route Export
              </div>
              <div className="text-[12px] text-subtle mt-0.5 flex items-center gap-2">
                <span>{buses.length} Routes</span>·<span>Live Cloud</span>
                <Pill tone="success"><ShieldCheck className="h-3 w-3" /> Audited</Pill>
              </div>
            </div>
          </div>
          <button onClick={exportBuses} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-primary-foreground text-[12.5px] font-medium hover:bg-ink/90 transition shrink-0">
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>
    </AppShell>
  );
}
