import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { PageHeader } from "@/components/app/topbar";
import { EmptyState } from "@/components/ui/empty-state";
import { FindingCard } from "@/components/findings/finding-card";
import { Card, CardContent } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import type {
  ConfidenceLevel,
  Finding,
  FindingStatus,
  FindingType,
  PriorityBucket,
  Site,
} from "@/lib/types/domain";

interface SearchParams {
  site?: string;
  type?: FindingType | "all";
  priority?: PriorityBucket | "all";
  status?: FindingStatus | "open" | "all";
  confidence?: ConfidenceLevel | "all";
}

export default async function FindingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await getCurrentOrg();
  if (ctx.kind !== "ok") redirect("/onboarding");
  const sp = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name")
    .eq("organization_id", ctx.organization.id)
    .order("name");

  let query = supabase
    .from("findings")
    .select("*")
    .order("priority_score", { ascending: false })
    .limit(200);

  if (sp.site && sp.site !== "all") query = query.eq("site_id", sp.site);
  if (sp.type && sp.type !== "all") query = query.eq("finding_type", sp.type);
  if (sp.priority && sp.priority !== "all") query = query.eq("priority", sp.priority);
  if (sp.confidence && sp.confidence !== "all") query = query.eq("confidence", sp.confidence);

  const statusFilter = sp.status ?? "open";
  if (statusFilter === "open") query = query.in("status", ["new", "reviewed", "accepted"]);
  else if (statusFilter !== "all") query = query.eq("status", statusFilter);

  const { data: findings } = await query;

  async function updateStatus(id: string, status: FindingStatus) {
    "use server";
    const supabase = await createSupabaseServerClient();
    await supabase.from("findings").update({ status }).eq("id", id);
    revalidatePath("/app/findings");
    revalidatePath("/app/dashboard");
  }

  async function createActionFromFinding(id: string) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const { data: f } = await supabase.from("findings").select("*").eq("id", id).single();
    if (!f) return;
    await supabase.from("action_items").insert({
      site_id: f.site_id,
      finding_id: f.id,
      title: f.title,
      description: f.recommended_action,
      priority: f.priority,
      status: "open",
    });
    await supabase.from("findings").update({ status: "accepted" }).eq("id", id);
    revalidatePath("/app/findings");
    revalidatePath("/app/actions");
    revalidatePath("/app/dashboard");
  }

  return (
    <>
      <PageHeader
        title="Findings"
        subtitle="Deterministic detections from your latest analysis runs. Accept, dismiss, or convert into action items."
      />

      <Card className="mb-5">
        <CardContent className="py-4">
          <form className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3" action="/app/findings" method="get">
            <div>
              <Label>Site</Label>
              <Select name="site" defaultValue={sp.site ?? "all"}>
                <option value="all">All sites</option>
                {(sites as Pick<Site, "id" | "name">[] | null)?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select name="type" defaultValue={sp.type ?? "all"}>
                <option value="all">All types</option>
                <option value="pages_losing_clicks">Pages losing clicks</option>
                <option value="rising_impressions_low_ctr">CTR opportunities</option>
                <option value="near_win_keywords">Near-win keywords</option>
                <option value="content_decay">Content decay</option>
                <option value="ga4_engagement_mismatch">GA4 mismatch</option>
                <option value="cannibalization_risk">Cannibalization</option>
                <option value="internal_link_opportunity">Internal links</option>
                <option value="previous_action_followup">Previous action follow-up</option>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select name="priority" defaultValue={sp.priority ?? "all"}>
                <option value="all">All</option>
                <option value="p1">P1</option>
                <option value="p2">P2</option>
                <option value="p3">P3</option>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select name="status" defaultValue={sp.status ?? "open"}>
                <option value="open">Open (new + reviewed + accepted)</option>
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="accepted">Accepted</option>
                <option value="dismissed">Dismissed</option>
                <option value="completed">Completed</option>
              </Select>
            </div>
            <div>
              <Label>Confidence</Label>
              <Select name="confidence" defaultValue={sp.confidence ?? "all"}>
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
              <button type="submit" className="text-xs px-3 py-1.5 rounded bg-[var(--color-accent)] text-white font-semibold">Apply filters</button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!findings || findings.length === 0 ? (
        <EmptyState title="No findings match these filters" description="Try widening the filters, or run a new analysis from a site detail page." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {(findings as Finding[]).map((f) => (
            <FindingCard
              key={f.id}
              finding={f}
              onUpdateStatus={updateStatus}
              onCreateAction={createActionFromFinding}
            />
          ))}
        </div>
      )}
    </>
  );
}
