# LocalScore

Static-path frontend at **bilko.run/projects/local-score/**. Private document analyzer — runs entirely client-side via WebGPU + Gemma 2B (web-llm). Documents never leave the browser.

## Layout
- `src/main.tsx` — React mount point.
- `src/LocalScorePage.tsx` — the page.
- `src/kit.tsx` — slim `track()` + tool-page helpers; mirrors a subset of the host's `~/Projects/Bilko/src/components/tool-page/`.
- `src/index.css` — Tailwind + palette.

## Commands
- `pnpm dev` — local on `http://localhost:5173`.
- `pnpm build` — emit `dist/`. Bundle is ~6MB because of web-llm; `chunkSizeWarningLimit: 8000` is intentional.
- `pnpm sync` — `rm -rf ../Bilko/public/projects/local-score && cp -r dist ../Bilko/public/projects/local-score`.

## Deploy
Static-path sibling of Bilko. After `pnpm build && pnpm sync`, commit + push from `~/Projects/Bilko` to both remotes; Render redeploys ~60–90s. Or use the `bilko-host` MCP from this session.

## Conventions
- 100% client-side. **Never add a network call that sends document content** — that breaks the privacy guarantee on which the product is sold. Analytics events (`track()` → `/api/analytics/event` same-origin) are metadata only.
- Cross-promo links go to `https://bilko.run/products/<slug>` (full reload back to host, by design).
- Vite `base: '/projects/local-score/'`.
- See `~/Projects/Bilko/docs/host-contract.md` for the static-path contract.
