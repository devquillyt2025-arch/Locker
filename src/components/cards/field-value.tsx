"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

// Secret values stay masked until revealed. (Real browser-side encryption
// is phase 2 — this only keeps them off-screen by default.)
export function FieldValue({ value, isSecret }: { value: string; isSecret: boolean }) {
  const [revealed, setRevealed] = useState(!isSecret);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 flex-1 truncate font-mono text-sm">
        {revealed ? value || <span className="text-muted-foreground">—</span> : "••••••••••"}
      </span>
      {isSecret && (
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          title={revealed ? "Hide" : "Reveal"}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
      )}
      <button
        type="button"
        onClick={copy}
        title="Copy"
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}
