import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { PageHeader, BackLink } from "@/components/app/topbar";
import { ReportView } from "@/components/reports/report-view";
import { ExportButtons } from "@/components/reports/export-buttons";
import { reportToMarkdown, execSummaryEmail } from "@/lib/reporting/export";
import type { Finding, Report, ReportSection, Site } from "@/lib/types/domain";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const sectionList = (sections ?? []) as ReportSection[];

  const topActions: Finding[] =
    ((sectionList.find((s) => s.section_key === "action_list")?.body as { items?: Finding[] }).items ?? []);

  const markdown = reportToMarkdown({ site: site as Site, report: report as Report, sections: sectionList });
  const emailText = execSummaryEmail({ site: site as Site, report: report as Report, topActions });

  return (
    <>
      <BackLink href="/app/reports" label="All reports" />
      <PageHeader
        title="Weekly Organic Growth Brief"
        subtitle={`${(site as Site).name} · ${report.period_start} → ${report.period_end}`}
        actions={
          <ExportButtons
            markdown={markdown}
            emailSummary={emailText}
            execSummary={(report as Report).executive_summary}
            printHref={`/app/reports/${id}/print`}
          />
        }
      />
      <ReportView
        report={report as Report}
        site={site as Site}
        sections={sectionList}
        showDemoBadge={(site as Site).integration_mode === "demo"}
      />
    </>
  );
}
