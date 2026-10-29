import { cn } from "@/lib/utils";
import { BigCheckbox } from "./BigCheckbox";

/**
 * Class → Section targeting used across Events, Exam Scheduler, and Fee Structure.
 * Renders a class pill picker followed by section pills (multi-select) with a
 * prominent "All Sections" checkbox that overrides individual picks.
 */
export function SectionTargetPicker({
  klass,
  onKlassChange,
  sections,
  onSectionsChange,
  allSections,
  onAllSectionsChange,
  classes,
  sectionsByClass,
  includeWholeSchool = false,
  klassLabel = "Target Class",
}: {
  klass: string;
  onKlassChange: (k: string) => void;
  sections: string[];
  onSectionsChange: (s: string[]) => void;
  allSections: boolean;
  onAllSectionsChange: (v: boolean) => void;
  classes: string[];
  sectionsByClass: Record<string, string[]>;
  includeWholeSchool?: boolean;
  klassLabel?: string;
}) {
  const classOptions = classes;
  const availableSections = klass ? sectionsByClass[klass] ?? [] : [];

  const toggleSection = (s: string) => {
    if (sections.includes(s)) onSectionsChange(sections.filter((x) => x !== s));
    else onSectionsChange([...sections, s]);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11.5px] font-medium text-subtle mb-2 uppercase tracking-wider">{klassLabel}</div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={klassLabel}>
          {includeWholeSchool ? (
            <button
              type="button"
              onClick={() => {
                onKlassChange("");
                onSectionsChange([]);
                onAllSectionsChange(false);
              }}
              role="radio"
              aria-checked={klass === ""}
              className={cn(
                "px-4 py-2 rounded-full text-[12.5px] font-medium transition hairline",
                klass === ""
                  ? "bg-ink text-primary-foreground shadow-sm"
                  : "bg-white/70 text-ink hover:bg-secondary",
              )}
            >
              Whole school
            </button>
          ) : null}
          {classOptions.map((k) => {
            const displayK = k.toLowerCase().includes("class") ? k : `${k} Class`;
            return (
              <button
                type="button"
                key={k}
                onClick={() => {
                  onKlassChange(k);
                  onSectionsChange([]);
                }}
                role="radio"
                aria-checked={klass === k}
                className={cn(
                  "px-4 py-2 rounded-full text-[12.5px] font-medium transition hairline",
                  klass === k
                    ? "bg-ink text-primary-foreground shadow-sm"
                    : "bg-white/70 text-ink hover:bg-secondary",
                )}
              >
                {displayK}
              </button>
            );
          })}
        </div>
      </div>

      {klass ? (
        <div className="space-y-3">
          <BigCheckbox
            checked={allSections}
            onChange={(v) => {
              onAllSectionsChange(v);
              if (v) onSectionsChange([]);
            }}
            label="All Sections"
            description={`Applies to every section of ${klass.toLowerCase().includes("class") ? klass : `${klass} Class`}`}
          />

          <div>
            <div className="text-[11.5px] font-medium text-subtle mb-2 uppercase tracking-wider">
              {allSections ? "Section (all selected)" : "Pick section"}
            </div>
            <div
              className={cn(
                "flex flex-wrap gap-2",
                allSections && "opacity-40 pointer-events-none",
              )}
              role="group"
              aria-label="Sections"
            >
              {availableSections.length === 0 ? (
                <span className="text-[12px] text-subtle italic">
                  No sections configured for this class yet.
                </span>
              ) : (
                availableSections.map((s) => {
                  const on = allSections || sections.includes(s);
                  const displayS = s.toLowerCase().includes("section") ? s : `Section ${s}`;
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => toggleSection(s)}
                      aria-pressed={on}
                      className={cn(
                        "px-4 py-2 rounded-full text-[12.5px] font-medium transition hairline",
                        on
                          ? "bg-ink text-primary-foreground shadow-sm"
                          : "bg-white/70 text-ink hover:bg-secondary",
                      )}
                    >
                      {displayS}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
