/**
 * Demo-mode labels and constants.
 *
 * The actual demo data lives in supabase/seed.sql so detectors see it
 * exactly as they'll see real synced data in Phase 2. This file only
 * centralizes the UI labels that mark demo data as demo data.
 */
export const DEMO_LABELS = {
  badge: "Demo data",
  longLabel: "This site uses demo (fictional) data. Google Search Console and GA4 sync are Phase 2.",
  siteUrlExampleDomain: "example.com",
} as const;

export function isDemoIntegrationMode(mode: string): boolean {
  return mode === "demo";
}
