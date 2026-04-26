import { useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@filemark/core";
import { Gallery } from "./Gallery";
import { Playground } from "./Playground";
import { ThemeToggle } from "./ThemeToggle";
import { EXAMPLES } from "./examples";

type View = "gallery" | "playground";

function readHash(): { view: View; exampleId: string } {
  if (typeof window === "undefined") {
    return { view: "gallery", exampleId: EXAMPLES[0]!.id };
  }
  const raw = window.location.hash.replace(/^#\/?/, "");
  if (raw.startsWith("play")) {
    return { view: "playground", exampleId: EXAMPLES[0]!.id };
  }
  if (raw.startsWith("gallery/")) {
    return { view: "gallery", exampleId: raw.slice("gallery/".length) };
  }
  return { view: "gallery", exampleId: EXAMPLES[0]!.id };
}

export function App() {
  const [route, setRoute] = useState(() => readHash());
  const [userDoc, setUserDoc] = useState<
    { name: string; content: string } | null
  >(null);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const setView = (view: View) => {
    if (view === "playground") {
      window.location.hash = "#/play";
    } else {
      window.location.hash = `#/gallery/${route.exampleId}`;
    }
  };

  const setExampleId = (id: string) => {
    window.location.hash = `#/gallery/${id}`;
  };

  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <ThemeProvider>
      <div className="flex h-screen min-h-0 flex-col bg-background">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 py-2 sm:px-4">
          <div className="flex items-center gap-2 min-w-0 sm:gap-3">
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="text-[15px] font-semibold tracking-tight">
                Filemark
              </span>
              <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase hidden sm:inline">
                playground
              </span>
            </div>
            <nav className="inline-flex shrink-0 items-center rounded-full border border-border bg-background p-0.5 text-[11.5px] sm:ml-2">
              <button
                type="button"
                onClick={() => setView("gallery")}
                className={tabCls(route.view === "gallery")}
              >
                Gallery
              </button>
              <button
                type="button"
                onClick={() => setView("playground")}
                className={tabCls(route.view === "playground")}
              >
                Playground
              </button>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a
              href="https://github.com/thesatellite-ai/filemark"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              className="text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
            >
              <span className="hidden sm:inline">GitHub</span>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-5 sm:hidden"
                aria-hidden
              >
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39s1.97.13 2.89.39c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.77 1.06.77 2.14v3.18c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
              </svg>
            </a>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-hidden">
          {route.view === "gallery" ? (
            <Gallery
              initialId={route.exampleId}
              onChange={setExampleId}
              userDoc={userDoc}
              onUserDrop={setUserDoc}
            />
          ) : (
            <Playground />
          )}
        </div>
        <footer className="shrink-0 border-t border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground sm:px-4">
          <span className="block truncate">
            <span className="hidden sm:inline">
              Filemark playground · MIT · {year} · Local-first · No tracking ·
              See extension at{" "}
            </span>
            <span className="sm:hidden">Filemark · MIT · </span>
            <a
              href="https://github.com/thesatellite-ai/filemark"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              thesatellite-ai/filemark
            </a>
          </span>
        </footer>
      </div>
    </ThemeProvider>
  );
}

function tabCls(active: boolean) {
  return [
    "rounded-full px-3 py-1 font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:text-foreground",
  ].join(" ");
}
