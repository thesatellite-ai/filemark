// Webview bundle build. Produces dist/webview/main.js (fixed name, referenced by
// the host via asWebviewUri) plus on-demand chunks for the heavy lazy libraries
// (mermaid ~big, shiki language grammars, katex, markmap). Those are dynamically
// imported by the viewer packages, so code-splitting keeps them OUT of the
// initial bundle — a doc only pays for a diagram/highlighter/math when it uses
// one.
//
// Why this works in a webview (the old comment said it couldn't): ESM
// chunk-to-chunk imports are RELATIVE specifiers resolved at runtime against the
// importing module's own URL — i.e. the per-session webview URI — so no
// build-time base is needed. Chunks land next to main.js under dist/webview,
// which is already in the panel's localResourceRoots. The one requirement is a
// CSP that lets the nonce'd entry pull them in: `script-src 'nonce-…'
// 'strict-dynamic'` (see buildHtml in extension.ts).
//
// cssCodeSplit stays off so all static CSS (tailwind, mdx styles, katex, github)
// ships as the single main.css the host links; the lazy libs inject their own
// styles at runtime via JS, not CSS files.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "",
  build: {
    outDir: "dist/webview",
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: true,
    rollupOptions: {
      input: path.resolve(__dirname, "src/webview/main.tsx"),
      output: {
        format: "es",
        entryFileNames: "main.js",
        // Lazy chunks sit alongside main.js so relative imports resolve under
        // dist/webview (in localResourceRoots).
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: "main.[ext]",
      },
    },
  },
});
