import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { EXAMPLE_IDS } from './src/playground/examples/ids'

// SPA + prerender. EVERY route is prerendered to a static HTML file at build
// time — marketing pages get real SSR bodies; the demo routes (ssr:false) get
// hydration shells. Prerendering everything means there are no SPA-fallback-
// only routes, so the Cloudflare assets binding can use
// `not_found_handling: "404-page"` (real 404 status for unknown paths) instead
// of "single-page-application" (which served index.html + 200 for everything →
// soft-404s). Gallery pages come from EXAMPLE_IDS so the list can't drift.
const galleryPages = EXAMPLE_IDS.map((id) => ({
  path: `/demo/gallery/${id}`,
}))
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
        { path: '/ai' },
        { path: '/brand' },
        { path: '/changelog' },
        { path: '/privacy' },
        { path: '/demo' },
        { path: '/demo/play' },
        ...galleryPages,
      ],
    }),
    viteReact(),
  ],
})

export default config
