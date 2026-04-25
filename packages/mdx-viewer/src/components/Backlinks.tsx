import { createContext, useContext, type ReactNode } from "react";

// Inline SVG arrow — keeps @filemark/mdx free of lucide-react so it
// stays drop-in for hosts that don't ship icon packs.
function CornerDownLeftIcon(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polyline points="9 10 4 15 9 20" />
      <path d="M20 4v7a4 4 0 0 1-4 4H4" />
    </svg>
  );
}

/**
 * Backlinks component — renders inbound `[[wikilink]]` references to
 * the doc the user is currently viewing.
 *
 *     <Backlinks />
 *     <Backlinks title="Referenced from" empty="No inbound links yet." />
 *
 * Data is supplied via `BacklinksProvider` from the host (chrome-ext or
 * any consumer that maintains a cross-file link index — see the
 * `useLinkIndex` store on chrome-ext).
 */

export interface Backlink {
  /** Source file id — pass to onNavigate to jump there. */
  fromFileId: string;
  fromFileName: string;
  fromFilePath: string;
  /** First line in the source file where the link appears. */
  line: number;
  /** Anchor text after `|` in `[[Target|anchor]]`, when present. */
  display: string | null;
}

export interface BacklinksValue {
  links: Backlink[];
  /** Host-provided callback that opens a file at a given line. */
  onOpen?: (fromFileId: string, line: number) => void;
}

const Ctx = createContext<BacklinksValue>({ links: [] });

export function BacklinksProvider({
  value,
  children,
}: {
  value: BacklinksValue;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBacklinks(): BacklinksValue {
  return useContext(Ctx);
}

export function Backlinks(props: Record<string, unknown>) {
  const { links, onOpen } = useBacklinks();
  const title = asString(props.title) || "Linked from";
  const emptyMsg = asString(props.empty) || "No inbound links.";

  return (
    <section className="bg-muted/30 my-6 rounded-lg border p-4">
      <header className="text-muted-foreground mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        <CornerDownLeftIcon className="size-3" />
        {title}
        {links.length > 0 && (
          <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] tabular-nums">
            {links.length}
          </span>
        )}
      </header>
      {links.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">{emptyMsg}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {links.map((l, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onOpen?.(l.fromFileId, l.line)}
                className="hover:bg-accent group/bl flex w-full items-baseline gap-2 rounded px-2 py-1.5 text-left text-[13px] transition-colors"
              >
                <span className="text-foreground group-hover/bl:underline truncate font-medium">
                  {l.fromFileName}
                </span>
                <span className="text-muted-foreground truncate font-mono text-[10px]">
                  {l.fromFilePath}
                </span>
                <span className="text-muted-foreground ml-auto shrink-0 tabular-nums text-[10px]">
                  L{l.line}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
