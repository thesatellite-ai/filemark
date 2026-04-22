import {
  parse as jsoncParse,
  printParseErrorCode,
  type ParseError,
} from "jsonc-parser";

export interface ParseResult {
  value: unknown;
  /** Non-fatal errors from jsonc-parser (unexpected tokens, etc.). */
  errors: Array<{ line: number; column: number; message: string }>;
  /** True when the source is valid JSON with no JSONC features (comments,
   *  trailing commas). Purely informational — we always parse with tolerance. */
  strict: boolean;
}

/**
 * Parse JSON or JSONC. Always tolerant: comments + trailing commas are
 * allowed. Returns the structured value plus any non-fatal parse errors
 * with line/column info for display.
 *
 * For files that start with a UTF-8 BOM the byte is stripped transparently.
 */
export function parseJSON(source: string): ParseResult {
  const text = source.replace(/^﻿/, "");
  const parseErrors: ParseError[] = [];
  const value = jsoncParse(text, parseErrors, {
    allowTrailingComma: true,
    allowEmptyContent: true,
    disallowComments: false,
  });

  const errors = parseErrors.map((e) => {
    const { line, column } = offsetToLineCol(text, e.offset);
    return {
      line,
      column,
      message: `${printParseErrorCode(e.error)} at line ${line}, col ${column}`,
    };
  });

  // "strict" = no comments, no trailing commas, valid with native JSON.parse
  let strict = false;
  try {
    JSON.parse(text);
    strict = true;
  } catch {
    strict = false;
  }

  return { value, errors, strict };
}

function offsetToLineCol(src: string, offset: number) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset && i < src.length; i++) {
    if (src.charCodeAt(i) === 10) {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}
