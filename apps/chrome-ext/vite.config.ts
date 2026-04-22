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
    rollupOptions: {
      input: {
        app: "src/app/index.html",
        options: "src/options/index.html",
        "service-worker": "src/background/service-worker.ts",
        content: "src/content/handler.ts",
      },
      output: {
        entryFileNames: (chunk) => {
          // Service worker and content script must be at fixed paths
          // (referenced by manifest.json) — no content hash.
          if (chunk.name === "service-worker") return "service-worker.js";
          if (chunk.name === "content") return "content.js";
          return "assets/[name]-[hash].js";
        },
      },
    },
  },
});
