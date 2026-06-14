import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import "./styles.css";
import { routeTree } from "./routeTree.gen";

// Browser history (not hash) so deep links like /privacy and /changelog
// look clean in the CWS listing + share well. Cloudflare Workers Static
// Assets handles the SPA fallback (wrangler.jsonc not_found_handling:
// "single-page-application") so unknown paths serve index.html.
//
// Runtime basepath detection: matches the gateway prefix when deployed
// (/apps/filemark), falls back to / for local file:// previews and vite
// dev. Beats a hardcoded PROD check because it works for offscreen
// captures + any future subpath move without code changes.
const basepath = location.pathname.startsWith("/apps/filemark")
  ? "/apps/filemark"
  : "/";
const router = createRouter({ routeTree, basepath });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
