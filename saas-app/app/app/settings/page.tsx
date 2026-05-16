import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const ctx = await getCurrentOrg();
  if (ctx.kind !== "ok") redirect("/onboarding");
  // Capture narrowed values for the server-action closures below;
  // TS doesn't propagate control-flow narrowing across function boundaries.
  const userId = ctx.userId;
  const orgId = ctx.organization.id;
  const orgName = ctx.organization.name;

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

  async function updateProfile(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const fullName = String(formData.get("full_name") ?? "").trim();
    await supabase.from("profiles").update({ full_name: fullName || null }).eq("id", userId);
    revalidatePath("/app/settings");
  }

  async function updateOrg(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    await supabase.from("organizations").update({ name }).eq("id", orgId);
    revalidatePath("/app", "layout");
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Profile, workspace, and reporting cadence." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>Signed in as {profile?.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProfile} className="space-y-3">
              <div>
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} />
              </div>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Renaming changes the workspace name shown in the top bar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateOrg} className="space-y-3">
              <div>
                <Label htmlFor="name">Workspace name</Label>
                <Input id="name" name="name" defaultValue={orgName} maxLength={80} required />
              </div>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report defaults</CardTitle>
            <CardDescription>Per-site overrides live on the site detail page.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <div>
                <Label htmlFor="default_tz">Default timezone</Label>
                <Select id="default_tz" defaultValue="UTC" disabled>
                  <option value="UTC">UTC</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="default_day">Preferred report day</Label>
                <Select id="default_day" defaultValue="Tuesday" disabled>
                  <option value="Tuesday">Tuesday</option>
                </Select>
              </div>
              <p className="text-xs italic text-[var(--color-muted)]">
                <Badge variant="neutral">Phase 3</Badge> Scheduled report delivery uses these defaults. Phase 1 generates briefs on demand from the site detail page.
              </p>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>Invitations and role management.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[var(--color-ink-3)]">
              <Badge variant="neutral">Phase 5</Badge> Team invitations, role assignment (owner / admin / member / viewer), and audit logs are scheduled for Phase 5.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
