// FoldingRangeProvider — fold Markdown by section (heading → next same/higher
// heading), plus the frontmatter block and fenced code blocks.

import * as vscode from "vscode";
import { parseMarkdown, type Heading } from "./markdown";

function sectionEnd(headings: Heading[], i: number, lastLine: number): number {
  const level = headings[i].level;
  for (let j = i + 1; j < headings.length; j++) {
    if (headings[j].level <= level) return headings[j].line - 1;
  }
  return lastLine;
}

class MarkdownFoldingProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
    const model = parseMarkdown(document);
    const last = document.lineCount - 1;
    const ranges: vscode.FoldingRange[] = [];

    if (model.frontmatterEnd > 0) {
      ranges.push(
        new vscode.FoldingRange(0, model.frontmatterEnd, vscode.FoldingRangeKind.Region),
      );
    }
    for (const [start, end] of model.fences) {
      if (end > start) {
        ranges.push(new vscode.FoldingRange(start, end));
      }
    }
    model.headings.forEach((h, i) => {
      const end = sectionEnd(model.headings, i, last);
      if (end > h.line) ranges.push(new vscode.FoldingRange(h.line, end));
    });

    return ranges;
  }
}

/**
 * Register a FoldingRangeProvider for Markdown: fold heading sections, fenced
 * code blocks, and the leading frontmatter block on the raw editor.
 */
export function registerFolding(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.languages.registerFoldingRangeProvider(
      { language: "markdown" },
      new MarkdownFoldingProvider(),
    ),
  );
}
