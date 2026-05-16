import type { Finding, Report, ReportSection, Site } from "@/lib/types/domain";

export function reportToMarkdown(args: {
  site: Site;
  report: Report;
  sections: ReportSection[];
}): string {
  const { site, report, sections } = args;
  const lines: string[] = [];
  lines.push(`# ${report.title}`);
  lines.push("");
  lines.push(`*Site:* ${site.name} · ${site.url}`);
  lines.push(`*Period:* ${report.period_start} → ${report.period_end}`);
  lines.push("");
  lines.push(`## Executive summary`);
  lines.push("");
  lines.push(report.executive_summary || "_No summary._");
  lines.push("");

  for (const section of sections) {
    if (section.section_key === "executive_summary") continue;
    lines.push(`## ${section.title}`);
    lines.push("");
    const items = (section.body as { items?: Finding[] }).items ?? [];
    if (items.length === 0) {
      lines.push("_No findings in this section._");
      lines.push("");
      continue;
    }
    for (const f of items) {
      lines.push(`### ${f.title}`);
      lines.push("");
      lines.push(`**Priority:** ${f.priority.toUpperCase()} · **Impact:** ${f.impact_score}/5 · **Effort:** ${f.effort_score}/5 · **Confidence:** ${f.confidence}`);
      lines.push("");
      lines.push(`**Why it matters.** ${f.why_it_matters}`);
      lines.push("");
      lines.push(`**Recommended action.** ${f.recommended_action}`);
      lines.push("");
      lines.push(`_${f.score_explanation}_`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

export function execSummaryEmail(args: {
  site: Site;
  report: Report;
  topActions: Finding[];
}): string {
  const { site, report, topActions } = args;
  const top = topActions.slice(0, 5);
  const lines: string[] = [];
  lines.push(`Subject: Weekly Organic Growth Brief — ${site.name} — ${report.period_start} → ${report.period_end}`);
  lines.push("");
  lines.push(`Hi team,`);
  lines.push("");
  lines.push(`Here is the weekly brief for ${site.name}.`);
  lines.push("");
  lines.push(report.executive_summary);
  lines.push("");
  lines.push(`Top actions this week:`);
  top.forEach((f, i) => {
    lines.push(`${i + 1}. [${f.priority.toUpperCase()}] ${f.title} — ${f.recommended_action}`);
  });
  lines.push("");
  lines.push(`Full brief is attached / linked.`);
  lines.push("");
  lines.push(`— Your SEO team`);
  return lines.join("\n");
}
