import * as React from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-16 border border-dashed border-[var(--color-line)] rounded-lg bg-[var(--color-paper)]">
      <h3 className="text-base font-semibold text-[var(--color-ink)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-ink-3)] mb-4 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  );
}
