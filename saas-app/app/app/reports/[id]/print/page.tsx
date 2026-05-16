import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { ReportView } from "@/components/reports/report-view";
import type { Report, ReportSection, Site } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

export default async function ReportPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentOrg();
  if (ctx.kind !== "ok") redirect("/onboarding");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: report } = await supabase.from("reports").select("*").eq("id", id).single();
  if (!report) notFound();
  const { data: site } = await supabase.from("sites").select("*").eq("id", report.site_id).single();
  if (!site) notFound();
  const { data: sections } = await supabase
    .from("report_sections")
    .select("*")
    .eq("report_id", id)
    .order("sort_order");

  return (
    <div className="min-h-screen bg-white text-[var(--color-ink)]">
      <ReportView
        report={report as Report}
        site={site as Site}
        sections={(sections ?? []) as ReportSection[]}
        showDemoBadge={(site as Site).integration_mode === "demo"}
        printMode
      />
    </div>
  );
}
