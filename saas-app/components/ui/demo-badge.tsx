import { Badge } from "./badge";
import { DEMO_LABELS } from "@/lib/demo-data";

export function DemoBadge({ long = false }: { long?: boolean }) {
  if (long) {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-[var(--color-ink-3)] bg-[var(--color-p2-bg)] border border-[color:#e2d39a] rounded px-3 py-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-rule)]" aria-hidden />
        <span>{DEMO_LABELS.longLabel}</span>
      </div>
    );
  }
  return <Badge variant="demo">{DEMO_LABELS.badge}</Badge>;
}
