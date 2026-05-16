import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionRow } from "@/components/actions/action-row";
import type { ActionItem, ActionStatus } from "@/lib/types/domain";

export default async function ActionsPage() {
  const ctx = await getCurrentOrg();
  if (ctx.kind !== "ok") redirect("/onboarding");
  const supabase = await createSupabaseServerClient();

  const { data: sites } = await supabase.from("sites").select("id, name").eq("organization_id", ctx.organization.id);
  const siteIds = (sites ?? []).map((s) => s.id);
  if (siteIds.length === 0) {
    return (
      <>
        <PageHeader title="Action items" subtitle="Things your team will do." />
        <EmptyState title="No sites yet" description="Create a site and run an analysis to populate actions." />
      </>
    );
  }

  const { data: actions } = await supabase
    .from("action_items")
    .select("*")
    .in("site_id", siteIds)
    .order("status", { ascending: true })
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  async function updateAction(id: string, patch: { status?: ActionStatus; notes?: string }) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const update: Record<string, unknown> = { ...patch };
    if (patch.status === "completed") update.completed_at = new Date().toISOString();
    await supabase.from("action_items").update(update).eq("id", id);
    revalidatePath("/app/actions");
    revalidatePath("/app/dashboard");
  }

  return (
    <>
      <PageHeader title="Action items" subtitle="Created from findings. Track to completion, link them back to follow-up next week." />
      {!actions || actions.length === 0 ? (
        <EmptyState
          title="No action items yet"
          description="Open a finding from the Findings page and click 'Create action' to track work."
        />
      ) : (
        <Card>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-muted)] uppercase text-[10px] tracking-wider">
                  <th className="py-2 font-semibold">Action</th>
                  <th className="py-2 font-semibold">Priority</th>
                  <th className="py-2 font-semibold">Due</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(actions as ActionItem[]).map((a) => (
                  <ActionRow key={a.id} action={a} onUpdate={updateAction} />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
