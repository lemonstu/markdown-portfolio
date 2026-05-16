import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/app/topbar";
import type { Site } from "@/lib/types/domain";

export default async function SitesPage() {
  const ctx = await getCurrentOrg();
  if (ctx.kind !== "ok") redirect("/onboarding");
  const supabase = await createSupabaseServerClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Sites"
        subtitle="Each site is one Google Search Console + GA4 property. Phase 1 supports demo data only."
        actions={<Link href="/app/sites/new"><Button>Add site</Button></Link>}
      />
      {!sites || sites.length === 0 ? (
        <EmptyState
          title="No sites yet"
          description="Add your first site to run a demo analysis and generate a brief."
          action={<Link href="/app/sites/new"><Button>Add site</Button></Link>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(sites as Site[]).map((s) => (
            <Link key={s.id} href={`/app/sites/${s.id}`} className="group">
              <Card className="hover:border-[var(--color-accent)]/40 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate group-hover:text-[var(--color-accent)]">{s.name}</div>
                      <div className="text-xs text-[var(--color-muted)] truncate">{s.url}</div>
                    </div>
                    {s.integration_mode === "demo" && <Badge variant="demo">Demo</Badge>}
                    {s.integration_mode === "pending_google_connection" && <Badge variant="info">Pending</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-ink-3)] mt-3">
                    <span>{labelGoal(s.goal)}</span>
                    <span>·</span>
                    <span>{labelStatus(s.status)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
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
function labelStatus(s: Site["status"]): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
