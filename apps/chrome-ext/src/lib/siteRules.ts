// Per-site activation rules — a skip/allow overlay on top of the normal
// eligibility check (supported extension + renderable content-type). Rules
// NEVER make an ineligible page render; they only decide skip-or-not.
//
// Used identically by the service worker, the content script, and the options
// page, so the matching logic lives here once. See docsi/SITE_RULES_PLAN.md.

export type SiteRuleMode = "exclude" | "include";

export interface SiteRule {
  id: string;
  /** Chrome match pattern, e.g. "*://*.github.com/*", "https://x.com/docs/*". */
  pattern: string;
  mode: SiteRuleMode;
}

const SPECIAL = /[.+?^${}()|[\]\\]/g;
const escapeRe = (s: string) => s.replace(SPECIAL, "\\$&");

// Turn one `*`-glob segment (host or path) into a regex body: escape regex
// specials, then translate `*` → `.*`.
const globToRe = (s: string) => escapeRe(s).replace(/\*/g, ".*");

const cache = new Map<string, RegExp | null>();

/**
 * Compile a Chrome match pattern to a RegExp (cached). Supports schemes
 * `*` (= http/https/file), `http`, `https`, `file`; hosts `*`, `*.domain`,
 * or exact; `*`-glob paths; and the literal `<all_urls>`. Returns null for an
 * unparseable pattern (caller treats that as "no match").
 */
export function patternToRegExp(pattern: string): RegExp | null {
  if (cache.has(pattern)) return cache.get(pattern)!;
  let re: RegExp | null = null;
  try {
    if (pattern === "<all_urls>") {
      re = /^[^:]+:\/\/.*$/;
    } else {
      const m = /^(\*|https?|file|ftp):\/\/(.*)$/.exec(pattern);
      if (m) {
        const scheme = m[1];
        const rest = m[2];
        let host: string;
        let path: string;
        if (scheme === "file") {
          host = "";
          path = "/" + rest.replace(/^\/+/, "");
        } else {
          const slash = rest.indexOf("/");
          if (slash === -1) {
            host = rest;
            path = "/*";
          } else {
            host = rest.slice(0, slash);
            path = rest.slice(slash);
          }
        }
        const schemeRe = scheme === "*" ? "(?:https?|file)" : scheme;
        const hostRe =
          host === "*"
            ? "[^/]*"
            : host.startsWith("*.")
              ? "(?:[^/]+\\.)?" + escapeRe(host.slice(2))
              : escapeRe(host);
        re = new RegExp("^" + schemeRe + "://" + hostRe + globToRe(path) + "$");
      }
    }
  } catch {
    re = null;
  }
  cache.set(pattern, re);
  return re;
}

/** True when a Chrome match pattern is well-formed enough to compile + match. */
export function isValidPattern(pattern: string): boolean {
  return patternToRegExp(pattern) !== null;
}

/**
 * Forgiving normalization for user input: a bare host ("github.com") becomes
 * "*://github.com/*"; a scheme+host with no path gets "/*" appended. Already-
 * valid patterns pass through. Used by the options editor + quick toggle.
 */
export function normalizePattern(input: string): string {
  let p = input.trim();
  if (!p) return p;
  if (!/:\/\//.test(p)) p = "*://" + p;
  // ensure a path part
  const m = /^(\*|https?|file|ftp):\/\/([^/]*)$/.exec(p);
  if (m) p = p + "/*";
  return p;
}

function matches(rule: SiteRule, url: string): boolean {
  const re = patternToRegExp(rule.pattern);
  return re ? re.test(url) : false;
}

/**
 * Skip/allow decision for a URL given the rule set. Eligibility (extension +
 * content-type) is checked separately by the caller — this only layers the
 * site rules on top:
 *   include match → run (carve-out, wins over exclude)
 *   else exclude match → skip
 *   else → run (default)
 */
export function shouldRun(url: string, rules: SiteRule[] | undefined): boolean {
  if (!rules || rules.length === 0) return true;
  let excluded = false;
  for (const r of rules) {
    if (!matches(r, url)) continue;
    if (r.mode === "include") return true; // include wins outright
    if (r.mode === "exclude") excluded = true;
  }
  return !excluded;
}
