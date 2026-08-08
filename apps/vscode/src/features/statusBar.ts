// Status bar item for the active Markdown file: reading time, word count, and
// task progress. Clicking it opens the filemark preview.

import * as vscode from "vscode";
import {
  parseMarkdown,
  wordCount,
  readingMinutes,
  taskCounts,
} from "./markdown";

const MARKDOWN_LANGUAGE_ID = "markdown";

/**
 * Register a status-bar item showing the active Markdown file's reading time,
 * word count, and task progress. Updates on active-editor / document changes
 * and hides itself whenever the active editor isn't Markdown.
 */
export function registerStatusBar(context: vscode.ExtensionContext): void {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  item.command = "filemark.openPreview";

  const update = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== MARKDOWN_LANGUAGE_ID) {
      item.hide();
      return;
    }
    const doc = editor.document;
    const model = parseMarkdown(doc);
    const words = wordCount(doc, model);
    const { total, done } = taskCounts(doc, model);
    const parts = [`$(book) ${readingMinutes(words)} min read`, `${words} words`];
    if (total > 0) parts.push(`$(checklist) ${done}/${total}`);
    item.text = parts.join("  ·  ");
    item.tooltip = "Filemark — click to open preview";
    item.show();
  };

  context.subscriptions.push(
    item,
    vscode.window.onDidChangeActiveTextEditor(update),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) update();
    }),
  );
  update();
}
