"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

const items = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/sites", label: "Sites" },
  { href: "/app/findings", label: "Findings" },
  { href: "/app/actions", label: "Actions" },
  { href: "/app/reports", label: "Reports" },
];

const secondary = [
  { href: "/app/integrations", label: "Integrations" },
  { href: "/app/settings", label: "Settings" },
  { href: "/app/billing", label: "Billing" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:flex-col w-60 border-r border-[var(--color-line)] bg-[var(--color-paper)] min-h-screen">
      <div className="px-5 py-5 border-b border-[var(--color-line)]">
        <Link href="/app/dashboard" className="flex items-center gap-2 text-[var(--color-accent)]">
          <svg viewBox="0 0 36 36" width="24" height="24" aria-hidden="true">
            <rect x="1" y="1" width="34" height="34" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 24 L17 12 L22 19 L27 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="27" cy="14" r="1.6" fill="currentColor"/>
          </svg>
          <span className="font-serif font-bold text-sm text-[var(--color-ink)] leading-tight">
            Weekly Organic<br />Growth Brief
          </span>
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "px-3 py-2 text-sm rounded-md",
                active
                  ? "bg-[var(--color-paper-2)] text-[var(--color-ink)] font-semibold"
                  : "text-[var(--color-ink-3)] hover:bg-[var(--color-paper-2)]",
              )}
            >
              {it.label}
            </Link>
          );
        })}
        <div className="mt-6 mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Workspace</div>
        {secondary.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "px-3 py-2 text-sm rounded-md",
                active
                  ? "bg-[var(--color-paper-2)] text-[var(--color-ink)] font-semibold"
                  : "text-[var(--color-ink-3)] hover:bg-[var(--color-paper-2)]",
              )}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
