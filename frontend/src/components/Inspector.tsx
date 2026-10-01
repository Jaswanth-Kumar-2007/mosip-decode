import { AlertTriangle, XCircle } from 'lucide-react';
import type { ArtifactKind, Step } from '../types';
import { impl } from '../data/catalog';
import { JsonView } from './JsonView';
import { cx } from './ui';

const CHIPS: Array<{ kind: ArtifactKind; label: string }> = [
  { kind: 'credential_offer', label: 'Credential offer' },
  { kind: 'issuer_metadata', label: 'Issuer metadata' },
  { kind: 'token', label: 'Token exchange' },
  { kind: 'credential', label: 'Issued credential' },
  { kind: 'authorization_request', label: 'Authorization request' },
  { kind: 'presentation_definition', label: 'presentation_definition' },
  { kind: 'vp_token', label: 'vp_token' },
  { kind: 'verification_result', label: 'Verification result' },
];

const DOT = { ok: 'bg-pass', warn: 'bg-signal', error: 'bg-fail' } as const;

export function Inspector({ steps, selectedId, onSelect }: { steps: Step[]; selectedId?: string; onSelect: (id: string) => void }) {
  const selected = steps.find((s) => s.id === selectedId) ?? steps[steps.length - 1];
  return (
    <section className="panel overflow-hidden" aria-label="Protocol inspector">
      <div className="border-b border-line px-4 py-2.5">
        <h2 className="h-section">Protocol inspector</h2>
        <p className="text-[12px] text-ink-muted">Raw payloads exactly as exchanged at each step.</p>
      </div>
      {!steps.length ? (
        <p className="px-4 py-10 text-center text-ink-muted">Nothing exchanged yet. Run a flow to inspect its payloads.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
            {CHIPS.map(({ kind, label }) => {
              const step = steps.find((s) => s.artifact === kind);
              return (
                <button key={kind} disabled={!step} onClick={() => step && onSelect(step.id)}
                  className={cx('chip transition-colors', step ? (selected?.id === step.id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink-faint') : 'border-line bg-paper text-ink-faint')}>
                  {label}
                </button>
              );
            })}
          </div>
          <ol className="scroll-thin max-h-[190px] divide-y divide-line overflow-y-auto border-b border-line">
            {steps.map((s, i) => (
              <li key={s.id}>
                <button onClick={() => onSelect(s.id)} className={cx('flex w-full items-center gap-2.5 px-4 py-1.5 text-left hover:bg-paper', selected?.id === s.id && 'bg-paper')}>
                  <span className={cx('h-2 w-2 shrink-0 rounded-full', DOT[s.status])} />
                  <span className="w-5 shrink-0 text-[12px] text-ink-faint">{i + 1}</span>
                  <span className="flex-1 truncate font-semibold">{s.label}</span>
                  <span className="hidden text-[11.5px] text-ink-muted sm:inline">{s.protocol}</span>
                  <span className="w-12 shrink-0 text-right font-mono text-[11.5px] text-ink-faint">{s.latencyMs} ms</span>
                </button>
              </li>
            ))}
          </ol>
          {selected && (
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{selected.label}</p>
                  <p className="text-[12px] text-ink-muted">{selected.payload?.title ?? 'no payload'} · {selected.protocol} · {selected.latencyMs} ms</p>
                </div>
              </div>
              {selected.note && (
                <p className={cx('flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px]', selected.status === 'warn' ? 'bg-signal/15 text-warn' : 'bg-paper text-ink-soft')}>
                  <AlertTriangle size={14} className={cx('mt-0.5 shrink-0', selected.status !== 'warn' && 'hidden')} />
                  {selected.note}
                </p>
              )}
              {selected.error && (
                <div className="rounded-md border border-fail/30 bg-fail/5 p-2.5 text-[12.5px]">
                  <p className="flex items-center gap-1.5 font-bold text-fail"><XCircle size={14} /> {selected.error.code}</p>
                  <p className="mt-0.5 text-ink-soft">{selected.error.message}</p>
                  <p className="mt-1 text-ink-muted">Layer: {selected.error.layer}. Owner: {(() => { try { return `${impl(selected.error.blame).name} (${impl(selected.error.blame).repo})`; } catch { return selected.error.blame; } })()}</p>
                </div>
              )}
              {selected.payload && <JsonView body={selected.payload.body} />}
            </div>
          )}
        </>
      )}
    </section>
  );
}
