// Cross-file Task tree — an activity-bar view listing every task-bullet across
// the workspace's Markdown files, grouped by file. Powered by @filemark/tasks'
// pure `extractTasks` (no React pulled into the host bundle — we import only the
// parser, and esbuild tree-shakes the barrel's React context away).
//
// task.line is a 1-based whole-file line (extractTasks numbers from the top of
// the file, frontmatter included), so opening at line-1 needs no offset math —
// unlike the preview's data-line anchors (see frontmatterLineOffset).

import * as vscode from "vscode";
// React-free subpath — keeps react/react-dom out of the extension-host bundle.
import { extractTasks } from "@filemark/tasks/pure";
import type { Task, TaskStatus } from "@filemark/tasks/pure";

/** Markdown files to scan / watch, and what to skip. */
const MD_GLOB = "**/*.{md,mdx,markdown}";
const EXCLUDE_GLOB = "**/node_modules/**";

/** Per-status tree icon + a short marker shown in the item description. */
const STATUS_PRESENTATION: Record<
  TaskStatus,
  { icon: string; marker: string; color?: string }
> = {
  todo: { icon: "circle-large-outline", marker: "○" },
  wip: { icon: "sync", marker: "◐", color: "charts.blue" },
  done: { icon: "pass-filled", marker: "✓", color: "charts.green" },
  blocked: { icon: "error", marker: "!", color: "charts.yellow" },
  question: { icon: "question", marker: "?", color: "charts.purple" },
  cancelled: { icon: "circle-slash", marker: "–" },
};

const OPEN_TASK_COMMAND = "filemark.tasks.openTask";

interface FileNode {
  kind: "file";
  uri: vscode.Uri;
  tasks: Task[];
}

interface TaskNode {
  kind: "task";
  uri: vscode.Uri;
  task: Task;
}

type TreeNode = FileNode | TaskNode;

const decoder = new TextDecoder();

class TaskTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChange = new vscode.EventEmitter<
    TreeNode | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChange.event;

  /** Per-file cache keyed by URI string. Built lazily on first expand; nulled
   *  on manual refresh to force a full re-scan. Keyed so a single file change
   *  updates just its entry instead of re-reading the whole workspace. */
  private cache: Map<string, FileNode> | null = null;

  /** Full re-scan (manual refresh / first load). */
  refresh(): void {
    this.cache = null;
    this._onDidChange.fire(undefined);
  }

  /** Re-parse a single file and update just its entry. No-op until the tree has
   *  been populated once (the next expand does a full scan anyway). */
  async refreshFile(uri: vscode.Uri): Promise<void> {
    if (this.cache == null) return;
    const node = await this.parseFile(uri);
    if (node) this.cache.set(uri.toString(), node);
    else this.cache.delete(uri.toString()); // no tasks (or unreadable) → drop
    this._onDidChange.fire(undefined);
  }

  /** Drop a deleted file's entry. */
  removeFile(uri: vscode.Uri): void {
    if (this.cache?.delete(uri.toString())) this._onDidChange.fire(undefined);
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    if (node.kind === "file") {
      const item = new vscode.TreeItem(
        vscode.Uri.file(node.uri.fsPath),
        vscode.TreeItemCollapsibleState.Expanded,
      );
      // Show the workspace-relative path as the label; count as the badge.
      item.label = vscode.workspace.asRelativePath(node.uri);
      item.description = `${node.tasks.length}`;
      item.iconPath = vscode.ThemeIcon.File;
      item.resourceUri = node.uri;
      item.contextValue = "filemark.taskFile";
      return item;
    }
    const { task } = node;
    const pres = STATUS_PRESENTATION[task.status];
    const item = new vscode.TreeItem(
      task.text || "(untitled task)",
      vscode.TreeItemCollapsibleState.None,
    );
    item.iconPath = new vscode.ThemeIcon(
      pres.icon,
      pres.color ? new vscode.ThemeColor(pres.color) : undefined,
    );
    // Description: priority + owners, e.g. "p0 · @alice".
    const bits: string[] = [];
    if (task.priority) bits.push(task.priority);
    if (task.owners.length > 0) {
      bits.push(task.owners.map((o: string) => `@${o}`).join(" "));
    }
    item.description = bits.join(" · ");
    item.tooltip = `${pres.marker} ${task.text}`;
    item.command = {
      command: OPEN_TASK_COMMAND,
      title: "Open Task",
      arguments: [node.uri, task.line ?? 1],
    };
    item.contextValue = "filemark.task";
    return item;
  }

  async getChildren(node?: TreeNode): Promise<TreeNode[]> {
    if (!node) {
      if (this.cache == null) this.cache = await this.scan();
      // Sorted by workspace-relative path for a stable, readable order.
      return [...this.cache.values()].sort((a, b) =>
        vscode.workspace
          .asRelativePath(a.uri)
          .localeCompare(vscode.workspace.asRelativePath(b.uri)),
      );
    }
    if (node.kind === "file") {
      return node.tasks.map((task) => ({ kind: "task", uri: node.uri, task }));
    }
    return [];
  }

  /** Parse one file into a FileNode, or null if it has no tasks / is unreadable. */
  private async parseFile(uri: vscode.Uri): Promise<FileNode | null> {
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      const tasks = extractTasks(decoder.decode(bytes), {
        file: vscode.workspace.asRelativePath(uri),
      });
      return tasks.length > 0 ? { kind: "file", uri, tasks } : null;
    } catch {
      return null; // unreadable — skip, never break the whole tree
    }
  }

  /** Full scan + parse of every Markdown file, keeping those with ≥1 task. */
  private async scan(): Promise<Map<string, FileNode>> {
    const files = await vscode.workspace.findFiles(MD_GLOB, EXCLUDE_GLOB);
    const map = new Map<string, FileNode>();
    for (const uri of files) {
      const node = await this.parseFile(uri);
      if (node) map.set(uri.toString(), node);
    }
    return map;
  }
}

/**
 * Register the task tree view, its refresh + open-task commands, and file
 * watchers that keep it fresh as Markdown files change.
 */
export function registerTaskTree(context: vscode.ExtensionContext): void {
  const provider = new TaskTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("filemark.tasks", provider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("filemark.tasks.refresh", () =>
      provider.refresh(),
    ),
    vscode.commands.registerCommand(
      OPEN_TASK_COMMAND,
      async (uri: vscode.Uri, line: number) => {
        const target = Math.max(0, line - 1);
        const editor = await vscode.window.showTextDocument(uri);
        const clamped = Math.min(target, editor.document.lineCount - 1);
        const pos = new vscode.Position(clamped, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(
          new vscode.Range(pos, pos),
          vscode.TextEditorRevealType.InCenterIfOutsideViewport,
        );
      },
    ),
  );

  // Keep the tree current with INCREMENTAL updates — re-parse only the file that
  // changed, not the whole workspace. (Live per-keystroke edits are intentionally
  // NOT watched; we update on save.)
  const watcher = vscode.workspace.createFileSystemWatcher(MD_GLOB);
  context.subscriptions.push(
    watcher,
    watcher.onDidCreate((uri) => void provider.refreshFile(uri)),
    watcher.onDidChange((uri) => void provider.refreshFile(uri)),
    watcher.onDidDelete((uri) => provider.removeFile(uri)),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (/\.(md|mdx|markdown)$/i.test(doc.uri.fsPath)) {
        void provider.refreshFile(doc.uri);
      }
    }),
  );
}
