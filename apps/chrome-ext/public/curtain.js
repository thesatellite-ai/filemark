// Filemark — raw-content-flash "curtain" (classic content script, run_at document_start).
//
// Problem: opening a file:// .md paints the RAW markdown first, then the
// service worker (reactively, on tabs.onUpdated) injects bootstrap.js →
// content/main.js, which wipes the body and mounts the viewer. The gap = a
// flash of raw text. This script runs BEFORE first paint and hides the page +
// shows a spinner, so the raw content never shows. content/main.js reveals it
// once the viewer has mounted; a safety timeout reveals it otherwise.
//
// Plain hand-written JS on purpose: it ships verbatim from public/ → dist/ (no
// bundling), so it's guaranteed classic + tiny + dependency-free, and runs at
// document_start with no import latency.
//
// NOTE: the format list MUST mirror INJECT_FORMATS in background/service-worker.ts
// and ALL_INJECT_FORMATS in content/main.tsx. If you add an inject format there,
// add it here too, or that type will flash on file:// open.
(function () {
  "use strict";

  var INJECT_FORMATS = [
    "md",
    "mdx",
    "markdown",
    "json",
    "jsonc",
    "sql",
    "prisma",
    "dbml",
  ];

  var STYLE_ID = "fv-curtain-style";
  var OVERLAY_ID = "fv-curtain-overlay";
  // Generous backstop: only fires if content/main.js never reveals (format
  // disabled, per-site excluded, or a genuine failure). Must exceed a cold
  // mount (SW inject + dynamic import + fetch + React) so it never reveals
  // early and cause a double flash. Reveal-on-mount handles the common case.
  var SAFETY_MS = 4000;

  // Only curtain file types we actually take over. `location.pathname` is
  // available at document_start.
  var path = (location.pathname || "").toLowerCase();
  var dot = path.lastIndexOf(".");
  var ext = dot >= 0 ? path.slice(dot + 1) : "";
  if (INJECT_FORMATS.indexOf(ext) === -1) return;

  var root = document.documentElement;
  if (!root) return;
  // Guard against double-run (SPA-ish re-entry / multiple frames).
  if (document.getElementById(STYLE_ID)) return;

  // Hide the document BODY content (the raw text) — not <html>, so our overlay
  // (a child of <html>, outside <body>) stays visible. `visibility` keeps
  // layout/scroll intact and applies the moment <body> exists. Overlay colors
  // follow the OS scheme (we don't know the filemark theme this early; it's an
  // async storage read, and this is only a brief loading state).
  var style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent =
    "body{visibility:hidden!important}" +
    "#" +
    OVERLAY_ID +
    "{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;" +
    "justify-content:center;background:#ffffff;visibility:visible}" +
    "#" +
    OVERLAY_ID +
    " .fv-curtain-spin{width:26px;height:26px;border-radius:50%;" +
    "border:3px solid rgba(0,0,0,.15);border-top-color:rgba(0,0,0,.55);" +
    "animation:fv-curtain-rot .7s linear infinite}" +
    "@keyframes fv-curtain-rot{to{transform:rotate(360deg)}}" +
    "@media (prefers-color-scheme:dark){#" +
    OVERLAY_ID +
    "{background:#0d1117}#" +
    OVERLAY_ID +
    " .fv-curtain-spin{border-color:rgba(255,255,255,.18);" +
    "border-top-color:rgba(255,255,255,.65)}}";
  root.appendChild(style);

  var overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  var spin = document.createElement("div");
  spin.className = "fv-curtain-spin";
  overlay.appendChild(spin);
  root.appendChild(overlay);

  // Idempotent reveal — content/main.js calls window.__fvRevealCurtain() (or
  // removes the elements by id directly); the safety timeout calls it too.
  function reveal() {
    var s = document.getElementById(STYLE_ID);
    if (s) s.remove();
    var o = document.getElementById(OVERLAY_ID);
    if (o) o.remove();
  }
  window.__fvRevealCurtain = reveal;

  // Reveal the instant the service worker decides NOT to take this page over
  // (per-site excluded, inject failed, …). Without this, a skipped page would
  // stay hidden until the safety timeout — so this is what keeps skips flash-
  // free rather than blank-then-raw. The takeover path reveals via
  // content/main.js on mount instead.
  try {
    chrome.runtime.onMessage.addListener(function (msg) {
      if (msg === "fv-reveal" || (msg && msg.type === "fv-reveal")) reveal();
    });
  } catch (e) {
    /* chrome.runtime unavailable — the safety timeout still covers us */
  }

  // Last-resort backstop only — every real outcome (mount, or SW skip signal)
  // reveals well before this. Guards against a genuine crash leaving the page
  // stuck hidden.
  setTimeout(reveal, SAFETY_MS);
})();
