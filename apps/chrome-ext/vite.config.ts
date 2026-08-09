import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { WebSocketServer } from "ws";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function extensionReload(): Plugin {
  let wss: InstanceType<typeof WebSocketServer> | null = null;
  const isWatch = process.argv.includes("--watch");

  return {
    name: "extension-reload",
    buildStart() {
      if (!isWatch || wss) return;
      try {
        wss = new WebSocketServer({ port: 8791 });
        wss.on("error", () => {});
        console.log("Extension reload server on ws://localhost:8791");
      } catch {
        /* another instance running */
      }
    },
    closeBundle() {
      if (!wss) return;
      for (const client of wss.clients) client.send("reload");
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), extensionReload()],
  base: "",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    // Disable <link rel="modulepreload"> injection. On a chrome-extension:// page
    // Vite's preload hints carry `crossorigin`, which Chrome treats as a different
    // "world" than the actual module fetch — so it discards each preload as an
    // unused "cross-world extension resource mismatch" (console noise, no function
    // lost). Turning preload off removes the hints entirely; chunks still load on
    // import, and the cost is nil for local (on-disk) extension assets.
    modulePreload: false,
    rollupOptions: {
      input: {
        app: "src/app/index.html",
        options: "src/options/index.html",
        welcome: "src/welcome/index.html",
        popup: "src/popup/index.html",
        "service-worker": "src/background/service-worker.ts",
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "service-worker") return "service-worker.js";
          return "assets/[name]-[hash].js";
        },
      },
    },
  },
});
