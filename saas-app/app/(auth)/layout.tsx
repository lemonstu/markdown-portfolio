export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-paper-2)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-[var(--color-accent)] mb-3">
            <svg viewBox="0 0 36 36" width="28" height="28" aria-hidden="true">
              <rect x="1" y="1" width="34" height="34" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 24 L17 12 L22 19 L27 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="27" cy="14" r="1.6" fill="currentColor"/>
            </svg>
          </div>
          <h1 className="font-serif text-xl font-semibold text-[var(--color-ink)]">Weekly Organic Growth Brief</h1>
          <p className="text-xs text-[var(--color-ink-3)] mt-1">A weekly action list, not another dashboard.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
