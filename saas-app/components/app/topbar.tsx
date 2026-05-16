import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function Topbar({ orgName }: { orgName?: string }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-line)] bg-white">
      <div className="text-sm text-[var(--color-ink-3)]">
        {orgName && (
          <span>
            <span className="text-[var(--color-muted)]">Workspace · </span>
            <strong className="text-[var(--color-ink)]">{orgName}</strong>
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm">
        {user && <span className="text-[var(--color-ink-3)]">{user.email}</span>}
        <form action="/auth/sign-out" method="post">
          <button className="text-[var(--color-accent)] hover:text-[var(--color-accent-2)]" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-[var(--color-ink)] leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--color-ink-3)] mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)] mb-3 inline-block">
      ← {label}
    </Link>
  );
}
