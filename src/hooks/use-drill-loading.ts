import { useEffect, useState } from "react";

/**
 * Brief loading pulse used to show skeletons on client-side drill-downs.
 * Any change to `key` (e.g. selected class / section / student) restarts the
 * timer so the view visibly transitions rather than snapping instantly.
 */
export function useDrillLoading(key: unknown, ms = 320): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return loading;
}
