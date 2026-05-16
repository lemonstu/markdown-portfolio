import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { runAnalysisForSite } from "@/lib/analysis";
import { buildReportFromRun } from "@/lib/reporting/build-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/ui/demo-badge";
import { PageHeader, BackLink } from "@/components/app/topbar";
import { EmptyState } from "@/components/ui/empty-state";
import type { AnalysisRun, Finding, Report, Site, ActionItem } from "@/lib/types/domain";

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentOrg();
  if (ctx.kind !== "ok") redirect("/onboarding");

  const supabase = await createSupabaseServerClient();
  const { data: site } = await supabase.from("sites").select("*").eq("id", id).single();
  if (!site) return <div>Site not found.</div>;

  const [{ data: latestReport }, { data: openFindings }, { data: openActions }, { data: runs }] = await Promise.all([
    supabase.from("reports").select("*").eq("site_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("findings")
      .select("*")
      .eq("site_id", id)
      .in("status", ["new", "reviewed", "accepted"])
      .order("priority_score", { ascending: false })
      .limit(6),
    supabase.from("action_items").select("*").eq("site_id", id).in("status", ["open", "in_progress"]).order("created_at", { ascending: false }).limit(6),
    supabase.from("analysis_runs").select("*").eq("site_id", id).order("created_at", { ascending: false }).limit(5),
  ]);

  async function runAnalysisAction() {
    "use server";
    await runAnalysisForSite({ siteId: id });
    revalidatePath(`/app/sites/${id}`);
    revalidatePath("/app/findings");
    revalidatePath("/app/dashboard");
  }

  async function generateReportAction() {
    "use server";
    const supabase = await createSupabaseServerClient();
    const { data: run } = await supabase
      .from("analysis_runs")
      .select("id")
      .eq("site_id", id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!run) throw new Error("Run analysis before generating a report.");
    const { reportId } = await buildReportFromRun({ siteId: id, analysisRunId: run.id });
    revalidatePath("/app/reports");
    redirect(`/app/reports/${reportId}`);
  }

  const s = site as Site;

  return (
    <>
      <BackLink href="/app/sites" label="All sites" />
      <PageHeader
        title={s.name}
        subtitle={s.url}
        actions={
          <>
            <form action={runAnalysisAction}>
              <Button type="submit" variant="secondary">Run demo analysis</Button>
            </form>
            <form action={generateReportAction}>
              <Button type="submit">Generate brief</Button>
            </form>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Site profile</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <Row label="Goal">{labelGoal(s.goal)}</Row>
            <Row label="Status">{s.status}</Row>
            <Row label="Timezone">{s.timezone}</Row>
            <Row label="Created">{new Date(s.created_at).toLocaleDateString()}</Row>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Integration</CardTitle>
            <CardDescription>How metrics enter the system.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {s.integration_mode === "demo" ? (
              <div className="space-y-3">
                <DemoBadge />
                <p className="text-[var(--color-ink-3)] text-xs">
                  This site uses bundled demo data. Run <code>supabase/seed.sql</code> once to populate the metrics tables.
                </p>
              </div>
            ) : (
              <p className="text-[var(--color-ink-3)] text-xs">
                Google Search Console + GA4 OAuth are not implemented in Phase 1.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest brief</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {latestReport ? (
              <div>
                <p className="text-xs text-[var(--color-muted)] mb-1">
                  {(latestReport as Report).period_start} → {(latestReport as Report).period_end}
                </p>
                <Link
                  href={`/app/reports/${(latestReport as Report).id}`}
                  className="text-sm text-[var(--color-accent)]"
                >
                  View latest brief →
                </Link>
              </div>
            ) : (
              <p className="text-xs text-[var(--color-ink-3)]">
                No brief yet. Run analysis, then generate brief.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Open findings (top 6)</CardTitle>
          </CardHeader>
          <CardContent>
            {!openFindings || openFindings.length === 0 ? (
              <p className="text-xs text-[var(--color-ink-3)]">No open findings. Run analysis to surface this week's items.</p>
            ) : (
              <ul className="space-y-3">
                {(openFindings as Finding[]).map((f) => (
                  <li key={f.id} className="text-sm">
                    <div className="flex items-start gap-2">
                      <Badge variant={f.priority}>{f.priority.toUpperCase()}</Badge>
                      <Link href="/app/findings" className="text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                        {f.title}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open action items</CardTitle>
          </CardHeader>
          <CardContent>
            {!openActions || openActions.length === 0 ? (
              <EmptyState
                title="No open actions"
                description="Convert a finding into an action from the Findings page."
                action={<Link href="/app/findings"><Button variant="secondary" size="sm">Go to findings</Button></Link>}
              />
            ) : (
              <ul className="space-y-2">
                {(openActions as ActionItem[]).map((a) => (
                  <li key={a.id} className="text-sm flex items-start gap-2">
                    <Badge variant={a.priority}>{a.priority.toUpperCase()}</Badge>
                    <span className="text-[var(--color-ink)]">{a.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent analysis runs</CardTitle>
        </CardHeader>
        <CardContent>
          {!runs || runs.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-3)]">No runs yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--color-muted)] uppercase tracking-wider">
                  <th className="py-2 font-semibold">Started</th>
                  <th className="font-semibold">Period</th>
                  <th className="font-semibold">Findings</th>
                  <th className="font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(runs as AnalysisRun[]).map((r) => (
                  <tr key={r.id} className="border-t border-[var(--color-line-soft)]">
                    <td className="py-2">{new Date(r.created_at).toLocaleString()}</td>
                    <td>{r.current_period_start} → {r.current_period_end}</td>
                    <td>{r.findings_count}</td>
                    <td>{r.status}{r.error_message ? ` — ${r.error_message}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="text-[var(--color-ink)] font-medium">{children}</span>
    </div>
  );
}

function labelGoal(g: Site["goal"]): string {
  switch (g) {
    case "traffic_growth": return "Traffic growth";
    case "lead_generation": return "Lead generation";
    case "content_recovery": return "Content recovery";
    case "agency_client_reporting": return "Agency client reporting";
  }
}
