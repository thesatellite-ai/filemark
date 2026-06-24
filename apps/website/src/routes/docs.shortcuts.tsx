import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsHeader, NextPrev, Note } from "../components/docs-ui";
import { docsHead, DOCS_PROSE } from "../lib/docs";

export const Route = createFileRoute("/docs/shortcuts")({
  head: () =>
    docsHead(
      "shortcuts",
      "Keyboard shortcuts",
      "Every Filemark keyboard shortcut, how to remap them on the options page, and why they work on any keyboard layout.",
      {
        faq: [
          {
            q: "Can I change Filemark's keyboard shortcuts?",
            a: "Yes — on the options page, click any shortcut's chord and press the combo you want. Each shortcut can also be disabled individually, and there's a global off switch.",
          },
          {
            q: "Do shortcuts work on non-US keyboards?",
            a: "Yes. Bindings use the physical key position (KeyboardEvent.code), so they work on AZERTY, Dvorak, Turkish-Q, and other layouts without AltGr gymnastics.",
          },
        ],
      },
    ),
  component: Shortcuts,
});

const SHORTCUTS: { action: string; keys: string; note?: string }[] = [
  { action: "Search across files", keys: "⌘K" },
  { action: "Tasks panel", keys: "⌘T" },
  { action: "Toggle sidebar", keys: "⌘B" },
  { action: "Toggle table of contents", keys: "\\" },
  { action: "Reading mode", keys: "⇧F" },
  { action: "Fullscreen", keys: "F" },
  { action: "Rendered ↔ raw source", keys: "R" },
  { action: "Next tab", keys: "]" },
  { action: "Previous tab", keys: "[" },
  { action: "Close tab", keys: "X" },
  { action: "Jump to tab 1–9", keys: "1 – 9", note: "range-bound (not remappable)" },
  { action: "Focus folder filter", keys: "/" },
  { action: "Close overlays / exit", keys: "Esc" },
];

function Shortcuts(): React.ReactElement {
  return (
    <article className={DOCS_PROSE}>
      <DocsHeader
        kicker="Reference"
        title="Keyboard shortcuts"
        intro="Defaults below. Bare-key shortcuts are ignored while you're typing in a search or filter box, so they never get in the way."
      />

      <div className="my-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-[14px]">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2 font-semibold">Action</th>
              <th className="px-4 py-2 font-semibold">Shortcut</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.action} className="border-t border-border">
                <td className="px-4 py-2">
                  {s.action}
                  {s.note && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({s.note})
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <kbd>{s.keys}</kbd>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Remapping</h2>
      <p>
        On the <Link to="/docs/settings">options page</Link> → Shortcuts, click
        any chord and press the keys you want. Each shortcut has its own
        on/off toggle and a reset, plus a master switch to disable all of them if
        they clash with another tool.
      </p>

      <Note tone="info" title="Layout-independent by design">
        Shortcuts match the physical key position, not the printed character, so
        the same keys work across keyboard layouts. Chrome reserves every
        Ctrl/⌘/Alt + tab combination, which is why tab navigation lives on bare
        keys (<kbd>]</kbd> / <kbd>[</kbd> / <kbd>1</kbd>–<kbd>9</kbd>).
      </Note>

      <NextPrev
        prev={{ to: "/docs/settings", label: "Settings & permissions" }}
        next={{ to: "/docs/troubleshooting", label: "Troubleshooting" }}
      />
    </article>
  );
}
