import { useMemo, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import type { FormatId, Outcome, Run, RunConfig } from '../types';
import { FORMATS, IMPLS, impl } from '../data/catalog';
import { download } from '../engine/report';
import { RunView } from '../components/RunView';
import { Empty, OutcomePill, cx, fmtTime } from '../components/ui';

type Tally = Record<Outcome, number>;
const tally = (runs: Run[]): Tally => runs.reduce((t, r) => ({ ...t, [r.outcome]: t[r.outcome] + 1 }), { PASS: 0, WARN: 0, FAIL: 0 });

function StackBar({ title, groups }: { title: string; groups: Record<string, Tally> }) {
  const entries = Object.entries(groups);
  return (
    <div className="panel p-4">
      <h3 className="h-section">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {entries.map(([k, t]) => {
          const total = t.PASS + t.WARN + t.FAIL;
          return (
            <li key={k}>
              <div className="flex justify-between text-[12.5px]"><span className="truncate font-semibold">{k}</span><span className="text-ink-muted">{Math.round((t.PASS / total) * 100)}% pass of {total}</span></div>
              <div className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-paper" role="img" aria-label={`${t.PASS} pass, ${t.WARN} warn, ${t.FAIL} fail`}>
                <span className="bg-pass" style={{ width: `${(t.PASS / total) * 100}%` }} />
                <span className="bg-signal" style={{ width: `${(t.WARN / total) * 100}%` }} />
                <span className="bg-fail" style={{ width: `${(t.FAIL / total) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function group(runs: Run[], key: (r: Run) => string): Record<string, Tally> {
  const out: Record<string, Run[]> = {};
  runs.forEach((r) => { (out[key(r)] ??= []).push(r); });
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, tally(v)]));
}

export function HistoryPage({ runs, onClear, onLoad }: { runs: Run[]; onClear: () => void; onLoad: (c: RunConfig) => void }) {
  const [version, setVersion] = useState('all');
  const [format, setFormat] = useState<'all' | FormatId>('all');
  const [outcome, setOutcome] = useState<'all' | Outcome>('all');
  const [verifier, setVerifier] = useState('all');
  const [openId, setOpenId] = useState<string | undefined>(undefined);

  const versions = useMemo(() => [...new Set(runs.map((r) => r.config.stackVersion))], [runs]);
  const filtered = runs.filter((r) =>
    (version === 'all' || r.config.stackVersion === version) &&
    (format === 'all' || r.config.format === format) &&
    (outcome === 'all' || r.outcome === outcome) &&
    (verifier === 'all' || r.config.verifierId === verifier));
  const open = runs.find((r) => r.id === openId);
  const t = tally(filtered);
  const avg = filtered.length ? filtered.reduce((a, r) => a + r.durationMs, 0) / filtered.length / 1000 : 0;

  if (!runs.length) {
    return <Empty title="No runs yet" body="Every run from the playground and the test suite is recorded here, so you can compare behaviour across Inji releases." />;
  }

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label><span className="label">Stack version</span>
            <select className="field !w-auto" value={version} onChange={(e) => setVersion(e.target.value)}>
              <option value="all">All versions</option>{versions.map((v) => <option key={v}>{v}</option>)}
            </select></label>
          <label><span className="label">Format</span>
            <select className="field !w-auto" value={format} onChange={(e) => setFormat(e.target.value as 'all' | FormatId)}>
              <option value="all">All formats</option>{(Object.keys(FORMATS) as FormatId[]).map((f) => <option key={f} value={f}>{FORMATS[f].label}</option>)}
            </select></label>
          <label><span className="label">Outcome</span>
            <select className="field !w-auto" value={outcome} onChange={(e) => setOutcome(e.target.value as 'all' | Outcome)}>
              <option value="all">All outcomes</option><option>PASS</option><option>WARN</option><option>FAIL</option>
            </select></label>
          <label><span className="label">Verifier</span>
            <select className="field !w-auto" value={verifier} onChange={(e) => setVerifier(e.target.value)}>
              <option value="all">All verifiers</option>{IMPLS.filter((i) => i.role === 'verifier').map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select></label>
          <div className="ml-auto flex gap-2">
            <button className="btn btn-ghost" onClick={() => download('interop-history.json', JSON.stringify(runs, null, 2), 'application/json')}><Download size={14} /> Export</button>
            <button className="btn btn-danger" onClick={() => { if (confirm('Delete all recorded runs?')) onClear(); }}><Trash2 size={14} /> Clear</button>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[['Runs', String(filtered.length)], ['Pass rate', filtered.length ? `${Math.round((t.PASS / filtered.length) * 100)}%` : '-'], ['Failures', String(t.FAIL)], ['Average duration', `${avg.toFixed(2)} s`]].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-paper px-3 py-2"><dt className="text-[12px] text-ink-muted">{k}</dt><dd className="text-[20px] font-bold">{v}</dd></div>
          ))}
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <StackBar title="By stack version" groups={group(filtered, (r) => r.config.stackVersion)} />
        <StackBar title="By format" groups={group(filtered, (r) => FORMATS[r.config.format].label)} />
        <StackBar title="By verifier" groups={group(filtered, (r) => impl(r.config.verifierId).name)} />
      </div>

      <section className="panel overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              {['Time', 'Issuer → Wallet → Verifier', 'Format', 'Proof', 'Mode', 'Version', 'Outcome'].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((r) => (
              <tr key={r.id} onClick={() => setOpenId(r.id === openId ? undefined : r.id)}
                className={cx('cursor-pointer border-b border-line last:border-0 hover:bg-paper', r.id === openId && 'bg-paper')}>
                <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{fmtTime(r.startedAt)}</td>
                <td className="px-3 py-2 font-semibold">{impl(r.config.issuerId).name} → {impl(r.config.walletId).name} → {impl(r.config.verifierId).name}</td>
                <td className="px-3 py-2">{FORMATS[r.config.format].short}</td>
                <td className="px-3 py-2">{r.config.proofType}</td>
                <td className="px-3 py-2">{r.config.tamper === 'none' ? 'happy' : r.config.tamper}</td>
                <td className="px-3 py-2">{r.config.stackVersion}</td>
                <td className="px-3 py-2"><OutcomePill value={r.outcome} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p className="p-6 text-center text-ink-muted">No runs match these filters.</p>}
      </section>

      {open && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="h-section">Run {open.id}</h2>
            <button className="btn btn-ghost" onClick={() => onLoad(open.config)}>Load configuration in playground</button>
          </div>
          {open.suiteId && <p className="text-[12.5px] text-ink-muted">This run came from the test suite. Payloads are kept only for the failing step. Re-run it in the playground for the full exchange.</p>}
          <RunView key={open.id} config={open.config} steps={open.steps} running={false} run={open} simulated={open.engine === 'simulated'} />
        </section>
      )}
    </div>
  );
}
