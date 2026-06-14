import chokidar, { type FSWatcher } from "chokidar";
import type { WebContents } from "electron";

// One watcher per project root. Debounced so a burst of editor saves
// emits a single renderer reload. Sends the changed absolute path; the
// renderer reloads it only if it's the active file.
const watchers = new Map<string, FSWatcher>();

export function watchProject(root: string, wc: WebContents): void {
  if (watchers.has(root)) return;
  let timer: NodeJS.Timeout | null = null;
  const pending = new Set<string>();

  const flush = (): void => {
    const paths = [...pending];
    pending.clear();
    if (!wc.isDestroyed()) wc.send("project:files-changed", paths);
  };

  const w = chokidar.watch(root, {
    ignoreInitial: true,
    ignored: (p) => /(^|[\\/])(node_modules|\.git|dist|build|out)([\\/]|$)/.test(p),
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
  });
  const onChange = (p: string): void => {
    pending.add(p);
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 200);
  };
  w.on("add", onChange).on("change", onChange).on("unlink", onChange);
  watchers.set(root, w);
}

export async function unwatchAll(): Promise<void> {
  await Promise.all([...watchers.values()].map((w) => w.close()));
  watchers.clear();
}
