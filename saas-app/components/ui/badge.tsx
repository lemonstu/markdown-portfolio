import * as React from "react";
import { cn } from "./cn";

type Variant = "p1" | "p2" | "p3" | "neutral" | "demo" | "info";

export function Badge({
  variant = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  const variants: Record<Variant, string> = {
    p1: "bg-[var(--color-p1-bg)] text-[var(--color-p1)] border-[color:#e8c6bd]",
    p2: "bg-[var(--color-p2-bg)] text-[var(--color-p2)] border-[color:#e2d39a]",
    p3: "bg-[var(--color-p3-bg)] text-[var(--color-p3)] border-[color:#cad9ca]",
    neutral: "bg-[var(--color-paper-2)] text-[var(--color-ink-3)] border-[var(--color-line)]",
    demo: "bg-[var(--color-p2-bg)] text-[var(--color-p2)] border-[color:#e2d39a]",
    info: "bg-[#e7eef6] text-[var(--color-accent)] border-[#c9d8e8]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
