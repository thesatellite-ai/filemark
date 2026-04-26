import { useEffect } from "react";
import { ThemeProvider } from "@filemark/core";
import { useLibrary } from "./store";
import { useSettings } from "./settings";
import { Shell } from "./shell/Shell";
import { ComponentsDemo } from "./shell/ComponentsDemo";
import { pickupIntercept } from "./intercept";
import {
  trySilentRestore,
  loadLooseFileHandle,
  queryPermissionState,
} from "./fs";
import { sessionHandles } from "./sessionHandles";

export default function App() {
  const hydrate = useLibrary((s) => s.hydrate);
  const hydrateSettings = useSettings((s) => s.hydrate);
  const theme = useLibrary((s) => s.theme);
  const setTheme = useLibrary((s) => s.setTheme);
  const addFiles = useLibrary((s) => s.addFiles);
  const setActive = useLibrary((s) => s.setActive);

  useEffect(() => {
    (async () => {
      await Promise.all([hydrate(), hydrateSettings()]);

      // Silent FSA permission recovery: if Chrome still considers the
      // previously granted dir handles as "granted" (common for chrome-extension
      // origins across reloads), walk and register handles without forcing the
      // user to click "Reconnect".
      const folders = Object.values(useLibrary.getState().folders);
      await Promise.all(
        folders.map(async (folder) => {
          const restored = await trySilentRestore(folder);
          if (restored) {
            sessionHandles.register(
              folder.id,
              restored.handle,
              restored.fileHandles
            );
          }
        })
      );

      // Same silent restore for loose single-file drops. Handle was persisted
      // to IDB at drop time; if Chrome still reports permission as "granted"
      // we re-register without a user gesture so the Viewer reads live bytes.
      const looseFiles = Object.values(useLibrary.getState().files).filter(
        (f) => !f.folderId
      );
      await Promise.all(
        looseFiles.map(async (f) => {
          try {
            const handle = await loadLooseFileHandle(f.id);
            if (!handle) return;
            const state = await queryPermissionState(handle, "read");
            if (state !== "granted") return;
            sessionHandles.registerLoose(f.id, handle);
          } catch {
            /* per-file failure shouldn't block others */
          }
        })
      );

      // Nudge subscribers (Sidebar, Viewer) to re-check sessionHandles.
      useLibrary.setState((s) => ({ sessionRev: s.sessionRev + 1 }));

      // After hydration, check if the content script redirected us here with
      // a captured file:// markdown file. If so, materialize it as a file in
      // the library and activate it immediately.
      const intercepted = await pickupIntercept();
      if (intercepted) {
        await addFiles([intercepted]);
        await setActive(intercepted.id);
      }
    })();
  }, [hydrate, hydrateSettings, addFiles, setActive]);

  // Dev auto-reload
  useEffect(() => {
    if (import.meta.env.MODE !== "development") return;
    const ws = new WebSocket("ws://localhost:8791");
    ws.onmessage = (e) => {
      if (e.data === "reload") location.reload();
    };
    return () => ws.close();
  }, []);

  // Re-walk every FSA folder on disk so files added / removed outside
  // the extension show up without a manual reload. Three triggers:
  //   1) tab regains focus (cheap — walkDirectory just re-traverses
  //      the in-memory directory handle)
  //   2) tab becomes visible (visibilitychange)
  //   3) auto-refresh interval (when the user has toggled it on in
  //      the TopBar, same cadence as the file-content polling). Only
  //      runs while there's at least one FSA folder in the library.
  const autoRefresh = useLibrary((s) => s.autoRefresh);
  const autoRefreshMs = useLibrary((s) => s.autoRefreshMs);
  useEffect(() => {
    const rescanAll = async () => {
      const folders = useLibrary.getState().folders;
      const fsaFolders = Object.values(folders).filter(
        (f) => f.kind === "fsa",
      );
      if (!fsaFolders.length) return;
      const rescan = useLibrary.getState().rescanFolder;
      for (const f of fsaFolders) {
        try {
          await rescan(f.id);
        } catch {
          /* one folder failing shouldn't block the rest */
        }
      }
    };

    const onFocus = () => void rescanAll();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void rescanAll();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    let interval: number | null = null;
    if (autoRefresh) {
      interval = window.setInterval(
        () => void rescanAll(),
        Math.max(500, autoRefreshMs),
      );
    }

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      if (interval !== null) window.clearInterval(interval);
    };
  }, [autoRefresh, autoRefreshMs]);

  const showDemo =
    typeof window !== "undefined" &&
    new URLSearchParams(location.search).get("demo") === "components";

  return (
    <ThemeProvider value={theme} onChange={(t) => setTheme(t)}>
      {showDemo ? <ComponentsDemo /> : <Shell />}
    </ThemeProvider>
  );
}
