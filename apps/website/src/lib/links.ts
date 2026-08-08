// Where Filemark ships, in one place so the header Download menu and the
// on-page install table can't drift. The VS Code extension is a separate host
// over the same renderer; it publishes under two ids — the Marketplace requires
// globally-unique names (`filemark` is taken), Open VSX scopes per-namespace —
// see apps/vscode/PUBLISHING.md.

import type { ComponentType } from "react";
import { Blocks } from "lucide-react";
import { ChromeIcon, VSCodeIcon } from "../components/BrandIcons";

export const REPO_URL = "https://github.com/thesatellite-ai/filemark";
export const CHROME_URL =
  "https://chromewebstore.google.com/detail/filemark/cidgogmffaflfghnebkfjbccfgbdjicm";
export const VSCODE_URL =
  "https://marketplace.visualstudio.com/items?itemName=khanakia.khanakia-filemark";
export const OPEN_VSX_URL = "https://open-vsx.org/extension/khanakia/filemark";

/** Icon call signature shared by our BrandIcons and lucide icons. */
type IconType = ComponentType<{
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
}>;

export interface InstallTarget {
  id: string;
  icon: IconType;
  /** Short platform name shown in bold. */
  name: string;
  /** Store/registry the button points at. */
  where: string;
  /** One-line "what you get" for the table row. */
  blurb: string;
  href: string;
}

/** Ordered by expected audience size (browser → editor → open builds). */
export const INSTALL_TARGETS: InstallTarget[] = [
  {
    id: "chrome",
    icon: ChromeIcon,
    name: "Chrome",
    where: "Chrome Web Store",
    blurb: "Render .md, .json, .csv & SQL/Prisma/DBML schemas right in any tab.",
    href: CHROME_URL,
  },
  {
    id: "vscode",
    icon: VSCodeIcon,
    name: "VS Code",
    where: "VS Code Marketplace",
    blurb: "Inline preview beside your editor — scroll-sync, jump-to-source, tasks.",
    href: VSCODE_URL,
  },
  {
    id: "openvsx",
    icon: Blocks,
    name: "Cursor · VSCodium",
    where: "Open VSX",
    blurb: "The same editor extension, for non-Microsoft VS Code builds.",
    href: OPEN_VSX_URL,
  },
];
