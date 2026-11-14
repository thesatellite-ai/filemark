---
title: Regression — one Go code block froze the whole tab
---

# Regression: code-highlight freeze

**Symptom.** Opening a markdown file with certain one-line Go structs froze the tab for good: no text, no scrolling, and Chrome eventually offered "Page unresponsive".

**Root cause.** Shiki 4.3's bundled Go grammar (`@shikijs/langs` `dist/go.mjs`) has a rule, `repository.struct_variables_types_fields.patterns[3]`, whose regex starts `(?<=\{)((?:\s*(?:(?:\w+,\s*)+{0,1}\w+\s+)?…)+)\s*(?=})`. When a `/*`, `"`, backtick or `/` keeps it from reaching the closing `}`, it backtracks exponentially. Each two extra characters of field text roughly quadruple the time, so real doc lines take minutes to hours. All of that time is spent inside a single `RegExp.exec`. filemark highlighted synchronously on the page's main thread, so nothing else could run, and shiki's `tokenizeTimeLimit` can't interrupt one exec.

**Fix.** Commit `e477dfe` moved highlighting into Web Workers, with a deadline for each block. If a block runs past its deadline, its worker is terminated and the block renders as plain, uncoloured text. The rest of the page is never blocked.

**How to verify.** Open this file in the filemark extension:

- **Before `e477dfe`:** the tab freezes, and this text never appears.
- **After `e477dfe`:** the page renders right away, the blocks marked `freeze` show as plain text within about a second, the block marked `colour` is syntax-coloured, and the page stays responsive.

Automated checks:

- `pnpm --filter @filemark/mdx test`: `src/shiki.test.ts` reads the `freeze` and `colour` fences from this file.
- `task smoke:highlight-freeze`: a headless Chromium run against the built extension.

The fence info string (`go freeze` / `go colour`) is what the test keys on, so keep it when editing the fences.

## Trigger fences (must render plain, page must stay responsive)

The line found in the agentcli API docs (`docsi/*_API.md`):

```go freeze
type EnvSetting struct{ Name string; Value EnvValue; From SettingsScope /* or "process" */ }
```

A minimal variant. 16 `a`s take about 5 s on the main thread; every two more `a`s quadruple that:

```go freeze
type E struct{ aaaaaaaaaaaaaaaa b; c d; e f /* x */ }
```

The other original lines from the same agentcli API docs:

```go freeze
type Marketplace struct{ Name string; Source MarketplaceSource; InstallLocation string; LastUpdated time.Time; Declared bool /* via extraKnownMarketplaces only */ }
```

```go freeze
type Skill struct{ Name, Description, Dir string; Scope SkillScope; Enabled bool; Plugin string; Extra map[string]string /* other front-matter scalars */ }
```

A multi-line block that contains the trigger line. Tokenizing runs line by line, so one bad line inside a normal struct is enough:

```go freeze
package agentcli

// Settings as resolved from every scope.
type Settings struct {
	Env []EnvSetting
}

type EnvSetting struct{ Name string; Value EnvValue; From SettingsScope /* or "process" */ }

func (s Settings) Lookup(name string) (EnvSetting, bool) {
	for _, e := range s.Env {
		if e.Name == name {
			return e, true
		}
	}
	return EnvSetting{}, false
}
```

## Control (must stay coloured)

```go colour
package main

import "fmt"

// Point is a plain multi-line struct; the comment sits outside the braces.
type Point struct {
	X, Y int
}

type EnvSetting struct{ Name string; Value EnvValue; From SettingsScope } // From: a SettingsScope or "process"

func main() {
	fmt.Println(Point{1, 2})
}
```

Page end marker: highlight-freeze-regression-end.
