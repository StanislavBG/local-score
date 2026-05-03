# LocalScore

Standalone Vite + React frontend for the LocalScore tool at https://bilko.run/projects/local-score/.

Hosted on bilko.run via the **static-path** contract (see `~/Projects/Bilko/docs/host-contract.md`):
- This repo builds to `dist/`.
- `pnpm sync` copies `dist/` into `~/Projects/Bilko/public/projects/local-score/`.
- Bilko serves the bundle at `/projects/local-score/`.
- Analytics POST to `/api/analytics/event` — same origin, no CORS.
- Cross-promo links jump to `https://bilko.run/products/<slug>` (full reload back to host).

100% client-side: documents never leave the browser. WebGPU + Gemma 2B via web-llm.

## Develop

```
pnpm install
pnpm dev
```

## Ship

```
pnpm build && pnpm sync
cd ../Bilko && git add public/projects/local-score && git commit -m "LocalScore: ..."
```
