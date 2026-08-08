# Code showcase — every snippet format

A single document exercising Filemark's code rendering: inline code, syntax highlighting across every bundled language, the copy / wrap toolbar, side-by-side diffs, and long-line handling. Use it as a visual smoke test when tweaking the code renderer (Shiki) or the `github` view mode.

<Callout type="info" title="How code blocks render">

Every fenced block below the interactive ones is highlighted by **Shiki** with the GitHub Light / Dark themes (it follows your Filemark theme). Each block gets a small toolbar: the language chip, a **wrap** toggle (wrap ⇄ horizontal-scroll), and a **copy** button. Hover a block to use them.

</Callout>

## 1. Inline code

Inline spans use backticks: install with `pnpm add filemark`, call `array.flatMap()`, set `NODE_ENV=production`, reference a path like `packages/mdx-viewer/src/CodeBlock.tsx`, or a key combo such as `Cmd+K`. Inline code is *not* highlighted — it's a single muted pill so it reads inside prose.

## 2. JavaScript / TypeScript family

```js
// JavaScript — a tiny debounce
export function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
```

```ts
// TypeScript — discriminated union + exhaustive switch
type Shape =
  | { kind: "circle"; r: number }
  | { kind: "rect"; w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2;
    case "rect": return s.w * s.h;
    default: {
      const _never: never = s;
      return _never;
    }
  }
}
```

```tsx
// TSX — a function component
import { useState } from "react";

export function Counter({ start = 0 }: { start?: number }) {
  const [n, setN] = useState(start);
  return (
    <button onClick={() => setN((v) => v + 1)}>
      count: {n}
    </button>
  );
}
```

```jsx
// JSX — same idea, untyped
function Hello({ name }) {
  return <p className="greeting">Hello, {name}!</p>;
}
```

## 3. Markup & styles

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Filemark</title>
  </head>
  <body>
    <main id="root" data-theme="dark"></main>
  </body>
</html>
```

```css
/* CSS — custom properties + a media query */
:root {
  --bg: #0d1117;
  --fg: #f0f6fc;
}
@media (prefers-color-scheme: light) {
  :root { --bg: #ffffff; --fg: #1f2328; }
}
.markdown-body { background: var(--bg); color: var(--fg); }
```

```scss
// SCSS — nesting + a mixin
@mixin card($pad: 1rem) {
  padding: $pad;
  border: 1px solid rgba(#fff, 0.1);
  &:hover { border-color: rgba(#fff, 0.25); }
}
.tile { @include card(1.5rem); }
```

## 4. Data & config

```json
{
  "name": "filemark",
  "version": "0.1.11",
  "private": true,
  "scripts": { "build": "pnpm run build:webview && pnpm run build:host" },
  "keywords": ["markdown", "preview", "mdx"]
}
```

```jsonc
{
  // JSONC — JSON with comments
  "theme": "dark",
  "fontSize": 14, // px
  "scrollSync": true
}
```

```yaml
# YAML — a CI job
name: build
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
```

```toml
# TOML — a config file
[package]
name = "filemark"
version = "0.1.11"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
```

```sql
-- SQL — a join with aggregation
SELECT u.name, COUNT(o.id) AS orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.active = true
GROUP BY u.name
HAVING COUNT(o.id) > 3
ORDER BY orders DESC;
```

## 5. Systems languages

```go
// Go — a worker with a channel
package main

import "fmt"

func worker(jobs <-chan int, out chan<- int) {
	for j := range jobs {
		out <- j * j
	}
}

func main() {
	jobs, out := make(chan int, 3), make(chan int, 3)
	go worker(jobs, out)
	for i := 1; i <= 3; i++ {
		jobs <- i
	}
	close(jobs)
	for i := 0; i < 3; i++ {
		fmt.Println(<-out)
	}
}
```

```rust
// Rust — an enum + pattern match
enum Op { Add(i64, i64), Neg(i64) }

fn eval(op: Op) -> i64 {
    match op {
        Op::Add(a, b) => a + b,
        Op::Neg(x) => -x,
    }
}

fn main() {
    println!("{}", eval(Op::Add(2, 3)));
}
```

```c
/* C — classic FizzBuzz */
#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 15; i++) {
        if (i % 15 == 0) puts("FizzBuzz");
        else if (i % 3 == 0) puts("Fizz");
        else if (i % 5 == 0) puts("Buzz");
        else printf("%d\n", i);
    }
    return 0;
}
```

```cpp
// C++ — templates + STL
#include <vector>
#include <numeric>

template <typename T>
T sum(const std::vector<T>& xs) {
    return std::accumulate(xs.begin(), xs.end(), T{});
}

int main() { return sum(std::vector<int>{1, 2, 3}); }
```

```java
// Java — a record + stream
import java.util.List;

record Point(int x, int y) {}

public class Main {
    public static void main(String[] args) {
        var pts = List.of(new Point(1, 2), new Point(3, 4));
        int total = pts.stream().mapToInt(p -> p.x() + p.y()).sum();
        System.out.println(total);
    }
}
```

```swift
// Swift — optionals + guard
func firstEven(_ xs: [Int]) -> Int? {
    for x in xs where x % 2 == 0 { return x }
    return nil
}

if let n = firstEven([1, 3, 4, 7]) {
    print("first even: \(n)")
}
```

```kotlin
// Kotlin — data class + extension
data class User(val name: String, val age: Int)

fun List<User>.adults() = filter { it.age >= 18 }

fun main() {
    val users = listOf(User("Ada", 36), User("Kai", 15))
    println(users.adults())
}
```

## 6. Scripting

```python
# Python — a generator + comprehension
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

squares = [x * x for x in fib(8)]
print(squares)
```

```ruby
# Ruby — blocks
def repeat(times)
  times.times { |i| yield i }
end

repeat(3) { |i| puts "line #{i}" }
```

```php
<?php
// PHP — an associative array
$user = ["name" => "Ada", "roles" => ["admin", "editor"]];
foreach ($user["roles"] as $role) {
    echo "role: {$role}\n";
}
```

```bash
# Bash — a small script
set -euo pipefail
for f in *.md; do
  wc -l "$f" | awk '{ print $2 ": " $1 " lines" }'
done
```

```shell
# Shell session — commands + output
$ pnpm --filter filemark build
✓ built in 1.12s
$ code --install-extension filemark-0.1.11.vsix --force
Installing extension 'filemark'...
```

## 7. Markdown itself

```md
# A heading

- a bullet
- **bold** and _italic_ and `inline code`

> a blockquote

| col A | col B |
| ----- | ----- |
| 1     | 2     |
```

## 8. Diffs

A plain `diff` fence — added / removed lines are colored by Shiki (`+` green, `-` red):

```diff
 function greet(name) {
-  return "hi " + name;
+  return `hi ${name}`;
 }
```

For a before/after refactor, two labeled blocks each keep their own language highlighting:

**Before**

```ts
const result = items.map((i) => i.foo);
```

**After**

```ts
const result = items.flatMap((i) => i.foo ?? []);
```

## 9. Long lines — wrap vs. scroll

Blocks default to **wrap on**. Click the wrap button in the toolbar to switch to horizontal scroll — useful for long, unbreakable lines like the one below:

```ts
export const CONNECTION_STRING = "postgres://filemark_admin:s3cr3t-p4ssw0rd@db.internal.example.com:5432/filemark_production?sslmode=require&application_name=mdx-viewer&connect_timeout=10";
```

## 10. Unknown / no language

A fence with no language (or a language Shiki doesn't bundle) renders as plain monospace text — still inside the toolbar block, just uncolored:

```
This block has no language tag.
It renders as plain, un-highlighted monospace text.
  Indentation and spacing are preserved verbatim.
```

<Callout type="warning" title="Some fences are NOT code — they become interactive components">

Filemark intercepts a set of fence languages and renders them as rich components instead of highlighted code: `mermaid`, `filetree`, `mindmap`, `schema` / `prisma` / `dbml`, `csv` / `tsv` / `datagrid`, `kanban`, and the chart types (`chart`, `bar`, `line`, `pie`, `area`, `scatter`, `funnel`, `radar`). Everything else — including `json` — is highlighted as code. See the component-specific example docs for those.

</Callout>
