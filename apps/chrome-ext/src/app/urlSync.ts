import { useEffect } from "react";
import { useLibrary } from "./store";

/**
 * Two-way sync between the active file and the URL's `?file=<id>` param.
 *
 *  - On mount (and on every popstate), if the URL has `?file=<id>` and that
 *    file exists in the library, activate it.
 *  - Whenever `activeFileId` changes, mirror it back to the URL via
 *    `history.replaceState` so the URL is always a valid shareable handle
 *    to the currently-rendered file.
 *
 * The hash (`#heading-slug`) is preserved untouched so anchor links keep
 * working for copy-paste navigation.
 */
export function useUrlSync() {
  const activeFileId = useLibrary((s) => s.activeFileId);
  const files = useLibrary((s) => s.files);
  const hydrated = useLibrary((s) => s.hydrated);
  const setActive = useLibrary((s) => s.setActive);

  // URL → store (runs once after hydrate, and on browser back/forward)
  useEffect(() => {
    if (!hydrated) return;
    const apply = () => {
      const params = new URLSearchParams(location.search);
      const want = params.get("file");
      if (!want) return;
      if (files[want] && want !== useLibrary.getState().activeFileId) {
        setActive(want);
      }
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, [hydrated, files, setActive]);

  // store → URL (runs whenever the active file changes)
  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(location.href);
    if (activeFileId) {
      url.searchParams.set("file", activeFileId);
    } else {
      url.searchParams.delete("file");
    }
    // Strip any transient intercept key — once we have a library file, the
    // URL should look like a plain ?file=<id> link.
    url.searchParams.delete("intercept");
    const target = url.pathname + url.search + url.hash;
    if (target !== location.pathname + location.search + location.hash) {
      history.replaceState(null, "", target);
    }
  }, [activeFileId, hydrated]);
}
