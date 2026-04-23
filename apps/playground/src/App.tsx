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
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-[15px] font-semibold tracking-tight">
                Filemark
              </span>
              <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                playground
              </span>
            </div>
            <nav className="ml-2 inline-flex items-center rounded-full border border-border bg-background p-0.5 text-[11.5px]">
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
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/thesatellite-ai/filemark"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
            >
              GitHub
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
        <footer className="shrink-0 border-t border-border bg-muted/40 px-4 py-1.5 text-[11px] text-muted-foreground">
          <span>
            Filemark playground · MIT · {year} · Local-first · No tracking · See
            extension at{" "}
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
