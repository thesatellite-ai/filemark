import { useCallback, useEffect, useState } from "react";
import {
  Check,
  FileText,
  Globe,
  FolderOpen,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isFileAccessAllowed,
  isRemoteAllowed,
  requestRemote,
  openExtensionDetails,
  openApp,
} from "@/lib/permissions";

/**
 * First-run welcome / setup page (opened by the service worker on install).
 * Instant-win path on top, then the two opt-in permission gates with a
 * colored status pill, a plain-language "why", and live status.
 */

function useGateStatus() {
  const [file, setFile] = useState<boolean | null>(null);
  const [remote, setRemote] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    void isFileAccessAllowed().then(setFile);
    void isRemoteAllowed().then(setRemote);
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    chrome.permissions.onAdded.addListener(refresh);
    chrome.permissions.onRemoved.addListener(refresh);
    const t = window.setInterval(refresh, 2000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
      chrome.permissions.onAdded.removeListener(refresh);
      chrome.permissions.onRemoved.removeListener(refresh);
      window.clearInterval(t);
    };
  }, [refresh]);

  return { file, remote };
}

function StatusPill({ on }: { on: boolean | null }) {
  if (on === null) {
    return (
      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
        …
      </span>
    );
  }
  return on ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      <Check className="size-3" /> Granted
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
      Not granted
    </span>
  );
}

export function WelcomeApp() {
  const { file, remote } = useGateStatus();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme = mq.matches ? "dark" : "light");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const allDone = file === true && remote === true;

  return (
    <div className="bg-background text-foreground min-h-screen w-full">
      <div className="mx-auto max-w-lg px-6 py-10">
        {/* Hero */}
        <header className="mb-6">
          <div className="bg-primary/10 text-primary mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
            <FileText className="size-3.5" /> Filemark installed
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ready to read beautiful files in your browser
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            Markdown, MDX, JSON, CSV, and database schemas with real interactive
            rendering — 100% on your machine, nothing uploaded.
          </p>
        </header>

        {/* Instant-win path */}
        <section className="border-border bg-card mb-5 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Try it now — no setup</h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Open the app, then drag a file in or pick a folder. Works with
                zero permissions.
              </p>
            </div>
            <Button
              size="sm"
              className="h-7 shrink-0 text-xs"
              onClick={openApp}
            >
              <FolderOpen className="size-3.5" /> Open
            </Button>
          </div>
        </section>

        {/* Gates */}
        <h2 className="mb-1 text-sm font-semibold">Open files directly by URL</h2>
        <p className="text-muted-foreground mb-3 text-sm">
          Chrome keeps both of these off until you opt in. Status updates live.
        </p>

        <div className="space-y-3">
          {/* File access */}
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-medium">
                <FileText className="text-muted-foreground size-4" /> Local files
                <code className="text-muted-foreground text-xs">file://</code>
              </div>
              <StatusPill on={file} />
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              <strong className="text-foreground">Why:</strong> Chrome blocks
              extensions from reading files on your disk unless you allow it. With
              it on, opening a local <code className="text-xs">.md</code> link
              renders it instantly; without it the link shows as raw text.
            </p>
            {file !== true && (
              <div className="mt-3 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={openExtensionDetails}
                >
                  <ExternalLink className="size-3.5" /> Open settings
                </Button>
                <span className="text-muted-foreground text-sm">
                  Turn on{" "}
                  <strong className="text-foreground">
                    Allow access to file URLs
                  </strong>
                  , then return here.
                </span>
              </div>
            )}
          </div>

          {/* Remote access */}
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-medium">
                <Globe className="text-muted-foreground size-4" /> Remote URLs
                <code className="text-muted-foreground text-xs">https://</code>
              </div>
              <StatusPill on={remote} />
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              <strong className="text-foreground">Why:</strong> reading files
              hosted on the web needs site access. With it on, raw GitHub / gist{" "}
              <code className="text-xs">.md</code> links render automatically;
              without it they show as raw text. Your browsing is never sent
              anywhere — verify in DevTools → Network.
            </p>
            {remote !== true && (
              <div className="mt-3 flex items-center gap-3">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => void requestRemote()}
                >
                  <Globe className="size-3.5" /> Enable
                </Button>
                <span className="text-muted-foreground text-sm">
                  Chrome asks once to confirm.
                </span>
              </div>
            )}
          </div>
        </div>

        {allDone && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <Check className="size-4" /> All set — open any supported file and
            Filemark takes over.
            <button
              className="ml-auto inline-flex items-center gap-1 underline-offset-4 hover:underline"
              onClick={openApp}
            >
              Open app <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}

        <footer className="text-muted-foreground mt-8 text-center text-xs">
          Change these anytime from the Filemark options page.
        </footer>
      </div>
    </div>
  );
}
