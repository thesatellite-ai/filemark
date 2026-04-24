// Filemark-wide styles shipped with @filemark/mdx (chip + prose + table
// + callout + TOC + mermaid/schema chrome). See docsi/THEMING.md for
// the architecture + token catalog.
import "@filemark/mdx/styles.css";
import "./styles.css";
// Sample themes — demonstrate the theming contract (docsi/THEMING.md).
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
