import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { DemoBadge } from "@/components/ui/demo-badge";

export default async function OnboardingPage() {
  const result = await getCurrentOrg();
  if (result.kind === "no-user") redirect("/sign-in");
  if (result.kind === "ok") redirect("/app/dashboard");

  async function createOrgAction(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/sign-in");

    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({ name, slug })
      .select("*")
      .single();
    if (orgErr || !org) throw new Error(orgErr?.message ?? "Could not create organization");

    const { error: memErr } = await supabase
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: user.id, role: "owner" });
    if (memErr) throw new Error(memErr.message);

    revalidatePath("/app", "layout");
    redirect("/app/sites/new?onboarding=1");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-paper-2)] px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="font-serif text-2xl font-semibold text-[var(--color-ink)]">Welcome — create your workspace</h1>
          <p className="text-sm text-[var(--color-ink-3)] mt-2">
            A workspace holds your sites, briefs, and team. You can rename it later.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Workspace name</CardTitle>
            <CardDescription>This is the agency or company name shown in the app.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createOrgAction} className="space-y-4">
              <div>
                <Label htmlFor="name">Workspace name</Label>
                <Input id="name" name="name" placeholder="Acme SEO" required maxLength={80} />
              </div>
              <Button type="submit" className="w-full">Create workspace</Button>
            </form>
            <div className="mt-5 pt-4 border-t border-[var(--color-line-soft)] flex items-start gap-2">
              <DemoBadge />
              <p className="text-xs text-[var(--color-ink-3)]">
                The next step lets you add a site in <strong>demo mode</strong> so you can run an analysis without
                connecting Google Search Console or GA4. Real Google integrations are Phase 2.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
