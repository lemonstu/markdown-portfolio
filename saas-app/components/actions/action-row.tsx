"use client";

import { useTransition, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import type { ActionItem, ActionStatus } from "@/lib/types/domain";

export function ActionRow({
  action,
  onUpdate,
}: {
  action: ActionItem;
  onUpdate: (id: string, patch: { status?: ActionStatus; notes?: string }) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<ActionStatus>(action.status);
  const [notes, setNotes] = useState(action.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);

  function changeStatus(next: ActionStatus) {
    setStatus(next);
    startTransition(() => onUpdate(action.id, { status: next }));
  }

  function saveNotes() {
    setEditingNotes(false);
    startTransition(() => onUpdate(action.id, { notes }));
  }

  return (
    <tr className="border-t border-[var(--color-line-soft)] align-top">
      <td className="py-3 pr-3 text-sm">
        <div className="font-medium text-[var(--color-ink)]">{action.title}</div>
        {action.description && (
          <div className="text-xs text-[var(--color-ink-3)] mt-1">{action.description}</div>
        )}
        {editingNotes ? (
          <div className="mt-2 flex flex-col gap-2">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveNotes}>Save notes</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="text-xs text-[var(--color-muted)] mt-2 italic hover:text-[var(--color-accent)]"
            onClick={() => setEditingNotes(true)}
          >
            {notes ? `Note: ${notes}` : "+ add note"}
          </button>
        )}
      </td>
      <td className="py-3 pr-3"><Badge variant={action.priority}>{action.priority.toUpperCase()}</Badge></td>
      <td className="py-3 pr-3 text-xs text-[var(--color-ink-3)]">
        {action.due_date ?? "—"}
      </td>
      <td className="py-3 pr-3">
        <Select value={status} onChange={(e) => changeStatus(e.target.value as ActionStatus)} className="text-xs">
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="dismissed">Dismissed</option>
        </Select>
        {pending && <div className="text-[10px] text-[var(--color-muted)] mt-1">saving…</div>}
      </td>
    </tr>
  );
}
