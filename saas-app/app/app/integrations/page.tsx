import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function IntegrationsPage() {
  const ctx = await getCurrentOrg();
  if (ctx.kind !== "ok") redirect("/onboarding");

  return (
    <>
      <PageHeader title="Integrations" subtitle="Where real data will come from once Phase 2 ships." />
      <div className="grid md:grid-cols-2 gap-4">
        <PlannedIntegration
          name="Google Search Console"
          status="Not implemented in Phase 1"
          description="Phase 2 will add Google OAuth, GSC property selection, automatic daily sync of page/query metrics with token refresh, and per-site re-auth flows."
        />
        <PlannedIntegration
          name="Google Analytics 4"
          status="Not implemented in Phase 1"
          description="Phase 2 will add GA4 property selection, scheduled landing-page + key-event sync, and a measurement-health check that the analysis engine already accounts for."
        />
        <PlannedIntegration
          name="Email delivery"
          status="Not implemented in Phase 1"
          description="Phase 3 will deliver each weekly brief to a chosen address (or list) on the site's reporting day with a forwardable client-ready summary."
        />
        <PlannedIntegration
          name="Stripe billing"
          status="Not implemented in Phase 1"
          description="Phase 4 will add subscription billing, plan limits (sites, briefs/month), and a customer portal."
        />
      </div>
    </>
  );
}

function PlannedIntegration({ name, status, description }: { name: string; status: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{name}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="neutral">Phase 2+</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-[var(--color-ink-3)] italic">{status}</div>
      </CardContent>
    </Card>
  );
}
