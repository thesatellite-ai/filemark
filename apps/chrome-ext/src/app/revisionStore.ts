// Composition root for revision mode: bind the portable revision store to this
// host's persistence (chrome.storage.local). Created once at module load — a
// stable singleton passed to <RevisionProvider store={…}>. A different host
// (web app, VS Code webview) would swap only the adapter here; the rest of the
// revision feature is unchanged.
import { createRevisionStore, createChromeRevisionStorage } from "./revision";

export const revisionStore = createRevisionStore(createChromeRevisionStorage());
