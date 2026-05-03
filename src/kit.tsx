import { type ReactNode } from 'react';

// Slim local replacements for the host's tool-page kit. LocalScore lives at
// /projects/local-score/ on bilko.run and links back to the host for cross-promo.
const HOST = 'https://bilko.run';

// ── Hero ──────────────────────────────────────────────────────────
export function ToolHero({ title, tagline, children }: {
  title: string;
  tagline: string;
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40" />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.18), transparent 70%)' }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative max-w-3xl mx-auto px-6 py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-4 text-base md:text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
          {tagline}
        </p>
        <div className="mt-6">{children}</div>
        <p className="mt-4 text-xs text-slate-500 flex items-center justify-center gap-2">
          <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          100% in-browser &middot; No server &middot; No data leaves your machine
        </p>
      </div>
    </section>
  );
}

// ── Cross-promo (links back to host) ──────────────────────────────
interface PromoItem { slug: string; name: string; hook: string; staticPath?: boolean }
const CROSS_PROMO: readonly PromoItem[] = [
  { slug: 'page-roast', name: 'PageRoast', hook: "Different mode: roast a public landing page from a URL." },
  { slug: 'outdoor-hours', name: 'OutdoorHours', hook: 'Like data that runs in your browser? Try OutdoorHours: 10 yrs of weather, scored.', staticPath: true },
];

export function CrossPromo() {
  return (
    <div className="mt-16 max-w-3xl mx-auto px-6">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">More on bilko.run</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {CROSS_PROMO.map(p => {
          const href = p.staticPath ? `${HOST}/projects/${p.slug}/` : `${HOST}/products/${p.slug}`;
          return (
            <a
              key={p.slug}
              href={href}
              className="block bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-400/40 rounded-xl p-4 transition-all"
            >
              <div className="text-emerald-400 font-semibold">{p.name}</div>
              <p className="text-sm text-slate-400 mt-1">{p.hook}</p>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── Analytics (POST to host's /api) ──────────────────────────────
const API = `${HOST}/api`;

let visitorId: string | null = null;
function getVisitorId(): string {
  if (visitorId) return visitorId;
  try {
    let v = localStorage.getItem('bilko_visitor_id');
    if (!v) { v = crypto.randomUUID(); localStorage.setItem('bilko_visitor_id', v); }
    visitorId = v;
    return v;
  } catch {
    return 'anon';
  }
}

let sessionId: string | null = null;
function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    sessionId = sessionStorage.getItem('bilko_session_id') ?? crypto.randomUUID();
    sessionStorage.setItem('bilko_session_id', sessionId);
    return sessionId;
  } catch {
    return 'anon';
  }
}

export function track(event: string, props?: { tool?: string; path?: string; metadata?: unknown }): void {
  try {
    const body = JSON.stringify({
      event,
      tool: props?.tool ?? 'local-score',
      path: props?.path ?? window.location.pathname,
      metadata: props?.metadata ?? null,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
    });
    const url = `${API}/analytics/event`;
    if (typeof navigator?.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch { /* ignore — analytics must never break the app */ }
}
