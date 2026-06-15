import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// SPA + prerender. The four marketing routes (home, features, changelog,
// privacy) get prerendered to static HTML at build time — real per-route
// title / meta / OG / canonical and full rendered body. The demo routes
// (ssr: false in demo.tsx) stay client-rendered against the SPA shell.
// Output goes to dist/ as static files; no Cloudflare Worker runtime is
// needed — the existing gateway routes khanakia.com/apps/filemark/* to a
// Static Assets binding.
const config = defineConfig({
  // The Cloudflare gateway forwards khanakia.com/apps/filemark/* to this
  // app's Static Assets binding unchanged — base prefixes every asset
  // URL in the built HTML so /assets/* resolves under /apps/filemark/.
  base: '/apps/filemark/',
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart({
      spa: { enabled: true },
      pages: [
        { path: '/' },
        { path: '/features' },
        { path: '/changelog' },
        { path: '/privacy' },
      ],
    }),
    viteReact(),
  ],
})

export default config
