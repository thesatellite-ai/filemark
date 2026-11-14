import { TriangleAlert, X } from "lucide-react";
import { useLibrary } from "../store";
import { Button } from "@/components/ui/button";

/**
 * Shown when the guarded hydrate skipped reopening the last active file
 * because it froze the tab on its previous load (see renderGuard.ts). The file
 * stays a tab; the user can retry it, close it, or just dismiss the notice.
 */
export function SkippedFileBanner() {
  const skipped = useLibrary((s) => s.skippedFile);
  const setActive = useLibrary((s) => s.setActive);
  const closeTab = useLibrary((s) => s.closeTab);
  const dismiss = useLibrary((s) => s.dismissSkipped);
  if (!skipped) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[13px]"
    >
      <TriangleAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="min-w-0 flex-1 truncate">
        Didn't reopen <span className="font-medium">{skipped.name}</span> — it
        didn't finish loading last time and may freeze the tab.
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-6"
        onClick={() => {
          dismiss();
          void setActive(skipped.id);
        }}
      >
        Open anyway
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-6"
        onClick={() => {
          dismiss();
          void closeTab(skipped.id);
        }}
      >
        Close tab
      </Button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground rounded p-0.5"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
