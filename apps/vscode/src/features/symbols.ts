// DocumentSymbolProvider — turns Markdown headings into a nested symbol tree,
// which powers the Outline view, breadcrumbs, and Go to Symbol (Cmd/Ctrl+Shift+O).

import * as vscode from "vscode";
import { parseMarkdown, type Heading } from "./markdown";

/** Last line of the section a heading owns: up to the next heading of equal or
 *  higher level, else end of file. Encompasses child headings for nesting. */
function sectionEnd(headings: Heading[], i: number, lastLine: number): number {
  const level = headings[i].level;
  for (let j = i + 1; j < headings.length; j++) {
    if (headings[j].level <= level) return headings[j].line - 1;
  }
  return lastLine;
}

class MarkdownSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(
    document: vscode.TextDocument,
  ): vscode.DocumentSymbol[] {
    const { headings } = parseMarkdown(document);
    const roots: vscode.DocumentSymbol[] = [];
    const stack: { level: number; symbol: vscode.DocumentSymbol }[] = [];

    headings.forEach((h, i) => {
      const endLine = sectionEnd(headings, i, document.lineCount - 1);
      const full = new vscode.Range(
        new vscode.Position(h.line, 0),
        document.lineAt(endLine).range.end,
      );
      const symbol = new vscode.DocumentSymbol(
        h.text,
        "",
        vscode.SymbolKind.String,
        full,
        document.lineAt(h.line).range,
      );
      while (stack.length && stack[stack.length - 1].level >= h.level) {
        stack.pop();
      }
      if (stack.length) stack[stack.length - 1].symbol.children.push(symbol);
      else roots.push(symbol);
      stack.push({ level: h.level, symbol });
    });

    return roots;
  }
}

/**
 * Register a DocumentSymbolProvider that turns Markdown headings into a nested
 * symbol tree — this is what powers Outline, breadcrumbs, and Go-to-Symbol
 * (`Cmd/Ctrl+Shift+O`) on the raw editor.
 */
export function registerSymbols(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { language: "markdown" },
      new MarkdownSymbolProvider(),
    ),
  );
}
