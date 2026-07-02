import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// Filemark-wide styles shipped with @filemark/mdx (chip + prose + table
// + callout + TOC + frontmatter + mermaid/schema chrome). See
// docsi/THEMING.md for the architecture + token catalog.
import "@filemark/mdx/styles.css";
// NOTE: GitHub-preview styling (@filemark/mdx/github.css, ~220KB incl. the
// bundled font) is intentionally NOT imported here. It loads on demand the first
// time GitHub mode is shown — see app/githubCss.ts (ensureGithubCss).
import "../styles/index.css";
// Sample themes — demonstrate the theming contract (docsi/THEMING.md).
// Each file is a small html[data-theme="..."] override block. Remove
// or add your own themes freely.
import "../../../../examples/themes/neon.css";
import "../../../../examples/themes/solarized.css";
import "katex/dist/katex.min.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
