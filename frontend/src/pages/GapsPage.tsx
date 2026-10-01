import { useMemo } from 'react';
import type { Run } from '../types';
import { FORMATS, IMPLS, impl } from '../data/catalog';
import { collectGaps, issueDraft } from '../engine/report';
import { CopyButton, Empty } from '../components/ui';

const CATEGORY: Record<string, string> = {
  unsupported_credential_format: 'Format mismatch',
  wallet_unsupported_format: 'Format mismatch',
  verifier_unsupported_format: 'Format mismatch',
  no_matching_credential: 'Proof-type incompatibility',
  did_resolution_failed: 'DID method gap',
  qr_capacity_exceeded: 'QR size limit',
  wallet_flow_unsupported: 'Presentation flow gap',
  unexpected_verification_result: 'Verifier behaviour',
};

export function GapsPage({ runs }: { runs: Run[] }) {
  const gaps = useMemo(() => collectGaps(runs), [runs]);

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <h2 className="h-section">Interoperability gaps</h2>
        <p className="mt-0.5 max-w-3xl text-ink-muted">
          Failures from your recorded runs, grouped by error code and the module that owns the gap. Each group comes with a ready-to-file GitHub issue draft. Confirm a gap against the live stack before filing.
        </p>
      </section>

      {!gaps.length ? (
        <Empty title="No gaps recorded" body="Run the test suite across several issuers, wallets and verifiers. Every failing combination is grouped here." />
      ) : (
        gaps.map((g) => {
          const blame = (() => { try { return impl(g.blame); } catch { return undefined; } })();
          return (
            <article key={g.key} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-mono text-[14px] font-semibold">{g.code}</h3>
                    <span className="chip border-line bg-paper text-ink-muted">{CATEGORY[g.code] ?? 'Other'}</span>
                    <span className="chip border-fail/30 bg-fail/10 text-fail">{g.runs.length} run{g.runs.length > 1 ? 's' : ''}</span>
                  </div>
                  <p className="mt-1 text-ink-soft">{g.message}</p>
                  <p className="mt-1 text-[12.5px] text-ink-muted">Owner: {blame ? `${blame.name} (${blame.repo})` : g.blame}</p>
                </div>
                <CopyButton text={issueDraft(g)} label="Copy issue draft" />
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {g.runs.slice(0, 6).map((r) => (
                  <li key={r.id} className="chip border-line bg-white text-ink-soft">
                    {impl(r.config.issuerId).name} / {impl(r.config.walletId).name} / {impl(r.config.verifierId).name} · {FORMATS[r.config.format].short}
                  </li>
                ))}
                {g.runs.length > 6 && <li className="chip border-line bg-paper text-ink-muted">+{g.runs.length - 6} more</li>}
              </ul>
              <details className="mt-3">
                <summary className="cursor-pointer font-semibold">Issue draft</summary>
                <pre className="scroll-thin mt-2 max-h-72 overflow-auto rounded-lg bg-ink-bench p-3 font-mono text-[12px] text-slate-200" style={{ whiteSpace: 'pre-wrap' }}>{issueDraft(g)}</pre>
              </details>
            </article>
          );
        })
      )}

      <section className="panel overflow-x-auto p-4">
        <h2 className="h-section">Capability profiles used by the simulator</h2>
        <p className="mt-0.5 text-ink-muted">These are assumptions, not verified facts. Edit <code className="font-mono">src/data/catalog.ts</code> to match what you observe on the real stack.</p>
        <table className="mt-3 w-full min-w-[720px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              {['Module', 'Role', 'Formats', 'Proofs', 'DID methods', 'Flows'].map((h) => <th key={h} className="py-2 pr-3 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {IMPLS.map((i) => (
              <tr key={i.id} className="border-b border-line align-top last:border-0">
                <td className="py-2 pr-3 font-semibold">{i.name}</td>
                <td className="py-2 pr-3">{i.role}</td>
                <td className="py-2 pr-3">{i.formats.map((f) => `${FORMATS[f].short}${i.experimental?.includes(f) ? ' (mock)' : ''}`).join(', ')}</td>
                <td className="py-2 pr-3">{i.proofs ? Object.entries(i.proofs).map(([f, p]) => `${FORMATS[f as keyof typeof FORMATS].short}: ${p?.join(' / ')}`).join('; ') : '-'}</td>
                <td className="py-2 pr-3">{i.dids?.join(', ') ?? '-'}</td>
                <td className="py-2 pr-3">{i.flows?.join(', ') ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
