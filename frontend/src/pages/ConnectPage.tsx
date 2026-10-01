import { useState } from 'react';
import { pingBff } from '../engine/engine';
import { CopyButton, Segmented } from '../components/ui';

export interface Settings { mode: 'simulated' | 'live'; bffUrl: string }

const CONTRACT = `# Health
GET  {base}/api/health                -> 200 { "version": "0.1.0" }

# Start a run
POST {base}/api/runs
{
  "cfg":   RunConfig,                  // see src/types.ts
  "scope": "issue" | "present" | "full",
  "held":  HeldCredential | null       // credential to present when scope = "present"
}                                      -> 202 { "runId": "..." }

# Stream the run
WS   {base}/api/runs/{runId}/events
{ "type": "step", "step": Step }       // one per protocol message, in order
{ "type": "done", "result": RunResult }`;

const COMPOSE = `# docker-compose.yml (outline)
services:
  playground-ui:    # this app (vite build served by nginx)
  playground-bff:   # Node/Express: proxies Mimoto, Inji Certify, Inji Verify
  inji-certify:     # issuer, mock or eSignet-backed plugin
  mimoto:           # wallet BFF used by Inji Web and Inji Wallet
  inji-web:         # browser wallet
  verify-service:   # Inji Verify backend
  verify-ui:        # Inji Verify frontend
  postgres:
  redis:
# Use ngrok or a reverse proxy so the mobile wallet can reach the issuer and verifier.`;

export function ConnectPage({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [status, setStatus] = useState<{ ok: boolean; detail: string } | null>(null);
  const [testing, setTesting] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <section className="panel space-y-4 p-4 lg:col-span-2">
        <div>
          <h2 className="h-section">Engine</h2>
          <p className="mt-0.5 text-ink-muted">Simulated runs execute in your browser from capability profiles. Live runs go through your Playground BFF to the real Inji modules.</p>
        </div>
        <Segmented ariaLabel="Engine" value={settings.mode} onChange={(mode) => onChange({ ...settings, mode })}
          options={[{ id: 'simulated', label: 'Simulated' }, { id: 'live', label: 'Live BFF' }]} />
        <label className="block">
          <span className="label">BFF base URL</span>
          <input className="field font-mono" value={settings.bffUrl} spellCheck={false} onChange={(e) => onChange({ ...settings, bffUrl: e.target.value })} placeholder="/bff or http://localhost:8080" />
          <span className="mt-1 block text-[11.5px] text-ink-faint">"/bff" uses the Vite dev proxy to http://localhost:8080 (see vite.config.ts).</span>
        </label>
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost" disabled={testing} onClick={async () => { setTesting(true); setStatus(await pingBff(settings.bffUrl)); setTesting(false); }}>
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          {status && <span className={status.ok ? 'font-semibold text-pass' : 'font-semibold text-fail'}>{status.detail}</span>}
        </div>
        {settings.mode === 'live' && <p className="rounded-md bg-signal/15 px-3 py-2 text-[12.5px] text-warn">Live mode needs the BFF to implement the contract on the right. Until then, switch back to Simulated.</p>}
      </section>

      <section className="space-y-4 lg:col-span-3">
        <div className="panel p-4">
          <div className="flex items-center justify-between"><h2 className="h-section">BFF contract</h2><CopyButton text={CONTRACT} /></div>
          <p className="mt-0.5 text-ink-muted">The UI only depends on this contract. The BFF translates it into calls to Inji Certify, Mimoto and Inji Verify and normalises each response into a Step.</p>
          <pre className="scroll-thin mt-3 overflow-auto rounded-lg bg-ink-bench p-3 font-mono text-[12px] text-slate-200">{CONTRACT}</pre>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between"><h2 className="h-section">Local stack outline</h2><CopyButton text={COMPOSE} /></div>
          <pre className="scroll-thin mt-3 overflow-auto rounded-lg bg-ink-bench p-3 font-mono text-[12px] text-slate-200">{COMPOSE}</pre>
        </div>
      </section>
    </div>
  );
}
