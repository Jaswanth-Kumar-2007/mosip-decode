import type { FormatId, RunConfig } from '../types';
import { CREDENTIAL_TYPES, FLOWS, FORMATS, TAMPERS, didOptions, normalizeConfig, proofOptions } from '../data/catalog';
import { preflight } from '../engine/simulator';
import { Field, OutcomePill, Segmented } from './ui';

export function ConfigBar({ cfg, onChange }: { cfg: RunConfig; onChange: (next: RunConfig) => void }) {
  const set = (patch: Partial<RunConfig>) => onChange(normalizeConfig({ ...cfg, ...patch }));
  const proofs = proofOptions(cfg.issuerId, cfg.format);
  const dids = didOptions(cfg.issuerId);
  const pre = preflight(cfg);

  return (
    <section className="panel p-4" aria-label="Test configuration">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="h-section">Credential format</h2>
          <Segmented<FormatId>
            ariaLabel="Credential format"
            value={cfg.format}
            onChange={(format) => set({ format })}
            options={(Object.keys(FORMATS) as FormatId[]).map((f) => ({ id: f, label: FORMATS[f].label, hint: FORMATS[f].spec }))}
          />
        </div>
        <div className="flex items-center gap-2 text-[12.5px]" title="Predicted from capability profiles. Live runs decide the real outcome.">
          <span className="text-ink-muted">Capability preflight</span>
          <OutcomePill value={pre.outcome} />
          <span className="hidden max-w-[360px] truncate text-ink-muted xl:inline">{pre.message}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Field label="Credential type">
          <select className="field" value={cfg.credentialType} onChange={(e) => set({ credentialType: e.target.value })}>
            {CREDENTIAL_TYPES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Proof type">
          <select className="field" value={cfg.proofType} disabled={!proofs.length} onChange={(e) => set({ proofType: e.target.value })}>
            {proofs.length ? proofs.map((p) => <option key={p}>{p}</option>) : <option>not offered</option>}
          </select>
        </Field>
        <Field label="Issuer DID method">
          <select className="field" value={cfg.didMethod} onChange={(e) => set({ didMethod: e.target.value })}>
            {dids.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="VC data model">
          <select className="field" value={cfg.vcVersion} disabled={cfg.format !== 'ldp_vc'} onChange={(e) => set({ vcVersion: e.target.value as '1.1' | '2.0' })}>
            <option value="1.1">W3C VC 1.1</option>
            <option value="2.0">W3C VC 2.0</option>
          </select>
        </Field>
        <Field label="Presentation flow">
          <select className="field" value={cfg.flow} onChange={(e) => set({ flow: e.target.value as RunConfig['flow'] })}>
            {Object.entries(FLOWS).map(([id, f]) => <option key={id} value={id}>{f.label}</option>)}
          </select>
        </Field>
        <Field label="Request passed">
          <select className="field" value={cfg.requestMode} disabled={cfg.flow === 'dc-api'} onChange={(e) => set({ requestMode: e.target.value as RunConfig['requestMode'] })}>
            <option value="by_reference">By reference (request_uri)</option>
            <option value="by_value">By value</option>
          </select>
        </Field>
        <Field label="Replay and tamper">
          <select className="field" value={cfg.tamper} onChange={(e) => set({ tamper: e.target.value as RunConfig['tamper'] })} title={TAMPERS[cfg.tamper].hint}>
            {Object.entries(TAMPERS).map(([id, t]) => <option key={id} value={id}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Stack version label">
          <input className="field" value={cfg.stackVersion} onChange={(e) => onChange({ ...cfg, stackVersion: e.target.value })} spellCheck={false} />
        </Field>
      </div>
    </section>
  );
}
