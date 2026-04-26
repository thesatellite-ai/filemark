import {
  Check,
  ClipboardCopy,
  ExternalLink,
  Eye,
  FileCode2,
  FolderOpen,
  MoreHorizontal,
  Share2,
  Sparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useLibrary, type LibraryFile } from "../store";
import { readFileContent } from "../fs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * File actions menu. Rendered as a Popover (not DropdownMenu) because the
 * Base UI Menu primitive in basecn requires a specific structure that kept
 * tripping error #31; Popover is simpler and gives us a plain action list.
 *
 * Actions:
 *  - Toggle rendered ↔ raw view
 *  - Copy file path / URL
 *  - Open in VS Code / Cursor / Windsurf (requires file:// source)
 *  - Reveal in Finder (requires file:// source; opens parent dir in new tab)
 */
export function FileActions({ file }: { file: LibraryFile }) {
  const viewMode = useLibrary((s) => s.viewMode);
  const setViewMode = useLibrary((s) => s.setViewMode);
  const folder = useLibrary((s) =>
    file.folderId ? s.folders[file.folderId] : null
  );
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [shareState, setShareState] = useState<
    "idle" | "encoding" | "copied" | "too-large" | "error"
  >("idle");

  const absolutePath = resolveAbsolutePath(file, folder?.rootPath);
  const hasAbsolute = absolutePath !== null;
  const isMarkdown = ["md", "mdx", "markdown"].includes(file.ext.toLowerCase());

  const close = () => setOpen(false);

  const copyPath = async () => {
    const target = absolutePath ?? file.path;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  // Encode the file content into a playground URL. Two formats, picked by
  // size: `?src=<raw-base64>` for small docs (legacy, human-readable in
  // logs), `?srcz=<gzipped-base64>` for everything else. Markdown
  // typically compresses 3–5x, so 100KB docs end up ~25KB encoded.
  // URLs over ~28KB still exceed Chrome's address-bar limit in some
  // places, so we keep the explicit guard.
  const PLAYGROUND_BASE = "https://filemark-playground-drab.vercel.app";
  const SHARE_URL_LIMIT = 28_000;
  const shareToPlayground = async () => {
    setShareState("encoding");
    try {
      const content = await readFileContent(file);
      if (content == null) {
        setShareState("error");
        setTimeout(() => setShareState("idle"), 2500);
        return;
      }
      const url = await buildShareUrl(PLAYGROUND_BASE, content);
      if (url.length > SHARE_URL_LIMIT) {
        setShareState("too-large");
        setTimeout(() => setShareState("idle"), 2500);
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* clipboard may be unavailable; tab still opens */
      }
      window.open(url, "_blank", "noopener,noreferrer");
      setShareState("copied");
      setTimeout(() => {
        setShareState("idle");
        close();
      }, 1500);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 2500);
    }
  };

  const openIn = (scheme: "vscode" | "cursor" | "windsurf") => {
    if (!absolutePath) return;
    close();
    window.location.href = `${scheme}://file${absolutePath}`;
  };

  const revealInFinder = () => {
    if (!hasAbsolute) return;
    close();
    // Finder can't be triggered from the browser directly. Opening the
    // parent directory as file:// in a new tab shows the Chrome directory
    // listing; from there the user can right-click → Reveal in Finder. It
    // also serves as a "path confirmation" — the listing URL is the folder.
    const abs = absolutePath!;
    const parent = abs.substring(0, abs.lastIndexOf("/") + 1);
    window.open(`file://${encodeURI(parent)}`, "_blank");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "hover:bg-accent hover:text-accent-foreground inline-flex size-7 items-center justify-center rounded-md text-sm outline-none transition-colors focus-visible:ring-ring/50 focus-visible:ring-2"
        )}
        aria-label="File actions"
        title="File actions"
      >
        <MoreHorizontal className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="end">
        <SectionLabel>{file.name}</SectionLabel>
        <Separator className="my-1" />

        <ActionRow
          icon={viewMode === "raw" ? <Sparkles className="size-4" /> : <FileCode2 className="size-4" />}
          onClick={() => {
            setViewMode(viewMode === "raw" ? "rendered" : "raw");
            close();
          }}
        >
          {viewMode === "raw" ? "View rendered" : "View raw source"}
        </ActionRow>

        <Separator className="my-1" />

        <ActionRow
          icon={copied ? <Check className="size-4 text-green-500" /> : <ClipboardCopy className="size-4" />}
          onClick={copyPath}
        >
          {copied ? "Copied" : `Copy ${absolutePath ? "path" : "name"}`}
        </ActionRow>

        {isMarkdown && (
          <>
            <Separator className="my-1" />
            <ActionRow
              icon={
                shareState === "copied" ? (
                  <Check className="size-4 text-green-500" />
                ) : shareState === "too-large" || shareState === "error" ? (
                  <Eye className="size-4 text-amber-500" />
                ) : (
                  <Share2 className="size-4" />
                )
              }
              onClick={shareToPlayground}
              disabled={shareState === "encoding"}
            >
              <span className="flex flex-1 items-center gap-1.5">
                {shareState === "copied"
                  ? "URL copied + tab opened"
                  : shareState === "too-large"
                    ? "Too large to share via URL"
                    : shareState === "error"
                      ? "Couldn't read file"
                      : shareState === "encoding"
                        ? "Encoding…"
                        : "Open in playground"}
                {shareState === "idle" && (
                  <ExternalLink className="text-muted-foreground size-3" />
                )}
              </span>
            </ActionRow>
          </>
        )}

        <Separator className="my-1" />
        <SectionLabel>Open in editor</SectionLabel>

        <ActionRow icon={<FileCode2 className="size-4" />} disabled={!hasAbsolute} onClick={() => openIn("vscode")}>
          VS Code
        </ActionRow>
        <ActionRow icon={<FileCode2 className="size-4" />} disabled={!hasAbsolute} onClick={() => openIn("cursor")}>
          Cursor
        </ActionRow>
        <ActionRow icon={<FileCode2 className="size-4" />} disabled={!hasAbsolute} onClick={() => openIn("windsurf")}>
          Windsurf
        </ActionRow>

        <Separator className="my-1" />

        <ActionRow icon={<FolderOpen className="size-4" />} disabled={!hasAbsolute} onClick={revealInFinder}>
          Reveal in Finder
        </ActionRow>

        {!hasAbsolute && (
          <>
            <Separator className="my-1" />
            <div className="text-muted-foreground flex items-start gap-1.5 px-2 py-1.5 text-[11px] leading-snug">
              <Eye className="mt-0.5 size-3 shrink-0" />
              <span>
                {folder
                  ? <>Set the folder's absolute path in the sidebar to enable these actions.</>
                  : <>Open via a <code className="bg-muted rounded px-0.5">file://</code> URL or pick a folder to enable these.</>}
              </span>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground truncate px-2 py-1 text-[10px] font-semibold uppercase tracking-wider">
      {children}
    </div>
  );
}

function ActionRow({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors disabled:pointer-events-none disabled:opacity-50"
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </button>
  );
}

/**
 * Build a playground share URL for the given content, preferring gzip when
 * it actually shrinks the payload. Try both encodings and pick the shorter
 * URL, so tiny docs stay human-readable and big docs squeeze through.
 */
async function buildShareUrl(
  base: string,
  content: string,
): Promise<string> {
  const raw = btoa(encodeURIComponent(content));
  const rawUrl = `${base}/?src=${raw}#/play`;
  try {
    const stream = new Response(content).body!.pipeThrough(
      new CompressionStream("gzip"),
    );
    const buf = new Uint8Array(await new Response(stream).arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!);
    const gz = btoa(bin);
    const gzUrl = `${base}/?srcz=${gz}#/play`;
    return gzUrl.length < rawUrl.length ? gzUrl : rawUrl;
  } catch {
    return rawUrl;
  }
}

function resolveAbsolutePath(
  file: LibraryFile,
  folderRootPath: string | undefined
): string | null {
  // 1. file:// intercepted files carry the full URL.
  if (file.sourceUrl && file.sourceUrl.startsWith("file://")) {
    try {
      return decodeURIComponent(new URL(file.sourceUrl).pathname);
    } catch {
      /* fall through */
    }
  }
  // 2. Folder files combine the folder's user-provided root with their relative path.
  if (folderRootPath && file.folderId && file.path) {
    const root = folderRootPath.replace(/\/+$/, "");
    const rel = file.path.replace(/^\/+/, "");
    return `${root}/${rel}`;
  }
  return null;
}
