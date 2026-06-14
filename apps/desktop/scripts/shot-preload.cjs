// Stub bridge so the renderer hydrates with empty state (proves the
// shell/styling renders without a real project DB).
const { contextBridge } = require("electron");
contextBridge.exposeInMainWorld("filemark", {
  version: "test",
  platform: process.platform,
  storage: { get: async () => null, set: async () => {}, delete: async () => {} },
  projects: { open: async () => null, add: async () => null, list: async () => [] },
  files: {
    read: async () => "",
    write: async () => 0,
    mtime: async () => 0,
    rename: async () => true,
    create: async () => true,
    trash: async () => true,
  },
  os: { openPath: async () => "", reveal: async () => {} },
  pathForFile: () => "",
  onFilesChanged: () => () => {},
});
