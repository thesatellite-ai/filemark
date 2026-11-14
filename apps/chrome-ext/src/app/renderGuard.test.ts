import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { arm, settle, settleLater, takeFrozen, SETTLE_MS } from "./renderGuard";

// In-memory stand-in for chrome.storage.local — only the calls renderGuard makes.
function fakeChrome() {
  const data: Record<string, unknown> = {};
  const local = {
    get: async (key: string) => (key in data ? { [key]: data[key] } : {}),
    set: async (items: Record<string, unknown>) => {
      Object.assign(data, items);
    },
    remove: async (key: string) => {
      delete data[key];
    },
  };
  vi.stubGlobal("chrome", { storage: { local } });
  return data;
}

describe("renderGuard", () => {
  beforeEach(() => {
    fakeChrome();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("a document that never settled is reported once, then forgotten", async () => {
    await arm("intercept:a.md", "a.md");
    const frozen = await takeFrozen("intercept:a.md");
    expect(frozen?.name).toBe("a.md");
    // takeFrozen clears it, so the following load renders normally.
    expect(await takeFrozen("intercept:a.md")).toBeNull();
  });

  it("a settled document is not reported", async () => {
    await arm("k", "k.md");
    await settle("k");
    expect(await takeFrozen("k")).toBeNull();
  });

  it("documents are tracked independently", async () => {
    await arm("a", "a.md");
    await arm("b", "b.md");
    await settle("a");
    expect(await takeFrozen("a")).toBeNull();
    expect((await takeFrozen("b"))?.name).toBe("b.md");
  });

  it("settleLater settles after SETTLE_MS, not before", async () => {
    vi.useFakeTimers();
    await arm("k", "k.md");
    settleLater("k");
    await vi.advanceTimersByTimeAsync(SETTLE_MS - 1);
    vi.useRealTimers();
    expect(await takeFrozen("k")).not.toBeNull();

    vi.useFakeTimers();
    await arm("k", "k.md");
    settleLater("k");
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    vi.useRealTimers();
    expect(await takeFrozen("k")).toBeNull();
  });

  it("settleLater's cleanup settles immediately (user switched away, tab not frozen)", async () => {
    await arm("k", "k.md");
    const cleanup = settleLater("k");
    cleanup();
    await Promise.resolve();
    expect(await takeFrozen("k")).toBeNull();
  });

  it("degrades to a no-op without chrome.storage", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("chrome", undefined);
    await expect(arm("k", "k.md")).resolves.toBeUndefined();
    expect(await takeFrozen("k")).toBeNull();
  });
});
