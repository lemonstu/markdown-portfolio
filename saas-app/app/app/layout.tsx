import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/auth/current-org";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const result = await getCurrentOrg();
  if (result.kind === "no-user") redirect("/sign-in");
  if (result.kind === "no-org") redirect("/onboarding");

  return (
    <div className="min-h-screen flex bg-[var(--color-paper)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar orgName={result.organization.name} />
        <main className="flex-1 px-6 py-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
