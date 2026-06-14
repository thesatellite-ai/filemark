import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";

// Renderer crashes otherwise = blank window. Show the error instead.
function showOverlay(msg: string): void {
  const el = document.createElement("pre");
  el.style.cssText =
    "position:fixed;inset:0;margin:0;padding:24px;z-index:99999;" +
    "background:#1a1a1a;color:#ff8585;font:13px/1.5 monospace;" +
    "white-space:pre-wrap;overflow:auto";
  el.textContent = "Renderer error:\n\n" + msg;
  document.body.appendChild(el);
}
window.addEventListener("error", (e) =>
  showOverlay(String(e.error?.stack ?? e.message)),
);
window.addEventListener("unhandledrejection", (e) =>
  showOverlay("Unhandled promise rejection:\n" + String(e.reason)),
);

try {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (err) {
  showOverlay(String((err as Error)?.stack ?? err));
}
