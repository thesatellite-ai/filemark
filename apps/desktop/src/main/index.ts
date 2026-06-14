import { join } from "node:path";
import { app, BrowserWindow, shell, dialog } from "electron";
import { initDb } from "./db";
import { registerIpc } from "./ipc";

// Surface anything that would otherwise be a silent main-process crash.
process.on("uncaughtException", (err) => {
  console.error("[main] uncaughtException:", err);
  dialog.showErrorBox("Filemark — unexpected error", String(err?.stack ?? err));
});
process.on("unhandledRejection", (err) => {
  console.error("[main] unhandledRejection:", err);
});

// Security baseline (DESKTOP_PLAN.md ADR-DESK-1): renderer gets NO node
// access. contextIsolation on, nodeIntegration off, sandbox on. All
// privileged work (fs, libsql) will arrive via the preload IPC bridge in
// Phase 2 — Phase 1 only proves a workspace viewer renders in Electron.
// MUST retain a module-level reference. A BrowserWindow held only by a
// function local gets garbage-collected → the OS closes it (the classic
// "window opens then disappears" Electron bug).
let win: BrowserWindow | null = null;

function createWindow(): void {
  const mac = process.platform === "darwin";
  win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 720,
    minHeight: 520,
    show: false,
    // Native desktop chrome: hidden-inset title bar keeps the macOS
    // traffic lights but lets our React top bar own the full width;
    // vibrancy gives the translucent sidebar look behind the UI.
    // Native title bar (hidden-inset keeps macOS traffic lights) but an
    // OPAQUE window — transparent/vibrancy made it render invisible.
    titleBarStyle: mac ? "hiddenInset" : "default",
    trafficLightPosition: mac ? { x: 16, y: 18 } : undefined,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win?.show());
  win.on("closed", () => {
    win = null;
  });

  // Open external links in the OS browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  // Fallback: if ready-to-show never fires (renderer error), show anyway
  // after 3s so the user sees the window + any error overlay.
  setTimeout(() => {
    if (win && !win.isVisible()) win.show();
  }, 3000);

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  // DB + IPC must be ready before the renderer can call storage:* .
  // A libsql native-ABI mismatch (forgot `pnpm rebuild`) throws here —
  // make it a readable dialog, not a silent dead window.
  try {
    console.log("[main] initDb…");
    await initDb();
    registerIpc();
    console.log("[main] db ready");
  } catch (err) {
    console.error("[main] initDb failed:", err);
    dialog.showErrorBox(
      "Filemark — database failed to start",
      `libsql could not load. If running from source, run:\n\n  cd apps/desktop && pnpm rebuild\n\n${String(
        (err as Error)?.stack ?? err,
      )}`,
    );
  }
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
