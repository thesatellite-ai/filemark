// Offscreen render of the built renderer → PNG, so the UI can be
// visually verified without a display. Run: electron scripts/shot.cjs
const { app, BrowserWindow } = require("electron");
const { join } = require("node:path");
const { writeFileSync } = require("node:fs");

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    show: false,
    webPreferences: {
      offscreen: true,
      preload: join(__dirname, "shot-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  // Offscreen needs a paint listener to drive the compositor.
  win.webContents.on("paint", () => {});
  win.webContents.setFrameRate(10);

  const theme = process.argv.includes("--dark") ? "dark" : "light";
  await win.loadFile(join(__dirname, "../out/renderer/index.html"));
  await win.webContents.executeJavaScript(
    `document.documentElement.setAttribute('data-theme','${theme}')`,
  );
  await new Promise((r) => setTimeout(r, 3500));
  if (process.argv.includes("--open-theme")) {
    await win.webContents.executeJavaScript(
      `document.querySelector('button[title="Appearance"]')?.click()`,
    );
    await new Promise((r) => setTimeout(r, 800));
  }
  if (process.argv.includes("--open-settings")) {
    await win.webContents.executeJavaScript(
      `document.querySelector('button[title="Settings"]')?.click()`,
    );
    await new Promise((r) => setTimeout(r, 800));
  }
  const img = await win.webContents.capturePage();
  const suffix = process.argv.includes("--open-theme")
    ? "-popover"
    : process.argv.includes("--open-settings")
      ? "-settings"
      : "";
  const out = `/tmp/desk-shot-${theme}${suffix}.png`;
  writeFileSync(out, img.toPNG());
  console.log("SHOT_WROTE " + out + " bytes=" + img.toPNG().length);
  app.quit();
});

app.on("window-all-closed", () => app.quit());
setTimeout(() => app.quit(), 15000); // hard safety exit
