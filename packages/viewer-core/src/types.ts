import type { ComponentType } from "react";

export interface FileRef {
  id: string;
  name: string;
  ext: string;
  /** Relative path within the owning folder, or the bare filename for drop/intercept. */
  path?: string;
  /** Full absolute URL if the file came from an interceptable source (file:// today). */
  sourceUrl?: string;
}

export interface StorageAdapter {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface AssetResolver {
  resolve(relativePath: string): Promise<string | null>;
}

export interface ViewerProps {
  content: string;
  file: FileRef;
  storage?: StorageAdapter;
  assets?: AssetResolver;
  onNavigate?: (href: string) => void;
  trust?: "full" | "safe";
}

export type Renderer = ComponentType<ViewerProps>;

export interface RendererEntry {
  extensions: string[];
  renderer: Renderer;
}
