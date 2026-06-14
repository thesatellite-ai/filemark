import {
  Outlet,
  createRootRoute,
  Link,
  useRouterState,
} from "@tanstack/react-router";
import { Github, ExternalLink } from "lucide-react";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout(): React.ReactElement {
  // /demo IS the playground — it brings its own header + footer, so we
  // skip the site chrome there to give it the full viewport (otherwise
  // the editor competes with our header for vertical space).
  const path = useRouterState({ select: (s) => s.location.pathname });
  const chromeless = path === "/demo" || path.endsWith("/demo");
  if (chromeless) {
    return (
      <div className="h-full bg-background text-foreground">
        <Outlet />
      </div>
    );
  }
  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function Header(): React.ReactElement {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <Logo />
          <span>Filemark</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-5 text-sm text-muted-foreground sm:flex">
          <Link to="/demo" className="hover:text-foreground">
            Demo
          </Link>
          <Link to="/changelog" className="hover:text-foreground">
            Changelog
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </nav>
        <a
          href="https://github.com/thesatellite-ai/filemark"
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-muted sm:ml-0"
        >
          <Github size={14} />
          <span className="hidden sm:inline">GitHub</span>
        </a>
        <a
          href="#install"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Install
          <ExternalLink size={12} />
        </a>
      </div>
    </header>
  );
}

function Footer(): React.ReactElement {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <Logo />
          <span>© {new Date().getFullYear()} Filemark</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/changelog" className="hover:text-foreground">
            Changelog
          </Link>
          <a
            href="https://github.com/thesatellite-ai/filemark"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <a href="mailto:khanakia@gmail.com" className="hover:text-foreground">
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}

function Logo(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 32 32"
      width="20"
      height="20"
      className="shrink-0"
      aria-hidden
    >
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <path
        d="M8 8h12l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M20 8v4h4"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 17h8M10 21h6"
        className="stroke-primary-foreground"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
