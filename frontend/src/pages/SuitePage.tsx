import { useMemo, useRef, useState } from 'react';
import { Download, FlaskConical, Square } from 'lucide-react';
import type { Flow, FormatId, Run, RunConfig, TamperMode } from '../types';
import { FLOWS, FORMATS, IMPLS, TAMPERS, impl, normalizeConfig } from '../data/catalog';
import { buildRun } from '../engine/simulator';
import { download, matrixToMarkdown } from '../engine/report';
import { CopyButton, OutcomePill, cx } from '../components/ui';

interface Props { base: RunConfig; onAddRuns: (runs: Run[]) => void; onOpen: (cfg: RunConfig) => void; live: boolean }

function Toggle<T extends string>({ title, all, value, onChange, label }: { title: string; all: T[]; value: T[]; onChange: (v: T[]) => void; label: (v: T) => string }) {
  return (
    <fieldset className="min-w-0">
      <legend className="label">{title}</legend>
      <div className="flex flex-wrap gap-1.5">
        {all.map((a) => {
          const on = value.includes(a);
          return (
            <button key={a} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== a) : [...value, a])}
              className={cx('chip !px-2.5 !py-1 !text-[12px] transition-colors', on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-muted hover:border-ink-faint')}>
              {label(a)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const ids = (role: 'issuer' | 'wallet' | 'verifier') => IMPLS.filter((i) => i.role === role).map((i) => i.id);

export function SuitePage({ base, onAddRuns, onOpen, live }: Props) {
  const [issuers, setIssuers] = useState(ids('issuer'));
  const [wallets, setWallets] = useState(ids('wallet'));
  const [verifiers, setVerifiers] = useState(ids('verifier'));
  const [formats, setFormats] = useState<FormatId[]>(['ldp_vc', 'vc+sd-jwt']);
  const [flows, setFlows] = useState<Flow[]>(['same-device']);
  const [tampers, setTampers] = useState<TamperMode[]>(['none']);
  const [results, setResults] = useState<Run[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [fmtTab, setFmtTab] = useState<FormatId | null>(null);
  const stop = useRef(false);

  const combos = useMemo(() => {
    const out: RunConfig[] = [];
    for (const i of issuers) for (const w of wallets) for (const v of verifiers) for (const f of formats) for (const fl of flows) for (const t of tampers) {
      out.push(normalizeConfig({ ...base, issuerId: i, walletId: w, verifierId: v, format: f, flow: fl, tamper: t, proofType: '', didMethod: '', requestMode: 'by_reference' }));
    }
    return out;
  }, [issuers, wallets, verifiers, formats, flows, tampers, base]);

  const run = async () => {
    stop.current = false;
    setResults([]);
    const suiteId = `suite-${Date.now().toString(36)}`;
    const started = new Date().toISOString();
    const acc: Run[] = [];
    for (let i = 0; i < combos.length; i++) {
      if (stop.current) break;
      const cfg = combos[i];
      const r = buildRun(cfg, 'full', null);
      // Keep storage small: drop payloads except on the failing step (needed for issue drafts), and the credential.
      const steps = r.steps.map((s) => (s.status === 'error' ? s : { ...s, payload: undefined }));
      acc.push({ ...r, steps, credential: undefined, id: `${suiteId}-${i}`, startedAt: started, scope: 'full', config: cfg, engine: 'simulated', suiteId });
      if (i % 12 === 0) { setProgress({ done: i + 1, total: combos.length }); await new Promise((res) => setTimeout(res, 0)); }
    }
    setResults(acc);
    setProgress(null);
    onAddRuns(acc);
  };

  const shown = results.filter((r) => r.config.format === (fmtTab ?? formats[0]));
  const rowKeys = [...new Set(shown.map((r) => `${r.config.issuerId}|${r.config.walletId}|${r.config.flow}|${r.config.tamper}`))];
  const colKeys = [...new Set(shown.map((r) => r.config.verifierId))];
  const cell = (row: string, col: string) => shown.find((r) => `${r.config.issuerId}|${r.config.walletId}|${r.config.flow}|${r.config.tamper}` === row && r.config.verifierId === col);
  const tally = { PASS: 0, WARN: 0, FAIL: 0 };
  results.forEach((r) => { tally[r.outcome] += 1; });

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <h2 className="h-section">Interoperability test suite</h2>
        <p className="mt-0.5 max-w-3xl text-ink-muted">
          Runs every combination you pick through the full issue, hold, present and verify cycle and fills a compatibility matrix. {live ? 'The suite always uses the simulated engine in the browser. Use the CI harness described in the README for live nightly runs.' : 'The same matrix can run nightly against the Collab sandbox through the BFF.'}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Toggle title="Issuers" all={ids('issuer')} value={issuers} onChange={setIssuers} label={(i) => impl(i).name} />
          <Toggle title="Wallets" all={ids('wallet')} value={wallets} onChange={setWallets} label={(i) => impl(i).name} />
          <Toggle title="Verifiers" all={ids('verifier')} value={verifiers} onChange={setVerifiers} label={(i) => impl(i).name} />
          <Toggle title="Formats" all={Object.keys(FORMATS) as FormatId[]} value={formats} onChange={setFormats} label={(f) => FORMATS[f].short} />
          <Toggle title="Presentation flows" all={Object.keys(FLOWS) as Flow[]} value={flows} onChange={setFlows} label={(f) => FLOWS[f].label} />
          <Toggle title="Test modes" all={Object.keys(TAMPERS) as TamperMode[]} value={tampers} onChange={setTampers} label={(t) => TAMPERS[t].label} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" disabled={!!progress || !combos.length} onClick={run}><FlaskConical size={15} /> Run {combos.length} combinations</button>
          {progress && (
            <>
              <button className="btn btn-danger" onClick={() => { stop.current = true; }}><Square size={13} /> Stop</button>
              <span className="text-ink-muted">{progress.done} / {progress.total}</span>
            </>
          )}
          {combos.length > 600 && <span className="text-warn">Large suite, this may take a moment.</span>}
        </div>
      </section>

      {results.length > 0 && (
        <section className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="h-section">Compatibility matrix</h2>
              <OutcomePill value="PASS" /> <span className="-ml-1.5 font-semibold">{tally.PASS}</span>
              <OutcomePill value="WARN" /> <span className="-ml-1.5 font-semibold">{tally.WARN}</span>
              <OutcomePill value="FAIL" /> <span className="-ml-1.5 font-semibold">{tally.FAIL}</span>
            </div>
            <div className="flex gap-2">
              <CopyButton text={matrixToMarkdown(results)} label="Copy Markdown" />
              <button className="btn btn-ghost !px-2 !py-1 !text-[12px]" onClick={() => download('interop-matrix.md', matrixToMarkdown(results), 'text/markdown')}><Download size={13} /> .md</button>
              <button className="btn btn-ghost !px-2 !py-1 !text-[12px]" onClick={() => download('interop-matrix.json', JSON.stringify(results, null, 2), 'application/json')}><Download size={13} /> .json</button>
            </div>
          </div>

          <div className="mt-3 flex gap-1" role="tablist" aria-label="Matrix format">
            {formats.map((f) => (
              <button key={f} role="tab" aria-selected={(fmtTab ?? formats[0]) === f} onClick={() => setFmtTab(f)}
                className={cx('rounded-md px-3 py-1.5 font-semibold', (fmtTab ?? formats[0]) === f ? 'bg-ink text-white' : 'text-ink-muted hover:bg-paper')}>
                {FORMATS[f].label}
              </button>
            ))}
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className="sticky left-0 border-b border-line bg-white px-3 py-2 text-left">Issuer to wallet</th>
                  {colKeys.map((c) => <th key={c} className="border-b border-line px-3 py-2 text-left">{impl(c).name}</th>)}
                </tr>
              </thead>
              <tbody>
                {rowKeys.map((rk) => {
                  const [i, w, fl, t] = rk.split('|');
                  return (
                    <tr key={rk}>
                      <td className="sticky left-0 border-b border-line bg-white px-3 py-2">
                        <p className="font-semibold">{impl(i).name} → {impl(w).name}</p>
                        <p className="text-[11.5px] text-ink-muted">{FLOWS[fl as Flow].label}{t !== 'none' ? ` · ${TAMPERS[t as TamperMode].label}` : ''}</p>
                      </td>
                      {colKeys.map((ck) => {
                        const r = cell(rk, ck);
                        return (
                          <td key={ck} className="border-b border-line px-3 py-2">
                            {r ? (
                              <button className="text-left" onClick={() => onOpen(r.config)} title="Open this configuration in the playground">
                                <OutcomePill value={r.outcome} />
                                {r.error && <p className="mt-0.5 max-w-[190px] truncate text-[11.5px] text-ink-muted">{r.error.code}</p>}
                              </button>
                            ) : <span className="text-ink-faint">-</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
