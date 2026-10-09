"use client";

import * as React from "react";
import { Check, ChevronDown, Cloud, CloudUpload, Copy, Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { disconnectDriveAction } from "@/app/drive-actions";
import { useDocs } from "@/components/docs/docs-store";
import { useDriveUpload, type BatchSummary } from "@/components/docs/use-drive-upload";
import { cn } from "@/lib/utils";

const REDIRECT_PATH = "/api/drive/callback";

// The message Google's round trip leaves in the URL (?drive=...), shown once.
const RETURN_MESSAGES: Record<string, { level: "success" | "error" | "info"; text: string }> = {
  connected: { level: "success", text: "Google Drive is connected." },
  denied: { level: "info", text: "Connection cancelled — nothing was connected." },
  bad_state: { level: "error", text: "That sign-in didn't match this session. Please try Connect again." },
  auth: { level: "error", text: "Google rejected the sign-in. Check the client ID and secret, then try again." },
  not_configured: { level: "error", text: "Add the Google client ID and secret to .env.local first." },
  error: { level: "error", text: "Couldn't connect to Google Drive. Please try again." },
};

export function DrivePanel({ pending, uploadedCount }: { pending: string[]; uploadedCount: number }) {
  const { drive } = useDocs();
  const { uploadMany, stop } = useDriveUpload();

  const [progress, setProgress] = React.useState<{ done: number; total: number; current: string } | null>(null);
  const [summary, setSummary] = React.useState<BatchSummary | null>(null);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [origin, setOrigin] = React.useState("");

  React.useEffect(() => {
    setOrigin(window.location.origin);

    // Show what happened on the way back from Google, then clean the URL.
    const params = new URLSearchParams(window.location.search);
    const code = params.get("drive");
    if (code) {
      const msg = RETURN_MESSAGES[code] ?? RETURN_MESSAGES.error;
      toast[msg.level](msg.text);
      window.history.replaceState(null, "", "/documents");
    }
  }, []);

  async function uploadAll() {
    setSummary(null);
    const result = await uploadMany(pending, (done, total, current) =>
      setProgress(done >= total ? null : { done, total, current })
    );
    setSummary(result);
    if (result.failed.length === 0 && !result.stopped) {
      toast.success(`Uploaded ${result.uploaded} file${result.uploaded === 1 ? "" : "s"} to Drive`);
    } else if (result.failed.length > 0) {
      toast.error(`${result.failed.length} file${result.failed.length === 1 ? "" : "s"} couldn't be uploaded`);
    }
  }

  async function doDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectDriveAction();
      toast.success("Google Drive disconnected. Files already on Drive stay there.");
    } catch {
      toast.error("Couldn't disconnect. Try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  const running = progress !== null;

  // ----------------------------------------------------- not set up yet
  if (!drive.configured) {
    return (
      <Shell icon={<Cloud className="size-5" />} title="Upload to Google Drive" subtitle="Keep a copy of your documents on your own Drive, and add the link to each card.">
        <SetupSteps redirectUri={`${origin || "http://localhost:3001"}${REDIRECT_PATH}`} />
      </Shell>
    );
  }

  // ------------------------------------------------ set up, not connected
  if (!drive.connected) {
    return (
      <Shell icon={<Cloud className="size-5" />} title="Connect Google Drive" subtitle="Sign in once with Google. The app can only see the files it uploads itself — nothing else in your Drive.">
        {/* A real page load on purpose: the server answers with a redirect to Google's sign-in page. */}
        <button
          type="button"
          onClick={() => window.location.assign("/api/drive/connect")}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
        >
          <Cloud className="size-4" /> Connect Google Drive
        </button>
      </Shell>
    );
  }

  // ------------------------------------------------------------ connected
  return (
    <Shell
      icon={<Check className="size-5" />}
      tone="ok"
      title="Google Drive connected"
      subtitle={drive.email ? `Signed in as ${drive.email}. Files go to a private “Locker Documents” folder.` : "Files go to a private “Locker Documents” folder."}
      aside={
        <button
          type="button"
          onClick={doDisconnect}
          disabled={disconnecting || running}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {disconnecting ? <Loader2 className="size-3.5 animate-spin" /> : <Unplug className="size-3.5" />} Disconnect
        </button>
      }
    >
      {running ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
              <span className="truncate">
                Uploading {progress.done + 1} of {progress.total} — {progress.current.split("/").pop()}
              </span>
            </span>
            <button type="button" onClick={stop} className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline">
              Stop after this file
            </button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={uploadAll}
            disabled={pending.length === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CloudUpload className="size-4" />
            {pending.length === 0 ? "Everything is on Drive" : `Upload ${pending.length} file${pending.length === 1 ? "" : "s"} to Drive`}
          </button>
          <span className="text-xs text-muted-foreground">
            {uploadedCount} already on Drive · only files attached to a card are sent
          </span>
        </div>
      )}

      {summary && !running && (
        <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs">
          <p>
            Uploaded <b>{summary.uploaded}</b>
            {summary.already > 0 && <>, already there <b>{summary.already}</b></>}
            {summary.failed.length > 0 && <>, failed <b className="text-destructive">{summary.failed.length}</b></>}
            {summary.stopped && " — stopped early"}.
          </p>
          {summary.failed.slice(0, 5).map((f) => (
            <p key={f.path} className="mt-1 text-destructive">
              {f.path.split("/").pop()}: {f.error}
            </p>
          ))}
        </div>
      )}
    </Shell>
  );
}

function Shell({
  icon,
  title,
  subtitle,
  aside,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  aside?: React.ReactNode;
  tone?: "ok";
  children?: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-2xl border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            tone === "ok" ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : "bg-primary/12 text-primary"
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium leading-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {aside}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy");
        }
      }}
      className="inline-flex max-w-full items-center gap-2 rounded-md border bg-background px-2 py-1 font-mono text-xs transition-colors hover:bg-muted"
      title="Copy"
    >
      <span className="truncate">{text}</span>
      {copied ? <Check className="size-3.5 shrink-0 text-emerald-500" /> : <Copy className="size-3.5 shrink-0 text-muted-foreground" />}
    </button>
  );
}

function SetupSteps({ redirectUri }: { redirectUri: string }) {
  return (
    <details className="group rounded-lg border bg-background/50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium">
        One-time setup (about 5 minutes)
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <ol className="list-decimal space-y-2.5 border-t px-3 py-3 pl-8 text-sm text-muted-foreground">
        <li>
          In <b className="text-foreground">console.cloud.google.com</b>, create a project (call it Locker) and turn on the{" "}
          <b className="text-foreground">Google Drive API</b> (APIs &amp; Services → Library).
        </li>
        <li>
          Open the <b className="text-foreground">OAuth consent screen</b> (Google Auth Platform): choose <i>External</i>, fill in the app
          name and your email, add the scope <span className="font-mono text-xs text-foreground">…/auth/drive.file</span>, then{" "}
          <b className="text-foreground">Publish app</b> — otherwise Google makes you reconnect every 7 days.
        </li>
        <li>
          Credentials → <b className="text-foreground">Create OAuth client ID</b> → type <i>Web application</i>. Under Authorized redirect
          URIs add exactly:
          <div className="mt-1.5">
            <CopyBox text={redirectUri} />
          </div>
        </li>
        <li>
          Copy the client ID and secret into <span className="font-mono text-xs text-foreground">.env.local</span>:
          <pre className="mt-1.5 overflow-x-auto rounded-md border bg-background px-3 py-2 font-mono text-xs text-foreground">{`GOOGLE_CLIENT_ID=…\nGOOGLE_CLIENT_SECRET=…`}</pre>
        </li>
        <li>Restart the app (stop it, then run <span className="font-mono text-xs text-foreground">npm run dev</span>) and come back to this page.</li>
      </ol>
    </details>
  );
}
