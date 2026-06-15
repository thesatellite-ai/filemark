// Content-script build. Produces two things:
//   • dist/bootstrap.js   — tiny classic script, injected by the service
//                           worker via chrome.scripting.executeScript. Its
//                           only job is to dynamic-import content/main.js
//                           from a chrome-extension:// URL.
//   • dist/content/main.js + dist/content/assets/* — the real injection
//                           code split into ES module chunks (shiki,
//                           mermaid, katex, db-schema-toolkit each lazy-
//                           loaded only when the file actually needs them).
//
// Why two separate builds: chrome.scripting.executeScript can only inject
// classic scripts, and only files small enough to pass Chrome's loader
// check (~5MB). Our full renderer set is ~11MB minified, so we must split.
// The standalone-viewer build (vite.config.ts) already code-splits the same
// renderers — we follow the same pattern here.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const isBootstrap = mode === "bootstrap";

  if (isBootstrap) {
    return {
      base: "",
      publicDir: false,
      build: {
        outDir: "dist",
        emptyOutDir: false,
        minify: true,
        rollupOptions: {
          input: path.resolve(__dirname, "src/content/bootstrap.ts"),
          output: {
            format: "iife",
            entryFileNames: "bootstrap.js",
            inlineDynamicImports: true,
          },
        },
      },
    };
  }

  // main bundle — ES modules with code splitting
  return {
    plugins: [react(), tailwindcss()],
    base: "",
    publicDir: false,
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    build: {
      outDir: "dist/content",
      emptyOutDir: true,
      minify: true,
      cssCodeSplit: false,
      rollupOptions: {
        input: path.resolve(__dirname, "src/content/main.tsx"),
        output: {
          format: "es",
          entryFileNames: "main.js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },
  };
});
