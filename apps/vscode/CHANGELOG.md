# Changelog

All notable changes to the Filemark VS Code extension are documented here. This project adheres to [Semantic Versioning](https://semver.org/).

## 0.1.1 — 2026-08-09

### Added

- **Command palette** — `Filemark: Open Settings`, `Zoom In` / `Zoom Out` / `Reset Zoom`, `Toggle Scroll Sync`, `Reload Preview`, `Open Documentation`, and `Report an Issue`, all grouped under the Filemark category.
- **Boot loader** — a centered spinner shows the instant a preview opens, continuously from bundle-load through first render, so it's clear the preview is loading.

### Fixed

- **Open Preview to the Side now always works** — when a preview was already open, the command re-revealed it in place instead of moving it beside the editor. It now honors the requested column.
- **No per-line background band in code blocks** — the host's default `code` background was leaking onto highlighted lines; the shiki subtree is now fully transparent.
- **No plain-then-coloured flash** — code blocks paint highlighted on first frame when the grammar is warm; the plain fallback no longer shows a stray inline-code background.
- **GitHub preview mode** — seamless full-width canvas (no floating box), and the exact github.com body font stack (`Mona Sans VF`).

### Changed

- **Side-preview shortcut** is `Cmd/Ctrl+Alt+V` (the earlier `Cmd+K V` chord was unreliable).

## 0.1.0 — 2026-08-08

First release.

### Added

- **Live Markdown preview** — the full filemark renderer (callouts, charts, kanban, tasks, mermaid, math, and more) in a webview that updates as you type.
- **Open to the side** — `Cmd/Ctrl+Alt+V` (or the split icon) opens the preview beside the editor; `Cmd/Ctrl+Shift+V` opens it in the same pane.
- **Two-way scroll sync** — editor and preview follow each other, line-anchored to the block you're on. Toggle with `filemark.scrollSync`.
- **Double-click to jump** — double-click a preview block to move the editor's cursor to its source line.
- **Scroll memory** — the preview restores its scroll position per file.
- **Zoom** — `Cmd/Ctrl` `+` / `-` / `0` or the toolbar controls; persists across files.
- **GitHub preview mode** — toggle between the filemark render and a GitHub-flavored approximation; scroll sync and jump work in both.
- **Interactive tasks** — clicking a task checkbox in the preview edits the source file (`- [ ]` ↔ `- [x]`).
- **Open in browser** — open the current file as `file://…` in Chrome.
- **Workspace task tree** — an activity-bar view of every task across the workspace's Markdown files.
- **Native editor integration** — Outline / breadcrumbs / Go-to-Symbol, folding, `[[wikilink]]` navigation, and a status-bar reading-time / word-count / task-progress readout.
- **Appearance settings** — theme (incl. `auto`), font family, font size, line height, content width, and custom CSS, applied live.
