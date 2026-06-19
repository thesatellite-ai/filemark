import { useCallback, useEffect, useState } from "react";
import { FileText, Globe, ExternalLink, FolderOpen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isFileAccessAllowed,
  isRemoteAllowed,
  requestRemote,
  openExtensionDetails,
  openApp,
} from "@/lib/permissions";

/**
 * Setup popup. Attached to the action ONLY while setup is incomplete (a gate
 * off and not dismissed); once done the popup detaches and the icon opens the
 * app. Gate-driven, not tab-driven — see service-worker.ts.
 */

const SETUP_DISMISS_KEY = "fv:setupDismissed";

function StatusPill({ on }: { on: boolean | null }) {
  if (on === null) {
    return (
      <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[11px] font-medium">
        …
      </span>
    );
  }
  return on ? (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
      <Check className="size-3" /> Granted
    </span>
  ) : (
    <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
      Not granted
    </span>
  );
}

function Row({
  on,
  icon,
  title,
  why,
  children,
}: {
  on: boolean | null;
  icon: React.ReactNode;
  title: React.ReactNode;
  why: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {icon} {title}
        </div>
        <StatusPill on={on} />
      </div>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{why}</p>
      {on !== true && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function PopupApp() {
  const [file, setFile] = useState<boolean | null>(null);
  const [remote, setRemote] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    void isFileAccessAllowed().then(setFile);
    void isRemoteAllowed().then(setRemote);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    document.documentElement.dataset.theme = mq.matches ? "dark" : "light";
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    chrome.permissions.onAdded.addListener(refresh);
    chrome.permissions.onRemoved.addListener(refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      chrome.permissions.onAdded.removeListener(refresh);
      chrome.permissions.onRemoved.removeListener(refresh);
    };
  }, [refresh]);

  const dismiss = async () => {
    try {
      await chrome.storage.local.set({ [SETUP_DISMISS_KEY]: true });
      await chrome.action.setBadgeText({ text: "" });
      await chrome.action.setPopup({ popup: "" });
    } catch {
      /* ignore */
    }
    window.close();
  };

  return (
    <div className="bg-background text-foreground p-3">
      <div className="mb-2.5 flex items-center gap-1.5 px-0.5">
        <FileText className="text-primary size-4" />
        <span className="text-sm font-semibold">Filemark setup</span>
      </div>

      <div className="space-y-2">
        <Row
          on={file}
          icon={<FileText className="text-muted-foreground size-3.5" />}
          title="Local files (file://)"
          why="Chrome blocks reading files on your disk until you allow it. With it on, local .md links render instantly."
        >
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={openExtensionDetails}
          >
            <ExternalLink className="size-3.5" /> Open settings
          </Button>
          <p className="text-muted-foreground mt-1.5 text-xs">
            Turn on{" "}
            <strong className="text-foreground">Allow access to file URLs</strong>
            .
          </p>
        </Row>

        <Row
          on={remote}
          icon={<Globe className="text-muted-foreground size-3.5" />}
          title="Remote URLs (https://)"
          why="Reading web-hosted files needs site access. Until on, raw GitHub / gist .md links show as raw text."
        >
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => void requestRemote()}
          >
            <Globe className="size-3.5" /> Enable
          </Button>
          <p className="text-muted-foreground mt-1.5 text-xs">
            Chrome asks once. Your browsing is never sent anywhere.
          </p>
        </Row>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" className="h-7 flex-1 text-xs" onClick={openApp}>
          <FolderOpen className="size-3.5" /> Open Filemark
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-7 text-xs"
          onClick={() => void dismiss()}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
