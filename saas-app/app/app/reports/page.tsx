import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import type { Report } from "@/lib/types/domain";

export default async function ReportsListPage() {
  const ctx = await getCurrentOrg();
  if (ctx.kind !== "ok") redirect("/onboarding");
  const supabase = await createSupabaseServerClient();
  const { data: sites } = await supabase.from("sites").select("id, name").eq("organization_id", ctx.organization.id);
  const siteIds = (sites ?? []).map((s) => s.id);
  if (siteIds.length === 0) {
    return (
      <>
        <PageHeader title="Reports" subtitle="Your generated Weekly Organic Growth Briefs." />
        <EmptyState title="No sites yet" description="Add a site to generate a brief." />
      </>
    );
  }
  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .in("site_id", siteIds)
    .order("created_at", { ascending: false });
  const siteName = new Map((sites ?? []).map((s) => [s.id, s.name]));

  return (
    <>
      <PageHeader title="Reports" subtitle="Your generated Weekly Organic Growth Briefs." />
      {!reports || reports.length === 0 ? (
        <EmptyState title="No reports yet" description="From a site's detail page, run analysis then generate brief." />
      ) : (
        <div className="grid gap-3">
          {(reports as Report[]).map((r) => (
            <Link key={r.id} href={`/app/reports/${r.id}`}>
              <Card className="hover:border-[var(--color-accent)]/40 transition-colors">
                <CardContent className="py-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-serif font-semibold text-[var(--color-ink)]">{r.title}</div>
                    <div className="text-xs text-[var(--color-muted)] mt-1">
                      {siteName.get(r.site_id)} · {r.period_start} → {r.period_end}
                    </div>
                  </div>
                  <Badge variant="info">Open</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
