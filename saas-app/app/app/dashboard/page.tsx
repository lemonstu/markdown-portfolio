import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { ActionItem, AnalysisRun, Finding, Report, Site } from "@/lib/types/domain";

export default async function DashboardPage() {
  const ctx = await getCurrentOrg();
  if (ctx.kind !== "ok") redirect("/onboarding");
  const supabase = await createSupabaseServerClient();
  const orgId = ctx.organization.id;

  const { data: sites } = await supabase.from("sites").select("*").eq("organization_id", orgId);
  const siteIds = (sites ?? []).map((s) => s.id);

  if (siteIds.length === 0) {
    return (
      <>
        <PageHeader title={`Welcome, ${ctx.organization.name}`} subtitle="Add your first site to start surfacing weekly findings." />
        <EmptyState
          title="No sites yet"
          description="Each site you add becomes a stream of weekly briefs. Phase 1 supports demo data only."
          action={<Link href="/app/sites/new"><Button>Add site</Button></Link>}
        />
      </>
    );
  }

  const [
    { data: latestReports },
    { data: urgentFindings },
    { data: opportunityFindings },
    { data: openActions, count: openActionCount },
    { count: completedActionCount },
    { data: pending },
    { data: recentRuns },
  ] = await Promise.all([
    supabase.from("reports").select("*").in("site_id", siteIds).order("created_at", { ascending: false }).limit(5),
    supabase.from("findings").select("*").in("site_id", siteIds).eq("priority", "p1").in("status", ["new", "reviewed", "accepted"]).order("priority_score", { ascending: false }).limit(5),
    supabase.from("findings").select("*").in("site_id", siteIds).in("finding_type", ["rising_impressions_low_ctr", "near_win_keywords", "internal_link_opportunity"]).in("status", ["new", "reviewed", "accepted"]).order("priority_score", { ascending: false }).limit(5),
    supabase.from("action_items").select("*", { count: "exact" }).in("site_id", siteIds).in("status", ["open", "in_progress"]).order("priority", { ascending: true }).limit(5),
    supabase.from("action_items").select("*", { count: "exact", head: true }).in("site_id", siteIds).eq("status", "completed"),
    supabase.from("sites").select("id, name, integration_mode").eq("organization_id", orgId).in("integration_mode", ["pending_google_connection", "disconnected" as never]),
    supabase.from("analysis_runs").select("*").in("site_id", siteIds).order("created_at", { ascending: false }).limit(5),
  ]);

  const activeSites = (sites as Site[]).filter((s) => s.status === "active");

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${ctx.organization.name} · Manage weekly briefs and action priorities — not a generic SEO dashboard.`}
      />

      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <SectionCard title="Active sites" description={`${activeSites.length} active · ${sites!.length} total`}>
          {sites!.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-3)]">No sites.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(sites as Site[]).slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <Link href={`/app/sites/${s.id}`} className="text-[var(--color-ink)] hover:text-[var(--color-accent)] truncate">{s.name}</Link>
                  <Badge variant={s.integration_mode === "demo" ? "demo" : "neutral"}>
                    {s.integration_mode === "demo" ? "Demo" : "—"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <FooterLink href="/app/sites" label="All sites →" />
        </SectionCard>

        <SectionCard title="Latest reports">
          {!latestReports || latestReports.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-3)]">No reports yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(latestReports as Report[]).map((r) => (
                <li key={r.id}>
                  <Link href={`/app/reports/${r.id}`} className="text-[var(--color-ink)] hover:text-[var(--color-accent)] block truncate">
                    {r.title}
                  </Link>
                  <span className="text-xs text-[var(--color-muted)]">{r.period_start} → {r.period_end}</span>
                </li>
              ))}
            </ul>
          )}
          <FooterLink href="/app/reports" label="All reports →" />
        </SectionCard>

        <SectionCard title="Urgent findings (P1)" description="Open items requiring action this week">
          {!urgentFindings || urgentFindings.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-3)]">No urgent P1 findings open.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(urgentFindings as Finding[]).map((f) => (
                <li key={f.id} className="flex items-start gap-2">
                  <Badge variant="p1">P1</Badge>
                  <span className="text-[var(--color-ink)]">{f.title}</span>
                </li>
              ))}
            </ul>
          )}
          <FooterLink href="/app/findings?priority=p1" label="View all P1 →" />
        </SectionCard>

        <SectionCard title="Growth opportunities" description="CTR fixes, near-wins, internal links">
          {!opportunityFindings || opportunityFindings.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-3)]">No open opportunities.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(opportunityFindings as Finding[]).map((f) => (
                <li key={f.id} className="flex items-start gap-2">
                  <Badge variant={f.priority}>{f.priority.toUpperCase()}</Badge>
                  <span className="text-[var(--color-ink)]">{f.title}</span>
                </li>
              ))}
            </ul>
          )}
          <FooterLink href="/app/findings?type=rising_impressions_low_ctr" label="View opportunities →" />
        </SectionCard>

        <SectionCard title="Actions" description={`${openActionCount ?? 0} open · ${completedActionCount ?? 0} completed`}>
          {!openActions || openActions.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-3)]">No open actions.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(openActions as ActionItem[]).map((a) => (
                <li key={a.id} className="flex items-start gap-2">
                  <Badge variant={a.priority}>{a.priority.toUpperCase()}</Badge>
                  <span className="text-[var(--color-ink)]">{a.title}</span>
                </li>
              ))}
            </ul>
          )}
          <FooterLink href="/app/actions" label="Manage actions →" />
        </SectionCard>

        <SectionCard title="Integrations" description="Phase 2 will bring real Google connections">
          {pending && pending.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {pending.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <span className="text-[var(--color-ink)]">{s.name}</span>
                  <Badge variant="info">Pending</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--color-ink-3)]">No sites pending Google connection. Demo sites use bundled data.</p>
          )}
          <FooterLink href="/app/integrations" label="Integrations →" />
        </SectionCard>

        <SectionCard title="Recent analysis runs" description="Last 5 runs across all sites">
          {!recentRuns || recentRuns.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-3)]">No runs yet.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {(recentRuns as AnalysisRun[]).map((r) => (
                <li key={r.id}>
                  <span className="text-[var(--color-ink)]">{r.findings_count} findings</span>
                  <span className="text-[var(--color-muted)]"> · {r.status} · {new Date(r.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-3 pt-3 border-t border-[var(--color-line-soft)]">
      <Link href={href} className="text-xs text-[var(--color-accent)]">{label}</Link>
    </div>
  );
}
