import { useState, useEffect, useRef, useCallback } from 'react';
import { ToolHero, CrossPromo, track } from './kit.js';

// ── Tool types & modes ───────────────────────────────────────────────────────

type AnalysisMode = 'contract' | 'financial' | 'meeting' | 'general';

const MODES: Array<{ id: AnalysisMode; label: string; icon: string; example: string; prompt: string }> = [
  { id: 'contract', label: 'A contract or agreement', icon: '📄', example: 'Lease agreements, service contracts, NDAs, terms of service...', prompt: 'Analyze this contract/agreement. Write your response in plain, simple English that a non-expert can understand. Extract: 1) What each side has to do (obligations), 2) Important dates and deadlines, 3) How much money is involved, 4) Anything that looks unusual or risky — explain WHY it\'s risky in simple terms, 5) Anything important that seems to be missing. Use clear section headings. Avoid legal jargon — if you must use a legal term, explain it in parentheses.' },
  { id: 'financial', label: 'A bill, invoice, or financial document', icon: '💰', example: 'Bank statements, invoices, tax documents, receipts...', prompt: 'Analyze this financial document. Write your response in plain, simple English. Extract: 1) The key numbers — how much, for what, from whom, 2) Is anything getting more expensive or cheaper over time? 3) Anything that looks wrong or suspicious, 4) What the reader should do next, 5) A simple one-paragraph summary at the top. Use clear headings and bullet points.' },
  { id: 'meeting', label: 'Meeting notes or a conversation', icon: '📋', example: 'Email threads, meeting minutes, chat logs, interview notes...', prompt: 'Analyze these notes/transcript. Write your response in plain, simple English. Extract: 1) What was decided, 2) Who needs to do what (action items with names), 3) What\'s still unresolved or needs follow-up, 4) The most important takeaway in one sentence, 5) Suggested next steps. Format with clear headings and keep it scannable.' },
  { id: 'general', label: 'Your website copy or business description', icon: '🔍', example: 'About page, Google Business profile, menu, website text...', prompt: 'Analyze this text. Write your response in plain, simple English that anyone can understand. Provide: 1) A 2-3 sentence summary of what this is about, 2) The most important points (bullet list), 3) Anything concerning or that needs attention, 4) What the reader should do next, 5) Anything else worth noting. Use clear headings. No jargon.' },
];

type Status = 'idle' | 'loading-model' | 'ready' | 'pick-mode' | 'input' | 'analyzing' | 'done' | 'error' | 'unsupported';

// ── Small inline sub-components ──────────────────────────────────────────────

function TrustStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-4 text-xs text-warm-500">
      <span className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
        100% private
      </span>
      <span className="text-warm-700">·</span>
      <span>runs in your browser</span>
      <span className="text-warm-700">·</span>
      <span>no signup</span>
      <span className="text-warm-700">·</span>
      <span>free forever</span>
    </div>
  );
}

function SectionHeader({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="max-w-2xl mx-auto text-center mb-10">
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-widest text-fire-500 mb-2">{eyebrow}</p>
      )}
      <h2 className="text-2xl md:text-3xl font-black text-warm-900 leading-tight">{title}</h2>
      {sub && <p className="mt-3 text-base text-warm-600">{sub}</p>}
    </div>
  );
}

function Accordion({ items }: { items: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className={`rounded-xl border transition-colors ${isOpen ? 'bg-white border-fire-200' : 'bg-white border-warm-200/60 hover:border-warm-300'}`}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-sm md:text-base font-bold text-warm-900">{item.q}</span>
              <svg
                className={`w-4 h-4 flex-shrink-0 text-warm-500 transition-transform ${isOpen ? 'rotate-180 text-fire-500' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <div
              className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm text-warm-600 leading-relaxed">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stepper({ steps }: { steps: Array<{ icon: string; title: string; desc: string }> }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive(a => (a + 1) % steps.length), 3000);
    return () => clearInterval(t);
  }, [paused, steps.length]);

  return (
    <div
      className="grid md:grid-cols-[220px_1fr] gap-6 md:gap-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Left: step list */}
      <div className="space-y-1">
        {steps.map((s, i) => {
          const isActive = i === active;
          return (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-fire-50 border-2 border-fire-400 shadow-sm'
                  : 'bg-white border-2 border-warm-200/60 hover:border-warm-300'
              }`}
            >
              <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-colors ${
                  isActive ? 'bg-fire-500 text-white' : 'bg-warm-100 text-warm-600'
                }`}
              >
                {i + 1}
              </span>
              <span className={`text-sm font-bold ${isActive ? 'text-warm-900' : 'text-warm-600'}`}>
                {s.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: active panel */}
      <div className="bg-white rounded-2xl border-2 border-warm-200/60 p-8 min-h-[220px] flex flex-col justify-center">
        <div className="text-5xl mb-4" aria-hidden="true">{steps[active].icon}</div>
        <h3 className="text-xl font-black text-warm-900 mb-2">
          Step {active + 1}: {steps[active].title}
        </h3>
        <p className="text-base text-warm-600 leading-relaxed">{steps[active].desc}</p>

        {/* Progress dots */}
        <div className="flex gap-2 mt-6">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === active ? 'w-8 bg-fire-500' : 'w-2 bg-warm-300 hover:bg-warm-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function LocalScorePage() {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [mode, setMode] = useState<AnalysisMode | null>(null);
  const [docInput, setDocInput] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const engineRef = useRef<any>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.document.title = 'LocalScore — Score Your Business Online, Privately';
    track('view_tool', { tool: 'local-score' });
    return () => { window.document.title = 'Bilko.run — Tools for Makers Who Ship'; };
  }, []);

  useEffect(() => {
    if (result && resultRef.current) resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [result]);

  const loadModel = useCallback(async () => {
    // Test-only mock engine seam (host-side e2e). Standalone build never trips it.
    if ((window as any).__LOCALSCORE_MOCK_ENGINE) {
      engineRef.current = (window as any).__LOCALSCORE_MOCK_ENGINE;
      setStatus('pick-mode');
      return;
    }
    if (!(navigator as any).gpu) {
      setStatus('unsupported');
      return;
    }
    setStatus('loading-model');
    setProgress('');
    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
      const engine = await CreateMLCEngine('gemma-2-2b-it-q4f16_1-MLC', {
        initProgressCallback: (info: any) => {
          const text = info.text || '';
          setProgress(text);
          const match = text.match(/(\d+)%/);
          if (match) setProgressPct(parseInt(match[1]));
        },
      });
      engineRef.current = engine;
      setStatus('pick-mode');
    } catch (e: any) {
      setStatus('error');
      setError(`Something went wrong setting up. Try refreshing the page, or use Chrome/Edge on a computer.`);
    }
  }, []);

  async function analyze() {
    if (!engineRef.current || !docInput.trim() || !mode) return;
    setStatus('analyzing');
    setResult('');
    setError('');
    const selectedMode = MODES.find(m => m.id === mode)!;
    track('submit_start', { tool: 'local-score', metadata: { mode } });
    try {
      const response = await engineRef.current.chat.completions.create({
        messages: [
          { role: 'system', content: `You are a helpful analyst who explains things in plain, simple English. ${selectedMode.prompt}` },
          { role: 'user', content: `Please analyze this for me:\n\n${docInput.slice(0, 8000)}` },
        ],
        max_tokens: 2048,
        temperature: 0.3,
      });
      const text = response.choices?.[0]?.message?.content ?? 'Sorry, I couldn\'t analyze that. Try pasting something different.';
      setResult(text);
      setStatus('done');
      track('submit_success', { tool: 'local-score', metadata: { mode } });
    } catch (e: any) {
      setStatus('error');
      setError('Something went wrong during analysis. Try a shorter piece of text or refresh the page.');
      track('submit_error', { tool: 'local-score', metadata: { mode, message: e?.message ?? 'error' } });
    }
  }

  function renderResult(text: string) {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;
      if (trimmed.startsWith('## ')) return <h3 key={i} className="text-base font-bold text-warm-900 mt-4 mb-1">{trimmed.slice(3)}</h3>;
      if (trimmed.startsWith('# ')) return <h2 key={i} className="text-lg font-bold text-warm-900 mt-5 mb-2">{trimmed.slice(2)}</h2>;
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) return <p key={i} className="font-bold text-warm-800 mt-3 mb-1">{trimmed.slice(2, -2)}</p>;
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) return <li key={i} className="text-warm-700 ml-4 list-disc">{trimmed.slice(2)}</li>;
      if (/^\d+[\.\)]/.test(trimmed)) return <li key={i} className="text-warm-700 ml-4 list-decimal">{trimmed.replace(/^\d+[\.\)]\s*/, '')}</li>;
      return <p key={i} className="text-warm-700 leading-relaxed">{trimmed}</p>;
    });
  }

  const selectedMode = mode ? MODES.find(m => m.id === mode) : null;

  const scrollToTool = useCallback(() => {
    document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 · HERO + embedded interactive tool
          ═══════════════════════════════════════════════════════════════════════ */}
      <div id="tool">
        <ToolHero
          title="Score your business online — privately"
          tagline="Paste your website copy, menu, or business description. A little AI on your own computer tells you what's strong, what's weak, and what to fix next. Nothing ever leaves your device."
        >
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5 md:p-6 shadow-2xl max-w-2xl mx-auto">
            {/* Step 1: Welcome */}
            {status === 'idle' && (
              <div className="text-center py-8">
                <p className="text-3xl mb-4">🔒</p>
                <h2 className="text-xl font-bold text-white mb-2">Private & Free</h2>
                <p className="text-warm-300 text-sm mb-1">
                  This tool reads your text using AI that runs on <em>your</em> computer.
                </p>
                <p className="text-warm-400 text-xs mb-6">
                  Nothing gets uploaded. Nothing gets sent anywhere. It's just you and the AI.
                </p>
                <button onClick={loadModel}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black rounded-xl shadow-lg transition-all text-lg">
                  Get Started
                </button>
                <p className="text-xs text-warm-500 mt-4">
                  First time takes 1-2 minutes to set up. After that it's instant.
                  <br />Works in Chrome and Edge on a computer.
                </p>
              </div>
            )}

            {/* Step 1b: Setting up */}
            {status === 'loading-model' && (
              <div className="text-center py-10">
                <div className="h-8 w-8 rounded-full border-3 border-green-500 border-t-transparent animate-spin mx-auto mb-5" />
                <p className="text-base text-white font-semibold mb-1">Setting up your private AI...</p>
                <p className="text-sm text-warm-400 mb-4">{progress ? progress.replace(/\[.*?\]/g, '').trim() : 'This only happens once.'}</p>
                {progressPct > 0 && (
                  <div className="max-w-sm mx-auto">
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                    </div>
                    <p className="text-xs text-warm-500">{progressPct}% — almost there</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 1c: Browser not supported */}
            {status === 'unsupported' && (
              <div className="text-center py-8">
                <p className="text-3xl mb-3">😔</p>
                <h2 className="text-lg font-bold text-white mb-2">Your browser can't run this yet</h2>
                <p className="text-warm-400 text-sm mb-4">
                  This tool needs a newer browser. Try one of these on a computer:
                </p>
                <div className="flex gap-3 justify-center">
                  <a href="https://www.google.com/chrome/" target="_blank" rel="noopener noreferrer" className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors">Download Chrome</a>
                  <a href="https://www.microsoft.com/edge" target="_blank" rel="noopener noreferrer" className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors">Download Edge</a>
                </div>
                <p className="text-xs text-warm-500 mt-4">Both are free. This doesn't work on phones yet.</p>
              </div>
            )}

            {/* Step 2: What kind of thing? */}
            {status === 'pick-mode' && (
              <div className="py-4">
                <p className="text-center text-white font-semibold mb-1">Ready! What do you need help with?</p>
                <p className="text-center text-warm-400 text-xs mb-5">Pick the type that's closest. Don't worry about getting it perfect.</p>
                <div className="space-y-2">
                  {MODES.map(m => (
                    <button key={m.id} onClick={() => { setMode(m.id); setStatus('input'); }}
                      className="w-full flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-400/50 transition-all text-left group">
                      <span className="text-2xl mt-0.5">{m.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-green-300 transition-colors">{m.label}</p>
                        <p className="text-xs text-warm-500 mt-0.5">{m.example}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Paste your text */}
            {status === 'input' && selectedMode && (
              <div className="py-4">
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => setStatus('pick-mode')} className="text-warm-500 hover:text-white text-xs">&larr; Back</button>
                  <span className="text-lg">{selectedMode.icon}</span>
                  <span className="text-sm font-bold text-white">{selectedMode.label}</span>
                </div>
                <textarea
                  value={docInput}
                  onChange={e => setDocInput(e.target.value)}
                  placeholder={"Copy the text you want analyzed and paste it here.\n\nYou can paste the whole thing — or just the part you want explained."}
                  rows={10}
                  autoFocus
                  className="w-full px-5 py-4 rounded-xl border-0 bg-white text-warm-900 placeholder:text-warm-400 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 shadow-inner resize-none"
                />
                <button onClick={analyze}
                  disabled={!docInput.trim()}
                  className="w-full mt-3 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-warm-500 disabled:to-warm-600 text-white font-black text-base rounded-xl shadow-lg transition-all disabled:shadow-none">
                  {docInput.trim() ? 'Analyze This' : 'Paste something first...'}
                </button>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <svg className="w-3.5 h-3.5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  <p className="text-xs text-green-400">This stays on your computer. Nothing gets sent anywhere.</p>
                </div>
              </div>
            )}

            {/* Step 3b: Analyzing */}
            {status === 'analyzing' && (
              <div className="text-center py-10">
                <div className="h-8 w-8 rounded-full border-3 border-green-500 border-t-transparent animate-spin mx-auto mb-4" />
                <p className="text-base text-white font-semibold">Reading your text...</p>
                <p className="text-xs text-warm-500 mt-1">This usually takes 15-30 seconds.</p>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div className="text-center py-6">
                <p className="text-3xl mb-3">😕</p>
                <p className="text-warm-300 text-sm mb-2">{error}</p>
                <button onClick={() => { setStatus(engineRef.current ? 'pick-mode' : 'idle'); setError(''); }}
                  className="mt-3 px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors">
                  Try again
                </button>
              </div>
            )}
          </div>

          <TrustStrip />
        </ToolHero>
      </div>

      {/* Results (when tool is used) */}
      {status === 'done' && result && (
        <div ref={resultRef} className="max-w-2xl mx-auto px-6 pt-10 space-y-6 pb-16">
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 text-center animate-slide-up">
            <div className="flex items-center justify-center gap-2 mb-1">
              <svg className="w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              <p className="text-green-700 font-bold">Your text stayed on your computer</p>
            </div>
            <p className="text-xs text-green-600">Nothing was uploaded or sent to any server.</p>
          </div>

          <div className="bg-white rounded-2xl border border-warm-200/60 p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-warm-400 mb-4">
              {selectedMode?.icon} Here's what I found
            </h3>
            <div className="text-sm space-y-1">
              {renderResult(result)}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-slide-up" style={{ animationDelay: '200ms' }}>
            <button onClick={() => { navigator.clipboard.writeText(result); }}
              className="px-5 py-3 border-2 border-warm-200 text-warm-700 hover:bg-warm-50 font-bold rounded-xl transition-colors">
              Copy to clipboard
            </button>
            <button onClick={() => {
              const blob = new Blob([result], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = window.document.createElement('a'); a.href = url; a.download = `analysis-${selectedMode?.id || 'doc'}.txt`; a.click(); URL.revokeObjectURL(url);
            }}
              className="px-5 py-3 border-2 border-warm-200 text-warm-700 hover:bg-warm-50 font-bold rounded-xl transition-colors">
              Save as file
            </button>
            <button onClick={() => { setResult(''); setDocInput(''); setStatus('pick-mode'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="px-5 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors">
              Analyze another
            </button>
          </div>

          <CrossPromo />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2 · "What is this?" — explain-like-I'm-five
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-y border-warm-200/40">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-20">
          <SectionHeader
            eyebrow="What is this?"
            title="Think of it like a calculator app — but for how good your business looks online."
          />
          <div className="space-y-5 text-base md:text-lg text-warm-700 leading-relaxed">
            <p>
              You know how a calculator quietly does math on your phone, without phoning home or asking you to log in?
              LocalScore does the same thing, but for the words that describe your business — your website, your menu,
              your Google Business page, your about section.
            </p>
            <p>
              You paste some text. A tiny, polite helper sitting inside your browser reads it. It tells you what sounds
              strong, what sounds confusing, and what a stranger might miss. Then it suggests simple fixes you can try this week.
            </p>
            <p>
              No account. No uploads. No monthly fee. No "we'll email you later." You don't even need good internet after the first minute.
              <strong className="text-warm-900"> It's just you, your words, and a helpful little brain running on your own machine.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3 · "Why on your device?" — edge computing, simply
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-warm-100/40 border-b border-warm-200/40">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <SectionHeader
            eyebrow="Why on your device?"
            title="Most AI tools send your words to a big computer far away. This one doesn't."
            sub="Here's the difference, with no jargon."
          />

          {/* Contrast diagram */}
          <div className="grid md:grid-cols-2 gap-5 mb-10">
            {/* Old way */}
            <div className="bg-white rounded-2xl border-2 border-warm-200/60 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-warm-200 text-warm-700 text-lg">☁️</span>
                <h3 className="text-lg font-black text-warm-900">The old way</h3>
              </div>
              <div className="flex items-center gap-2 text-sm mb-4">
                <span className="px-3 py-2 bg-warm-100 rounded-lg font-semibold text-warm-700">You</span>
                <span className="text-warm-400">→</span>
                <span className="px-3 py-2 bg-warm-100 rounded-lg font-semibold text-warm-700">Internet</span>
                <span className="text-warm-400">→</span>
                <span className="px-3 py-2 bg-warm-100 rounded-lg font-semibold text-warm-700">Big Server</span>
              </div>
              <ul className="space-y-2 text-sm text-warm-600">
                <li className="flex gap-2"><span className="text-red-500">✗</span> Your words travel the internet</li>
                <li className="flex gap-2"><span className="text-red-500">✗</span> Someone else's computer reads them</li>
                <li className="flex gap-2"><span className="text-red-500">✗</span> Usually costs money per use</li>
                <li className="flex gap-2"><span className="text-red-500">✗</span> Needs an account and a password</li>
                <li className="flex gap-2"><span className="text-red-500">✗</span> Broken internet = broken tool</li>
              </ul>
            </div>

            {/* New way */}
            <div className="bg-white rounded-2xl border-2 border-fire-300 p-6 shadow-md shadow-fire-100">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-fire-100 text-fire-600 text-lg">💻</span>
                <h3 className="text-lg font-black text-warm-900">The new way <span className="text-fire-500">(this tool)</span></h3>
              </div>
              <div className="flex items-center gap-2 text-sm mb-4">
                <span className="px-3 py-2 bg-fire-100 rounded-lg font-semibold text-fire-700">You</span>
                <span className="text-fire-400">→</span>
                <span className="px-3 py-2 bg-fire-100 rounded-lg font-semibold text-fire-700">Your browser</span>
              </div>
              <ul className="space-y-2 text-sm text-warm-600">
                <li className="flex gap-2"><span className="text-green-500">✓</span> Your words never leave your computer</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Nobody else ever sees them</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Free, every single time</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> No account, no password</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Works offline after first load</li>
              </ul>
            </div>
          </div>

          {/* Benefit strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: '🆓', label: 'Free' },
              { icon: '🔒', label: 'Private' },
              { icon: '⚡', label: 'Instant' },
              { icon: '🙅', label: 'No signup' },
              { icon: '✈️', label: 'Offline-ready' },
            ].map(b => (
              <div key={b.label} className="bg-white rounded-xl border border-warm-200/60 px-3 py-4 text-center">
                <div className="text-2xl mb-1">{b.icon}</div>
                <p className="text-xs font-bold text-warm-800">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4 · Interactive "How it works" stepper
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-b border-warm-200/40">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <SectionHeader
            eyebrow="How it works"
            title="Four steps. No forms. No nonsense."
            sub="Hover to pause. Click a step to jump to it."
          />
          <Stepper
            steps={[
              { icon: '👋', title: 'Click Get Started', desc: 'The first time you visit, a tiny AI downloads to your browser. It takes about a minute. After that, it lives in your browser and opens instantly.' },
              { icon: '👉', title: 'Pick what you need', desc: 'Tell it roughly what kind of text you\'re pasting — your website copy, a contract, meeting notes, something else. Just pick the closest match.' },
              { icon: '📋', title: 'Paste your text', desc: 'Open your website, your Google Business page, your about section — copy the text and paste it in. Whole thing or just a chunk, either works.' },
              { icon: '✨', title: 'Read your plain-English results', desc: 'In 15 to 30 seconds you\'ll see what\'s strong, what\'s weak, what\'s risky, and what to fix next. Written like a friend explaining it, not a robot.' },
            ]}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5 · Live demo / CTA
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-fire-50 via-warm-100/50 to-fire-50 border-b border-warm-200/40">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-20 text-center">
          <div className="inline-block text-xs font-bold uppercase tracking-widest text-fire-600 bg-fire-100 px-3 py-1 rounded-full mb-4">
            Try it right now
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-warm-900 leading-tight mb-4">
            The tool is right at the top of this page. Scroll up. Click the green button.
          </h2>
          <p className="text-base text-warm-600 mb-8">
            No reading-this-whole-page required. Takes one click to start.
          </p>
          <button
            onClick={scrollToTool}
            className="inline-flex items-center gap-2 px-7 py-4 bg-fire-500 hover:bg-fire-600 text-white font-black rounded-xl shadow-lg shadow-fire-500/20 transition-all text-base"
          >
            Take me to the tool
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 6 · "Who is this for?" — personas
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-b border-warm-200/40">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <SectionHeader
            eyebrow="Who is this for?"
            title="People who run a small business and don't have time for fancy software."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: '🍝',
                who: 'The restaurant owner',
                pain: '"My website is five years old. I don\'t know if it\'s good or bad. I just know nobody mentions it."',
                help: 'Paste your menu page or about section. Find out if your food sounds appetizing and your hours are clear.',
              },
              {
                icon: '💇',
                who: 'The hairdresser',
                pain: '"I copied my Instagram bio onto my website. It\'s fine, right? Is it fine?"',
                help: 'Paste it in. Learn in 30 seconds whether a new customer would actually know what you do and how to book.',
              },
              {
                icon: '🔧',
                who: 'The plumber',
                pain: '"People Google me, then call the other guy. I don\'t understand what I\'m doing wrong."',
                help: 'Paste your Google Business description. See the missing trust signals and the jargon that scares people off.',
              },
              {
                icon: '☕',
                who: 'The café',
                pain: '"I wrote our story at 11pm last Tuesday. Is it any good? Probably not?"',
                help: 'Paste it. Get a warm, honest read — with one concrete thing to change today to make it land.',
              },
            ].map(p => (
              <div
                key={p.who}
                className="group bg-warm-50/60 hover:bg-white rounded-2xl border border-warm-200/60 hover:border-fire-300 hover:shadow-md p-5 transition-all cursor-default"
              >
                <div className="text-3xl mb-3 transition-transform group-hover:scale-110">{p.icon}</div>
                <h3 className="text-base font-black text-warm-900 mb-2">{p.who}</h3>
                <p className="text-sm text-warm-600 italic mb-3 leading-relaxed">{p.pain}</p>
                <p className="text-sm text-warm-800 leading-relaxed">{p.help}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-warm-500 mt-8">
            Not on the list? You'll still find it useful. It works for anyone who writes words about their business.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 7 · Example use-cases / stories
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-warm-100/40 border-b border-warm-200/40">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <SectionHeader
            eyebrow="Real-ish examples"
            title="Small changes, meaningful lifts."
            sub="Stories like the ones we hear from the shop owners who use this."
          />
          <div className="space-y-6">
            {[
              {
                icon: '🥐',
                name: "Maria's bakery",
                before: 'Scored 42 / 100. Homepage didn\'t say what she baked, only the vibe. No prices. No address above the fold.',
                change: 'Added "Fresh sourdough, daily" to the top. Put the address in the header. Listed 3 bestsellers with prices.',
                after: 'Rescored: 78 / 100. New walk-ins mentioned finding her on Google that week.',
              },
              {
                icon: '✂️',
                name: "Dan's barbershop",
                before: 'Scored 51 / 100. Bio was a wall of text. No booking link. "Old-school vibes" repeated four times.',
                change: 'Cut the bio in half. Added a "Book a chair" button at the top. Swapped two vibe lines for actual services.',
                after: 'Rescored: 81 / 100. Booking link clicks went up noticeably the next week.',
              },
              {
                icon: '🌿',
                name: "Priya's plant shop",
                before: 'Scored 58 / 100. Cute, but nobody could tell she did deliveries or repotting. Menu was photo-only.',
                change: 'Added a one-line "We deliver + repot + babysit your monstera" under the logo. Wrote out services in text.',
                after: 'Rescored: 84 / 100. Got her first "can you repot my ficus?" email within days.',
              },
            ].map(s => (
              <div key={s.name} className="bg-white rounded-2xl border border-warm-200/60 p-6 md:p-7">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{s.icon}</span>
                  <h3 className="text-lg md:text-xl font-black text-warm-900">{s.name}</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-warm-400 mb-1">Before</p>
                    <p className="text-warm-700 leading-relaxed">{s.before}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-fire-500 mb-1">Changed</p>
                    <p className="text-warm-700 leading-relaxed">{s.change}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-green-600 mb-1">After</p>
                    <p className="text-warm-700 leading-relaxed">{s.after}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-warm-400 mt-6 italic">
            Names changed. The pattern is real: small edits, real movement.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 8 · Step-by-step visual guide (placeholders)
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-b border-warm-200/40">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <SectionHeader
            eyebrow="Visual guide"
            title="What each step actually looks like."
            sub="No screenshots yet — just little pictures to give you a feel for the flow."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: 1, emoji: '🟢', title: 'Open LocalScore', caption: 'You see a green button that says Get Started. Click it.' },
              { n: 2, emoji: '📝', title: 'Pick what you\'re pasting', caption: 'Four big friendly buttons. Pick the closest one.' },
              { n: 3, emoji: '📊', title: 'See your score', caption: 'A number out of 100, plus a plain-English summary.' },
              { n: 4, emoji: '🛠️', title: 'Follow the fixes', caption: 'Three small things you can change this week.' },
            ].map(step => (
              <div key={step.n} className="bg-warm-50/60 rounded-2xl border border-warm-200/60 overflow-hidden">
                <div className="aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-warm-100 to-warm-200/60 relative">
                  <span className="text-7xl opacity-80" aria-hidden="true">{step.emoji}</span>
                  <span className="absolute top-3 left-3 w-8 h-8 rounded-full bg-fire-500 text-white flex items-center justify-center text-sm font-black shadow-md">
                    {step.n}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-black text-warm-900 mb-1">{step.title}</h3>
                  <p className="text-xs text-warm-600 leading-relaxed">{step.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 9 · "What you get" — sample report preview
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-warm-100/40 border-b border-warm-200/40">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-20">
          <SectionHeader
            eyebrow="What you get"
            title="A small, friendly report. Not a 40-page PDF."
            sub="Here's what the results actually look like."
          />

          <div className="bg-white rounded-2xl border border-warm-200/60 shadow-sm overflow-hidden">
            {/* Mock score header */}
            <div className="bg-gradient-to-br from-warm-900 to-warm-800 px-6 py-8 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-warm-400 mb-2">Your Score</p>
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-5xl md:text-6xl font-black text-white">72</span>
                <span className="text-xl text-warm-400">/ 100</span>
              </div>
              <span className="inline-block px-3 py-1 bg-yellow-400 text-warm-900 font-black rounded-full text-sm">B — Pretty good</span>
              <p className="text-sm text-warm-300 mt-3 italic">"Clear about what you do. Could show more proof."</p>
            </div>

            {/* Mock pillars */}
            <div className="p-6 space-y-4 border-b border-warm-200/60">
              {[
                { label: 'Clear value', score: 85, bar: 'bg-green-500' },
                { label: 'Trust signals', score: 55, bar: 'bg-yellow-500' },
                { label: 'Call to action', score: 78, bar: 'bg-green-500' },
                { label: 'Plain language', score: 70, bar: 'bg-blue-500' },
              ].map(p => (
                <div key={p.label}>
                  <div className="flex justify-between items-center text-sm mb-1.5">
                    <span className="font-bold text-warm-800">{p.label}</span>
                    <span className="font-mono text-warm-600">{p.score}/100</span>
                  </div>
                  <div className="h-2.5 bg-warm-100 rounded-full overflow-hidden">
                    <div className={`h-full ${p.bar} rounded-full transition-all`} style={{ width: `${p.score}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Mock fixes */}
            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-fire-500 mb-3">Top 3 things to fix this week</p>
              <ol className="space-y-3 text-sm">
                {[
                  'Add 1-2 customer quotes near the top of your page. People trust other humans.',
                  'Your hours are buried at the bottom. Move them to the header.',
                  '"Artisan" appears 6 times. Cut four of them — say what you make instead.',
                ].map((fix, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-fire-100 text-fire-700 flex items-center justify-center text-xs font-black">{i + 1}</span>
                    <span className="text-warm-700 leading-relaxed">{fix}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className="text-center text-xs text-warm-500 mt-4">That's it. A number, four bars, three fixes. Done in under a minute.</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 10 · Tutorial: first 10 minutes
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-b border-warm-200/40">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-20">
          <SectionHeader
            eyebrow="Your first 10 minutes"
            title="A tiny tour, one task at a time."
            sub="Click any task to open it. Do them in order — or don't."
          />
          <Accordion
            items={[
              {
                q: '1. Check your score (2 minutes)',
                a: 'Open your website in another tab. Select all the text on your homepage (Ctrl+A, or Cmd+A on a Mac). Copy it. Come back here, click Get Started, pick "Your website copy," and paste. Read the number at the top — that\'s your starting point. Don\'t panic if it\'s low. Low = room to grow.',
              },
              {
                q: '2. Understand the color bars (1 minute)',
                a: 'Green bars are strong. Yellow bars are okay, could be better. Red bars are weak. You don\'t need every bar to be green. You just need to know which ones hold you back the most right now.',
              },
              {
                q: '3. Pick ONE thing to fix this week (2 minutes)',
                a: 'Look at your top 3 fixes. Pick the easiest one. Not the biggest, not the scariest — the easiest. Write it on a sticky note. Stick it on your screen. Do it before Friday.',
              },
              {
                q: '4. Rescore after you fix it (3 minutes)',
                a: 'Once you\'ve made the change, update your website, then come back, paste the new copy, and rescore. Watch the number move. That movement is the dopamine. That movement is the whole point.',
              },
              {
                q: '5. Show a friend (2 minutes)',
                a: 'Screenshot your before and after scores. Send them to a friend who also runs a small business. They\'ll either get jealous or ask you how. Either way, you win.',
              },
            ]}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 11 · FAQ
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-warm-100/40 border-b border-warm-200/40">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-20">
          <SectionHeader
            eyebrow="Questions people actually ask"
            title="FAQ — no tech-speak allowed."
          />
          <Accordion
            items={[
              { q: 'Does this send my data anywhere?', a: 'No. Never. Your text is read by a tiny AI running inside your own web browser. It has no way to send anything out. We can\'t see it, and neither can anyone else.' },
              { q: 'Do I need to install anything?', a: 'Nope. Just open the page in Chrome or Edge on a computer. The first time, a small brain downloads into your browser (like how a game loads). After that, it opens instantly.' },
              { q: 'Why is it free? What\'s the catch?', a: 'Because your computer does the work, it costs us basically nothing to run. No catch. We built it because we use it ourselves and thought other people should have it too.' },
              { q: 'What if my internet breaks?', a: 'After the first load, you don\'t need the internet. You could disconnect your wi-fi and the tool would still work. Great for cafés with flaky wi-fi.' },
              { q: 'Can I use it on my phone?', a: 'Not yet. Phones don\'t have the right kind of brain chips (yet). Use a laptop or desktop with Chrome or Edge. This will change soon.' },
              { q: 'Is this AI? Like ChatGPT?', a: 'It\'s the same kind of technology, just smaller and running on your own computer. Think of it as a polite, helpful cousin of ChatGPT that you don\'t have to pay or sign up for.' },
              { q: 'Is it as smart as ChatGPT?', a: 'Honestly, not quite. ChatGPT runs on a giant computer. This one runs on yours. For quick honest feedback on your business copy, it\'s plenty. For very complex tasks, you might want a bigger tool.' },
              { q: 'What if I don\'t have a website?', a: 'No problem. Paste your Google Business description, your Instagram bio, your menu, your flyer text — whatever words describe your business. It all works.' },
              { q: 'What does "LocalScore" mean?', a: '"Local" because it runs locally (on your computer, not in the cloud), and because it\'s for local businesses. "Score" because it gives you a number you can track.' },
              { q: 'How private is it, really?', a: 'As private as a Word document on your desktop. The AI lives in your browser tab. Close the tab, it\'s gone. Nothing persists, nothing syncs, nothing phones home.' },
            ]}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 12 · Jargon-buster glossary
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-b border-warm-200/40">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <SectionHeader
            eyebrow="Jargon-buster"
            title="If you've heard these words and nodded politely, here's what they mean."
          />
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { term: 'Edge computing', meaning: 'When the work happens near you (your phone, your laptop) instead of on a far-away server. Faster and more private.' },
              { term: 'WebGPU', meaning: 'A new way for your web browser to use your computer\'s graphics chip for fast AI math. It\'s what makes this tool possible.' },
              { term: 'Local model', meaning: 'An AI brain that lives on your own computer instead of in the cloud. Smaller, private, free to run.' },
              { term: 'The cloud', meaning: 'Fancy word for "someone else\'s computer." When an app is "in the cloud," your stuff is on their machine, not yours.' },
              { term: 'Latency', meaning: 'How long you wait between asking something and getting an answer. Local tools have near-zero latency because there\'s no round trip.' },
              { term: 'Privacy', meaning: 'Your data not leaking to people who didn\'t ask permission. This tool has strong privacy because your text never leaves your browser.' },
              { term: 'Open weights / open model', meaning: 'An AI whose internals are published publicly, so anyone can run it themselves. Gemma (what powers this) is one.' },
              { term: 'Inference', meaning: 'The act of an AI actually answering a question. When you click Analyze, you\'re running inference on your own computer.' },
            ].map(g => (
              <details key={g.term} className="group bg-warm-50/60 rounded-xl border border-warm-200/60 hover:border-fire-300 transition-colors">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-4 py-3">
                  <span className="font-bold text-warm-900 text-sm">{g.term}</span>
                  <svg className="w-4 h-4 text-warm-400 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </summary>
                <p className="px-4 pb-3 text-sm text-warm-600 leading-relaxed">{g.meaning}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 13 · Privacy promise strip
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-green-900 via-green-800 to-warm-900 border-b border-warm-200/40">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-20 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500/20 border border-green-400/40 mb-5">
            <svg className="w-7 h-7 text-green-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-white leading-tight mb-4">
            Nothing leaves your computer. We mean it.
          </h2>
          <p className="text-base md:text-lg text-green-100/90 max-w-xl mx-auto leading-relaxed">
            No uploads. No logging. No analytics on your text. No shadow-writing to a database. When you close the tab,
            your words are gone. You can turn off your wi-fi and it still works.
          </p>
          <p className="text-xs text-green-300/70 mt-6 max-w-md mx-auto italic">
            Technical footnote: the model runs in your browser tab via WebGPU. The only network request is the one-time
            model download on first visit. After that, inference is 100% on-device.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 14 · Final CTA
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-warm-900 leading-tight mb-4">
            Your turn. Score your business in 60 seconds.
          </h2>
          <p className="text-base md:text-lg text-warm-600 mb-8 max-w-xl mx-auto">
            No account. No credit card. No tracking. Just you, your words, and one honest number to start from.
          </p>
          <button
            onClick={scrollToTool}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black rounded-xl shadow-lg text-lg transition-all"
          >
            Get my score — free
          </button>

          <div className="mt-10 pt-8 border-t border-warm-200/60 flex flex-col sm:flex-row items-center justify-center gap-4">
            <p className="text-sm text-warm-600">Know a shop owner who'd like this?</p>
            <button
              onClick={() => {
                const url = window.location.href;
                if (navigator.share) {
                  navigator.share({ title: 'LocalScore', text: 'Score your business online, privately — free, runs on your own computer.', url }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(url);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-800 font-bold rounded-lg text-sm transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
              Share with a friend
            </button>
          </div>

          <p className="text-xs text-warm-400 mt-10">
            Powered by <a href="https://blog.google/technology/developers/gemma-open-models/" target="_blank" rel="noopener noreferrer" className="text-fire-500 hover:underline">Google Gemma</a> running via WebGPU, right in your browser.
          </p>
          <a href="https://bilko.run/products" className="text-sm font-semibold text-fire-500 hover:text-fire-600 mt-3 inline-block">
            Explore more tools &rarr;
          </a>
        </div>
      </section>
    </>
  );
}
