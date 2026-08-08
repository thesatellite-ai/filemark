// DocumentLinkProvider — makes filemark `[[wikilinks]]` clickable in the raw
// editor, resolving to a sibling `.md` file. (Standard `[text](path)` links are
// already handled by VS Code's built-in Markdown support — we only add the
// non-standard wikilink syntax so we don't conflict with it.)

import * as path from "node:path";
import * as vscode from "vscode";

// [[Target]] or [[Target|alias]] — capture the target (before any pipe).
const WIKILINK_RE = /\[\[([^\]|\n]+)(?:\|[^\]\n]+)?\]\]/g;

class WikilinkProvider implements vscode.DocumentLinkProvider {
  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    if (document.uri.scheme !== "file") return [];
    const dir = path.dirname(document.uri.fsPath);
    const links: vscode.DocumentLink[] = [];

    for (let line = 0; line < document.lineCount; line++) {
      const text = document.lineAt(line).text;
      WIKILINK_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = WIKILINK_RE.exec(text)) !== null) {
        const target = m[1].trim();
        // Underline just the target text (inside the [[ ]]).
        const startCol = m.index + 2;
        const range = new vscode.Range(line, startCol, line, startCol + m[1].length);
        const file = target.toLowerCase().endsWith(".md") ? target : `${target}.md`;
        const link = new vscode.DocumentLink(
          range,
          vscode.Uri.file(path.resolve(dir, file)),
        );
        link.tooltip = `Open ${file}`;
        links.push(link);
      }
    }
    return links;
  }
}

/**
 * Register a DocumentLinkProvider for `[[wikilinks]]`, resolving each to the
 * sibling `.md` file so Ctrl/Cmd-click navigates to it. File-scheme docs only
 * (a wikilink target is a path relative to the current file's folder).
 */
export function registerLinks(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(
      { language: "markdown" },
      new WikilinkProvider(),
    ),
  );
}
