// Offscreen-render promo-tile.html at exactly 440×280 → ../promo-tile.png
// CWS small promo tile required dimensions.

const { app, BrowserWindow } = require("electron");
const { writeFileSync } = require("node:fs");
const { join } = require("node:path");

app.disableHardwareAcceleration();

const HERE = __dirname;
const INPUT = join(HERE, "promo-tile.html");
const OUT = join(HERE, "..", "promo-tile.png");

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 440,
    height: 280,
    show: false,
    useContentSize: true,
    webPreferences: {
      offscreen: true,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.webContents.on("paint", () => {});
  win.webContents.setFrameRate(10);
  await win.loadFile(INPUT);
  await new Promise((r) => setTimeout(r, 1500));
  const img = await win.webContents.capturePage();
  // The capture comes out at the device-pixel-ratio scale; resize to
  // exactly 440×280 (the CWS-required dimensions).
  const resized = img.resize({ width: 440, height: 280 });
  writeFileSync(OUT, resized.toPNG());
  const kb = (resized.toPNG().length / 1024).toFixed(1);
  console.log(`PROMO_WROTE ${OUT} (${kb} KB)`);
  app.quit();
});
app.on("window-all-closed", () => app.quit());
setTimeout(() => app.quit(), 8000);
