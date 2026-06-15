// Offscreen-render the chrome-ext UI with a sample doc preloaded, save
// PNG at 1280×800 to ../screenshots/. Mints a #fv-inline=<b64> payload
// per the extension's intercept format so no real chrome.storage round
// trip is needed. The shim-chrome preload stubs the chrome.* surface so
// the React app boots without throwing.
//
// Usage:
//   electron shot.cjs --doc=1-hero.md
//   electron shot.cjs --doc=2-schema.sql --out=2-schema --ext=sql --filename=schema.sql

const { app, BrowserWindow } = require("electron");
const { readFileSync, writeFileSync } = require("node:fs");
const { join, basename, extname } = require("node:path");

app.disableHardwareAcceleration();

const HERE = __dirname;
const REPO = join(HERE, "..", "..", "..", "..");
const EXT_INDEX = join(REPO, "apps", "chrome-ext", "dist", "src", "app", "index.html");
const DOCS_DIR = join(HERE, "..", "docs");
const OUT_DIR = join(HERE, "..", "screenshots");

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const eq = a.indexOf("=");
      return eq < 0 ? [a.slice(2), "true"] : [a.slice(2, eq), a.slice(eq + 1)];
    }),
);

if (!args.doc) {
  console.error("usage: electron shot.cjs --doc=<filename-in-docs/>");
  process.exit(1);
}
const docPath = join(DOCS_DIR, args.doc);
const docName = args.filename || basename(args.doc);
const outName = (args.out || basename(args.doc, extname(args.doc))) + ".png";
const outPath = join(OUT_DIR, outName);

const content = readFileSync(docPath, "utf8");
const payload = Buffer.from(
  JSON.stringify({
    url: `file:///${docName}`,
    content,
  }),
  "utf8",
).toString("base64");
const url = `file://${EXT_INDEX}#fv-inline=${payload}`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      offscreen: true,
      sandbox: false,
      contextIsolation: false,
      nodeIntegration: false,
      preload: join(HERE, "shim-chrome.cjs"),
    },
  });
  win.webContents.on("paint", () => {});
  win.webContents.setFrameRate(10);
  win.webContents.on("console-message", (_e, level, msg, line, src) => {
    if (level >= 2)
      console.log(`[r${level}] ${msg.slice(0, 240)} (${src.split("/").pop()}:${line})`);
  });
  console.log("loading…", url.slice(0, 110), "…");
  await win.loadURL(url);
  // Wait for React mount + viewer dynamic imports + shiki + (for SQL)
  // db-schema-toolkit to download + paint. 8s is comfortable for all five.
  await new Promise((r) => setTimeout(r, 8000));
  const raw = await win.webContents.capturePage();
  // Capture comes out at device-pixel-ratio scale (often 2x). CWS requires
  // exactly 1280x800 — downscale to match.
  const img = raw.getSize().width === 1280 ? raw : raw.resize({ width: 1280, height: 800 });
  writeFileSync(outPath, img.toPNG());
  const kb = (img.toPNG().length / 1024).toFixed(1);
  console.log(`SHOT_WROTE ${outPath} (${kb} KB)`);
  app.quit();
});
app.on("window-all-closed", () => app.quit());
setTimeout(() => app.quit(), 25000);
