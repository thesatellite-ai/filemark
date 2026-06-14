# @filemark/website

Public marketing site for Filemark at `https://khanakia.com/apps/filemark/`.

| Route | Purpose |
|---|---|
| `/` | Hero + format chips + features + install steps |
| `/privacy` | CWS-required privacy policy URL |
| `/changelog` | Release notes |
| `/demo` | Live, interactive `@filemark/mdx` preview (no install needed) |

Lives inside the filemark monorepo so the demo route can `import { MDXViewer } from "@filemark/mdx"` directly — same source as the extension and desktop host.

## Local dev

```bash
# from repo root, once:
pnpm install
task build:packages       # builds @filemark/{core,mdx,...} so the demo has bundles

# then from apps/website:
task dev                  # http://localhost:5173
```

HMR is on; the demo's MDXViewer hot-reloads as you change source.

## Deploy

```bash
cp .env.example .env      # add CLOUDFLARE_API_TOKEN (aman@khanakia.com scope, "Edit Cloudflare Workers")
task deploy:cf            # build + wrangler deploy to filemark.aman-f4d.workers.dev
```

First-time deploy also requires registering this app in the
`khanakia_com_cfare_gateway` worker so `khanakia.com/apps/filemark/*` routes here:

```
# in khanakia_com_cfare_gateway/apps-registry.csv
apps/filemark,https://filemark.aman-f4d.workers.dev
```

then push the gateway KV (per its own runbook).

## Why nested `dist-cf/apps/filemark/`

The edge gateway forwards `khanakia.com/apps/filemark/*` UNCHANGED — the origin must serve at exactly `/apps/filemark/`. Vite `base: '/apps/filemark/'` makes asset URLs absolute under that path; `task build:cf` physically nests `dist/` under `dist-cf/apps/filemark/` so the file layout matches the URL.
