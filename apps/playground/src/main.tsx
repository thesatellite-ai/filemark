// Filemark-wide styles shipped with @filemark/mdx (chip + prose + table
// + callout + TOC + mermaid/schema chrome).
import "@filemark/mdx/styles.css";
// KaTeX stylesheet — needed for math rendering AND for hiding the
// MathML annotation span. Without it the LaTeX source text bleeds into
// the rendered formula in mindmaps and inline math blocks alike.
import "katex/dist/katex.min.css";
import "./styles.css";
// Sample themes — demonstrate the theming contract.
import "../../../examples/themes/neon.css";
import "../../../examples/themes/solarized.css";
import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing from index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
