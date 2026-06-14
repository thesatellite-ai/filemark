import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Production assets serve under khanakia.com/apps/filemark/ via the
// edge gateway (which forwards the path UNCHANGED). Dev uses '/' so
// `pnpm dev` works at http://localhost:5173. See Taskfile build:cf and
// the khanakia_com_cfare_gateway README for the full routing chain.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/apps/filemark/" : "/",
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
}));
