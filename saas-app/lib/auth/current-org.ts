import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Organization } from "@/lib/types/domain";

export type CurrentOrgResult =
  | { kind: "no-user" }
  | { kind: "no-org"; userId: string }
  | { kind: "ok"; userId: string; organization: Organization };

/**
 * Phase 1: a user belongs to at most one organization most of the time.
 * If they belong to many, we pick the most recently created one.
 * Org switching UI lives in components/app/org-switcher.tsx (currently read-only).
 */
export async function getCurrentOrg(): Promise<CurrentOrgResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "no-user" };

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(id, name, slug, created_at, updated_at)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    return { kind: "no-org", userId: user.id };
  }

  const orgs = memberships
    .map((m) => m.organizations as unknown as Organization)
    .filter(Boolean)
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

  return { kind: "ok", userId: user.id, organization: orgs[0]! };
}
