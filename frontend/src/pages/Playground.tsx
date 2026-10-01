import { Layers, Play, RotateCcw, ShieldCheck, Square, Trash2 } from 'lucide-react';
import type { HeldCredential, Run, RunConfig, Scope, Step } from '../types';
import { FORMATS, impl } from '../data/catalog';
import { ConfigBar } from '../components/ConfigBar';
import { RolePicker } from '../components/RolePicker';
import { RunView } from '../components/RunView';
import { cx, fmtTime } from '../components/ui';

export interface Live { steps: Step[]; running: boolean; config: RunConfig; run?: Run; error?: string }

interface Props {
  cfg: RunConfig;
  setCfg: (c: RunConfig) => void;
  live: Live | null;
  held: HeldCredential[];
  onStart: (scope: Scope) => void;
  onStop: () => void;
  onRemoveHeld: (id: string) => void;
  onClearHeld: () => void;
  simulated: boolean;
}

export function Playground({ cfg, setCfg, live, held, onStart, onStop, onRemoveHeld, onClearHeld, simulated }: Props) {
  const running = !!live?.running;
  const walletHeld = held.filter((h) => h.walletId === cfg.walletId);
  const canPresent = walletHeld.some((h) => h.ctx.format === cfg.format);
  const wallet = impl(cfg.walletId);

  return (
    <div className="space-y-4">
      <RolePicker cfg={cfg} onChange={(patch) => setCfg({ ...cfg, ...patch })} />
      <ConfigBar cfg={cfg} onChange={setCfg} />

      <section className="panel p-4" aria-label="Run controls">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary" disabled={running} onClick={() => onStart('full')}>
            <Play size={15} /> Run full cycle
          </button>
          <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
          <button className="btn btn-ghost" disabled={running} onClick={() => onStart('issue')}>
            <Layers size={15} /> Issue a credential
          </button>
          <button className="btn btn-ghost" disabled={running || !canPresent} onClick={() => onStart('present')}
            title={canPresent ? undefined : `Issue a ${FORMATS[cfg.format].short} credential into ${wallet.name} first`}>
            <ShieldCheck size={15} /> Present and verify
          </button>
          {running && (
            <button className="btn btn-danger" onClick={onStop}><Square size={13} /> Stop</button>
          )}
          <button className="btn btn-ghost ml-auto" disabled={running} onClick={() => setCfg({ ...cfg, tamper: 'none' })} title="Back to the happy path">
            <RotateCcw size={14} /> Reset test mode
          </button>
        </div>
        {!canPresent && <p className="mt-2 text-[12.5px] text-ink-muted">{wallet.name} holds no {FORMATS[cfg.format].short} credential yet. Run the full cycle, or issue one first.</p>}

        <div className="mt-4 border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <h2 className="h-section">Held in {wallet.name}</h2>
            {walletHeld.length > 0 && (
              <button className="btn btn-ghost !px-2 !py-1 !text-[12px]" onClick={onClearHeld}><Trash2 size={13} /> Clear wallets</button>
            )}
          </div>
          {!walletHeld.length ? (
            <p className="mt-1 text-ink-muted">Nothing yet. Issued credentials stay here so you can present them repeatedly, with and without tampering.</p>
          ) : (
            <ul className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {walletHeld.slice(0, 6).map((h) => (
                <li key={h.id} className={cx('flex items-center justify-between gap-2 rounded-lg border px-3 py-2', h.ctx.format === cfg.format ? 'border-ink-faint bg-paper' : 'border-line')}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{h.ctx.credentialType}</p>
                    <p className="truncate text-[12px] text-ink-muted">{FORMATS[h.ctx.format].short} · {h.ctx.proofType} · {impl(h.issuerId).name}</p>
                    <p className="text-[11.5px] text-ink-faint">{fmtTime(h.issuedAt)}</p>
                  </div>
                  <button aria-label="Remove credential" className="rounded p-1 text-ink-faint hover:bg-white hover:text-fail" onClick={() => onRemoveHeld(h.id)}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {live?.error && <p className="rounded-lg border border-fail/30 bg-fail/5 p-3 font-semibold text-fail">Run failed to start: {live.error}</p>}

      <RunView config={live?.config ?? cfg} steps={live?.steps ?? []} running={running} run={live?.run} simulated={simulated} />
    </div>
  );
}
