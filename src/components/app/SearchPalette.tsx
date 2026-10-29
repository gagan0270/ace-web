import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X, Users, GraduationCap, Bus, Megaphone } from "lucide-react";
import { useRoster } from "@/lib/roster-store";
import { teachers as seedTeachers, buses as seedBuses } from "@/lib/mock-data";
import { readSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Hit = {
  kind: "student" | "teacher" | "bus" | "notice";
  id: string;
  title: string;
  subtitle: string;
  to: string;
  params?: Record<string, string>;
};

export function SearchPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { students, notices } = useRoster();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const prefix = useMemo(() => {
    const role = readSession()?.role ?? "faculty";
    return role === "principal" ? "/principal" : "/faculty";
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const out: Hit[] = [];
    const match = (s: string) => s.toLowerCase().includes(needle);

    for (const s of students) {
      if (match(s.name) || match(s.satsId) || match(s.class) || match(s.section)) {
        out.push({
          kind: "student",
          id: s.satsId,
          title: s.name,
          subtitle: `${s.satsId} · ${s.class} · Section ${s.section}`,
          to: `${prefix}/students/$satsId`,
          params: { satsId: s.satsId },
        });
      }
    }
    for (const t of seedTeachers) {
      if (match(t.name) || match(t.subject) || match(t.mobile)) {
        out.push({
          kind: "teacher",
          id: t.id,
          title: t.name,
          subtitle: `${t.subject} · ${t.mobile}`,
          to: `${prefix}/teachers`,
        });
      }
    }
    for (const b of seedBuses) {
      if (match(b.route) || match(b.driver) || match(b.id)) {
        out.push({
          kind: "bus",
          id: b.id,
          title: b.route,
          subtitle: `${b.id} · ${b.driver}`,
          to: `${prefix}/buses`,
        });
      }
    }
    for (const n of notices) {
      if (match(n.title) || (n.body && match(n.body))) {
        out.push({
          kind: "notice",
          id: n.id,
          title: n.title,
          subtitle: `${n.date} · ${n.time}`,
          to: `${prefix}/notices`,
        });
      }
    }
    return out.slice(0, 40);
  }, [q, students, notices, prefix]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh]"
    >
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative w-full max-w-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b hairline">
          <Search className="h-4 w-4 text-subtle" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search students, teachers, buses, events…"
            className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-subtle"
          />
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full grid place-items-center text-subtle hover:bg-secondary hover:text-ink transition"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[52vh] overflow-y-auto">
          {q.trim() === "" ? (
            <div className="p-6 text-center text-[12.5px] text-subtle">
              Start typing to search across every module.
            </div>
          ) : hits.length === 0 ? (
            <div className="p-6 text-center text-[12.5px] text-subtle">
              No results for “{q}”.
            </div>
          ) : (
            <ul>
              {hits.map((h) => (
                <li key={`${h.kind}-${h.id}`}>
                  <Link
                    to={h.to as any}
                    params={h.params as any}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 border-t hairline first:border-t-0 hover:bg-secondary/60 transition",
                    )}
                  >
                    <div className="h-9 w-9 rounded-xl bg-secondary grid place-items-center hairline shrink-0">
                      <KindIcon kind={h.kind} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-ink truncate">
                        {h.title}
                      </div>
                      <div className="text-[11.5px] text-subtle truncate">
                        {h.subtitle}
                      </div>
                    </div>
                    <span className="ios-pill capitalize">{h.kind}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function KindIcon({ kind }: { kind: Hit["kind"] }) {
  const cls = "h-4 w-4 text-ink";
  if (kind === "student") return <Users className={cls} />;
  if (kind === "teacher") return <GraduationCap className={cls} />;
  if (kind === "bus") return <Bus className={cls} />;
  return <Megaphone className={cls} />;
}
