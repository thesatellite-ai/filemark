import { useEffect } from "react";
import { ThemeProvider } from "@filemark/core";
import { useLibrary } from "./store";
import { useSettings } from "./settings";
import { Shell } from "./shell/Shell";
import { ComponentsDemo } from "./shell/ComponentsDemo";
import { pickupIntercept } from "./intercept";
import { trySilentRestore } from "./fs";
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

  const showDemo =
    typeof window !== "undefined" &&
    new URLSearchParams(location.search).get("demo") === "components";

  return (
    <ThemeProvider value={theme} onChange={(t) => setTheme(t)}>
      {showDemo ? <ComponentsDemo /> : <Shell />}
    </ThemeProvider>
  );
}
