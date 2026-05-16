"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Finding, FindingStatus, FindingType } from "@/lib/types/domain";

export function FindingCard({
  finding,
  onUpdateStatus,
  onCreateAction,
}: {
  finding: Finding;
  onUpdateStatus: (id: string, status: FindingStatus) => Promise<void>;
  onCreateAction: (id: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState(finding.status);

  function setStatus(status: FindingStatus) {
    setOptimisticStatus(status);
    startTransition(() => onUpdateStatus(finding.id, status));
  }

  return (
    <Card className="break-inside-avoid">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="text-xs text-[var(--color-muted)] mb-1">{humanFindingType(finding.finding_type)}</div>
            <h3 className="font-serif font-semibold text-[var(--color-ink)] leading-tight">{finding.title}</h3>
          </div>
          <div className="flex flex-wrap gap-1 flex-shrink-0">
            <Badge variant={finding.priority}>{finding.priority.toUpperCase()}</Badge>
            <Badge variant="neutral">Impact {finding.impact_score}/5</Badge>
            <Badge variant="neutral">Effort {finding.effort_score}/5</Badge>
            <Badge variant="neutral">{finding.confidence}</Badge>
          </div>
        </div>
        <dl className="text-sm text-[var(--color-ink-2)] space-y-2 mt-3">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-bold">Why it matters</dt>
            <dd className="mt-0.5">{finding.why_it_matters}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-bold">Recommended action</dt>
            <dd className="mt-0.5">{finding.recommended_action}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-bold">Evidence</dt>
            <dd className="mt-0.5">
              <code className="text-xs text-[var(--color-ink-3)] block whitespace-pre-wrap bg-[var(--color-paper)] border border-[var(--color-line-soft)] rounded p-2">
                {JSON.stringify(finding.evidence, null, 2)}
              </code>
            </dd>
          </div>
        </dl>
        <p className="text-xs italic text-[var(--color-muted)] mt-3">{finding.score_explanation}</p>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-line-soft)] gap-2 flex-wrap">
          <div className="text-xs text-[var(--color-muted)]">
            Status: <strong className="text-[var(--color-ink-3)]">{optimisticStatus}</strong>
            {pending && " (saving…)"}
          </div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="ghost" onClick={() => setStatus("accepted")}>Accept</Button>
            <Button size="sm" variant="ghost" onClick={() => setStatus("dismissed")}>Dismiss</Button>
            <Button size="sm" variant="ghost" onClick={() => setStatus("completed")}>Complete</Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => startTransition(() => onCreateAction(finding.id))}
            >
              Create action
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function humanFindingType(t: FindingType): string {
  switch (t) {
    case "pages_losing_clicks": return "Pages losing clicks";
    case "rising_impressions_low_ctr": return "CTR opportunity";
    case "near_win_keywords": return "Near-win keyword";
    case "content_decay": return "Content decay";
    case "ga4_engagement_mismatch": return "GA4 engagement / conversion mismatch";
    case "cannibalization_risk": return "Cannibalization risk";
    case "internal_link_opportunity": return "Internal-link opportunity";
    case "previous_action_followup": return "Previous action follow-up";
  }
}
