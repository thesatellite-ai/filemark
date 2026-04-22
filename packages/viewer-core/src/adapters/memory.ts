import type { StorageAdapter, AssetResolver } from "../types";

export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export class PassthroughAssetResolver implements AssetResolver {
  async resolve(path: string): Promise<string | null> {
    if (/^(https?:|data:|blob:|chrome-extension:)/.test(path)) return path;
    return null;
  }
}
