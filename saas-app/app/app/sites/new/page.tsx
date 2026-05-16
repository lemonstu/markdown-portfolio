import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { DemoBadge } from "@/components/ui/demo-badge";
import { PageHeader, BackLink } from "@/components/app/topbar";

export default async function NewSitePage({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  const ctx = await getCurrentOrg();
  if (ctx.kind !== "ok") redirect("/onboarding");
  const sp = await searchParams;
  const fromOnboarding = sp?.onboarding === "1";

  async function createSiteAction(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const ctxIn = await getCurrentOrg();
    if (ctxIn.kind !== "ok") throw new Error("No organization");

    const name = String(formData.get("name") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    const timezone = String(formData.get("timezone") ?? "UTC");
    const goal = String(formData.get("goal") ?? "traffic_growth") as "traffic_growth" | "lead_generation" | "content_recovery" | "agency_client_reporting";

    if (!name || !url) throw new Error("Name and URL are required");

    const { data: site, error } = await supabase
      .from("sites")
      .insert({
        organization_id: ctxIn.organization.id,
        name,
        url,
        timezone,
        goal,
        status: "active",
        integration_mode: "demo",
      })
      .select("*")
      .single();
    if (error || !site) throw new Error(error?.message ?? "Could not create site");

    revalidatePath("/app/sites");
    redirect(`/app/sites/${site.id}`);
  }

  return (
    <>
      <BackLink href="/app/sites" label="All sites" />
      <PageHeader
        title="Add a site"
        subtitle={fromOnboarding ? "Last step — add your first site in demo mode. You can swap in real Google data in Phase 2." : "All Phase 1 sites use demo data. Real Google Search Console + GA4 sync arrives in Phase 2."}
      />
      <Card className="max-w-2xl">
        <CardContent className="py-5">
          <form action={createSiteAction} className="space-y-4">
            <div>
              <Label htmlFor="name">Site name</Label>
              <Input id="name" name="name" placeholder="Acme blog" required maxLength={120} />
            </div>
            <div>
              <Label htmlFor="url">Site URL</Label>
              <Input id="url" name="url" type="url" placeholder="https://example.com" required />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timezone">Reporting timezone</Label>
                <Select id="timezone" name="timezone" defaultValue="UTC">
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Denver">America/Denver</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Berlin">Europe/Berlin</option>
                  <option value="Australia/Sydney">Australia/Sydney</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="goal">Primary goal</Label>
                <Select id="goal" name="goal" defaultValue="traffic_growth">
                  <option value="traffic_growth">Traffic growth</option>
                  <option value="lead_generation">Lead generation</option>
                  <option value="content_recovery">Content recovery</option>
                  <option value="agency_client_reporting">Agency client reporting</option>
                </Select>
              </div>
            </div>
            <div className="flex items-start gap-2 pt-2 border-t border-[var(--color-line-soft)]">
              <DemoBadge />
              <p className="text-xs text-[var(--color-ink-3)]">
                This site will be created in <strong>demo mode</strong>. To populate it with the realistic demo data
                bundled with this app, run <code>supabase/seed.sql</code> from the SQL editor in your Supabase project.
              </p>
            </div>
            <Button type="submit" className="w-full">Create site</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
