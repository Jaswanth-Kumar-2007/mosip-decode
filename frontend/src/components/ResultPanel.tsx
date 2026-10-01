import type { ReactNode } from 'react';
import { Download } from 'lucide-react';
import type { Run, RunConfig } from '../types';
import { FLOWS, FORMATS, TAMPERS, impl } from '../data/catalog';
import { download, runToMarkdown } from '../engine/report';
import { JsonView } from './JsonView';
import { CopyButton, OutcomePill, cx, fmtTime } from './ui';

const VERDICT_TONE = { VALID: 'text-pass', EXPIRED: 'text-warn', INVALID: 'text-fail' } as const;

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-1.5 last:border-0">
      <dt className="shrink-0 text-ink-muted">{k}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

export function ResultPanel({ run, config, running }: { run?: Run; config: RunConfig; running: boolean }) {
  if (!run) {
    return (
      <section className="panel p-6 text-center text-ink-muted" aria-label="Result">
        {running ? 'Running the flow…' : 'The verification verdict and interoperability report appear here after a run.'}
      </section>
    );
  }
  const c = run.config;
  const v = run.verification;
  const blame = run.error ? (() => { try { return impl(run.error.blame); } catch { return undefined; } })() : undefined;
  const negative = c.tamper !== 'none';

  return (
    <section className="grid gap-4 lg:grid-cols-5" aria-label="Result">
      <div className="panel p-4 lg:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="h-section">{run.scope === 'issue' ? 'Issuance result' : 'Verification verdict'}</h2>
          <OutcomePill value={run.outcome} className="!text-[12px]" />
        </div>

        {run.scope === 'issue' ? (
          <p className="mt-3 text-[22px] font-bold leading-tight">
            {run.outcome === 'FAIL' ? 'Credential not issued' : 'Credential issued and held'}
          </p>
        ) : (
          <p className={cx('mt-3 text-[28px] font-bold leading-none', v ? VERDICT_TONE[v.result] : 'text-ink-muted')}>
            {v ? v.result : 'No verdict'}
            {v?.result === 'EXPIRED' && <span className="ml-2 text-[14px] font-semibold text-ink-muted">valid signature, past its validity period</span>}
          </p>
        )}

        {run.scope !== 'issue' && (
          <p className="mt-2 text-ink-muted">
            {negative
              ? run.outcome === 'FAIL' && !run.error?.code.startsWith('unexpected')
                ? `The ${TAMPERS[c.tamper].label.toLowerCase()} test could not reach a verdict.`
                : `Test mode "${TAMPERS[c.tamper].label}" expects ${run.expected}. The verifier returned ${v?.result ?? 'nothing'}.`
              : `Happy path expects ${run.expected}. The verifier returned ${v?.result ?? 'nothing'}.`}
          </p>
        )}

        {run.error && (
          <div className="mt-3 rounded-lg border border-fail/30 bg-fail/5 p-3">
            <p className="font-bold text-fail">{run.error.code}</p>
            <p className="mt-0.5 text-ink-soft">{run.error.message}</p>
            <p className="mt-1 text-[12px] text-ink-muted">Owner: {blame ? `${blame.name} (${blame.repo})` : run.error.blame}</p>
          </div>
        )}

        {v && (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
            {v.checks.map((ch) => (
              <li key={ch.name} className="flex items-start justify-between gap-3 px-3 py-1.5">
                <span className="flex items-start gap-2">
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', ch.ok ? 'bg-pass' : 'bg-fail')} />
                  <span>{ch.name}</span>
                </span>
                <span className="text-right text-[12px] text-ink-muted">{ch.detail}</span>
              </li>
            ))}
          </ul>
        )}

        {run.credential && (
          <details className="mt-3">
            <summary className="cursor-pointer font-semibold">Issued credential ({FORMATS[run.credential.ctx.format].short}, decoded)</summary>
            <div className="mt-2"><JsonView body={run.credential.artifact.decoded} maxHeight={280} /></div>
          </details>
        )}
      </div>

      <div className="panel p-4 lg:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="h-section">Interoperability report</h2>
          <span className="text-[12px] text-ink-faint">{fmtTime(run.startedAt)}</span>
        </div>
        <dl className="mt-2 text-[13px]">
          <Row k="Issuer">{impl(c.issuerId).name}</Row>
          <Row k="Wallet">{impl(c.walletId).name}</Row>
          <Row k="Verifier">{impl(c.verifierId).name}</Row>
          <Row k="Format">{FORMATS[c.format].label}{c.format === 'ldp_vc' ? ` (VC ${c.vcVersion})` : ''}</Row>
          <Row k="Proof type">{c.proofType}</Row>
          <Row k="DID method">{c.didMethod}</Row>
          <Row k="Flow">{FLOWS[c.flow].label}</Row>
          <Row k="Test mode">{negative ? TAMPERS[c.tamper].label : 'Happy path'}</Row>
          <Row k="Stack version">{c.stackVersion}</Row>
          <Row k="Engine">{run.engine}</Row>
          <Row k="Duration">{(run.durationMs / 1000).toFixed(2)} s</Row>
          <Row k="Outcome"><OutcomePill value={run.outcome} /></Row>
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={runToMarkdown(run)} label="Copy Markdown" />
          <button className="btn btn-ghost !px-2 !py-1 !text-[12px]" onClick={() => download(`${run.id}.json`, JSON.stringify(run, null, 2), 'application/json')}>
            <Download size={13} /> JSON
          </button>
        </div>
      </div>
    </section>
  );
}
