import { useCallback, useMemo, useRef, useState } from 'react';
import type { HeldCredential, Run, RunConfig, Scope } from './types';
import { DEFAULT_CONFIG, normalizeConfig } from './data/catalog';
import { liveEngine, simulatedEngine } from './engine/engine';
import { useLocalStorage } from './hooks';
import { Header, type Tab } from './components/Header';
import { Playground, type Live } from './pages/Playground';
import { SuitePage } from './pages/SuitePage';
import { HistoryPage } from './pages/HistoryPage';
import { GapsPage } from './pages/GapsPage';
import { ConnectPage, type Settings } from './pages/ConnectPage';

const MAX_RUNS = 150;

export default function App() {
  const [tab, setTab] = useState<Tab>('playground');
  const [cfg, setCfg] = useLocalStorage<RunConfig>('inji.cfg.v1', DEFAULT_CONFIG);
  const [settings, setSettings] = useLocalStorage<Settings>('inji.settings.v1', { mode: 'simulated', bffUrl: '/bff' });
  const [runs, setRuns] = useLocalStorage<Run[]>('inji.runs.v1', []);
  const [held, setHeld] = useLocalStorage<HeldCredential[]>('inji.held.v1', []);
  const [live, setLive] = useState<Live | null>(null);
  const abort = useRef<AbortController | null>(null);

  const engine = useMemo(() => (settings.mode === 'live' ? liveEngine(settings.bffUrl) : simulatedEngine), [settings]);
  const safeCfg = useMemo(() => normalizeConfig(cfg), [cfg]);

  const start = useCallback(async (scope: Scope) => {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    const config = safeCfg;
    const startedAt = new Date().toISOString();
    setLive({ steps: [], running: true, config });
    try {
      const heldCred = held.find((h) => h.walletId === config.walletId && h.ctx.format === config.format) ?? null;
      const result = await engine.execute({ cfg: config, scope, held: heldCred }, {
        signal: ctl.signal,
        onStep: (s) => setLive((l) => (l ? { ...l, steps: [...l.steps, s] } : l)),
      });
      const run: Run = { ...result, id: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, startedAt, scope, config, engine: engine.id };
      setLive({ steps: result.steps, running: false, config, run });
      setRuns((r) => [run, ...r].slice(0, MAX_RUNS));
      if (result.credential) setHeld((h) => [result.credential as HeldCredential, ...h].slice(0, 40));
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === 'AbortError';
      setLive((l) => (l ? { ...l, running: false, error: aborted ? undefined : e instanceof Error ? e.message : String(e) } : l));
    }
  }, [safeCfg, held, engine, setRuns, setHeld]);

  const stop = () => abort.current?.abort();
  const openInPlayground = (c: RunConfig) => { setCfg(normalizeConfig(c)); setLive(null); setTab('playground'); };

  return (
    <div className="min-h-screen">
      <Header tab={tab} onTab={setTab} live={settings.mode === 'live'} runCount={runs.length} />
      <main className="mx-auto max-w-[1400px] px-4 py-5">
        {tab === 'playground' && (
          <Playground cfg={safeCfg} setCfg={(c) => setCfg(c)} live={live} held={held} onStart={start} onStop={stop}
            onRemoveHeld={(id) => setHeld((h) => h.filter((x) => x.id !== id))} onClearHeld={() => setHeld([])} simulated={settings.mode === 'simulated'} />
        )}
        {tab === 'suite' && <SuitePage base={safeCfg} live={settings.mode === 'live'} onOpen={openInPlayground} onAddRuns={(rs) => setRuns((r) => [...rs, ...r].slice(0, MAX_RUNS))} />}
        {tab === 'history' && <HistoryPage runs={runs} onClear={() => setRuns([])} onLoad={openInPlayground} />}
        {tab === 'gaps' && <GapsPage runs={runs} />}
        {tab === 'connect' && <ConnectPage settings={settings} onChange={setSettings} />}
      </main>
      <footer className="mx-auto max-w-[1400px] px-4 pb-8 text-[12px] text-ink-faint">
        Built for MOSIP Decode, problem 02. Simulated runs follow the OpenID4VCI / OpenID4VP message shapes but do not contact real Inji services.
      </footer>
    </div>
  );
}
