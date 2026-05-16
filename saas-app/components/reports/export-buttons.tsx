"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ExportButtons({
  markdown,
  emailSummary,
  execSummary,
  printHref,
}: {
  markdown: string;
  emailSummary: string;
  execSummary: string;
  printHref: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // fallback
      const t = document.createElement("textarea");
      t.value = value;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    }
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "weekly-organic-growth-brief.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="ghost" onClick={() => copy("summary", execSummary)}>
        {copied === "summary" ? "Copied" : "Copy summary"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => copy("email", emailSummary)}>
        {copied === "email" ? "Copied" : "Copy email summary"}
      </Button>
      <Button size="sm" variant="ghost" onClick={downloadMarkdown}>
        Download .md
      </Button>
      <a href={printHref} target="_blank" rel="noopener">
        <Button size="sm" variant="secondary">Print view</Button>
      </a>
    </div>
  );
}
