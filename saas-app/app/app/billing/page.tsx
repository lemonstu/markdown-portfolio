import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function BillingPage() {
  const ctx = await getCurrentOrg();
  if (ctx.kind !== "ok") redirect("/onboarding");

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Stripe billing is not implemented in Phase 1. Pricing shown below is reference only — there is no checkout, no charge, no plan limit enforcement."
      />
      <div className="mb-4">
        <Badge variant="neutral">Phase 4 · Stripe + plan limits + customer portal</Badge>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <PriceCard name="Starter" price="$49 / mo" features={["1 site", "Weekly briefs", "Email delivery"]} />
        <PriceCard name="Studio" price="$149 / mo" features={["5 sites", "Weekly briefs", "White-label branding"]} featured />
        <PriceCard name="Agency" price="$399 / mo" features={["20 sites", "All Studio features", "Team seats"]} />
      </div>
      <p className="text-xs italic text-[var(--color-muted)] mt-6">
        These plans are conceptual placeholders. Final pricing will be defined during the Phase 4 rollout.
      </p>
    </>
  );
}

function PriceCard({ name, price, features, featured = false }: { name: string; price: string; features: string[]; featured?: boolean }) {
  return (
    <Card className={featured ? "border-[var(--color-accent)]" : ""}>
      <CardContent className="py-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif font-semibold text-lg">{name}</h3>
          {featured && <Badge variant="info">Conceptual</Badge>}
        </div>
        <div className="font-serif text-2xl font-bold text-[var(--color-ink)] mb-3">{price}</div>
        <ul className="text-sm text-[var(--color-ink-3)] space-y-1.5">
          {features.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-[var(--color-rule)]">·</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 text-xs italic text-[var(--color-muted)]">
          No checkout in Phase 1.
        </div>
      </CardContent>
    </Card>
  );
}
