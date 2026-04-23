import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type RechartsModule = typeof import("recharts");

/**
 * Memoized dynamic import. Every `<Chart>` on a page shares one
 * recharts bundle — we never re-fetch after the first success.
 * Docs with no charts never call this and never pay the ~50 KB.
 */
let promise: Promise<RechartsModule> | null = null;

export function loadRecharts(): Promise<RechartsModule> {
  if (!promise) promise = import("recharts");
  return promise;
}

const RechartsContext = createContext<RechartsModule | null>(null);

export function useRecharts(): RechartsModule | null {
  return useContext(RechartsContext);
}

export function RechartsProvider({ children }: { children: ReactNode }) {
  const [mod, setMod] = useState<RechartsModule | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadRecharts().then((m) => {
      if (!cancelled) setMod(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  // Context value is null until recharts loads; consumers render a
  // skeleton in that window.
  return (
    <RechartsContext.Provider value={mod}>{children}</RechartsContext.Provider>
  );
}
