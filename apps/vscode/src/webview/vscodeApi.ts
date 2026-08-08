// `acquireVsCodeApi()` is injected into every VS Code webview and may be called
// exactly ONCE per page. We call it here and share the handle so the message
// sender and the storage adapter use the same instance.

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

export const vscode: VsCodeApi = acquireVsCodeApi();
