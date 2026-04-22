import { createStore, del, get, set } from "idb-keyval";
import type { StorageAdapter } from "@filemark/core";

const store = createStore("filemark", "kv");

export const idbStorage: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    const v = await get(key, store);
    return (v as T) ?? null;
  },
  async set<T>(key: string, value: T): Promise<void> {
    await set(key, value, store);
  },
  async delete(key: string): Promise<void> {
    await del(key, store);
  },
};
