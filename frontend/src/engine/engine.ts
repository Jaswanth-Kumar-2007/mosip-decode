import type { HeldCredential, RunConfig, RunResult, Scope, Step } from '../types';
import { buildRun } from './simulator';

export interface RunRequest {
  cfg: RunConfig;
  scope: Scope;
  held: HeldCredential | null;
}
export interface RunHooks {
  onStep: (s: Step) => void;
  signal: AbortSignal;
}
export interface Engine {
  id: 'simulated' | 'live';
  execute(req: RunRequest, hooks: RunHooks): Promise<RunResult>;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });

/** Runs entirely in the browser. Steps are pre-computed and then streamed with realistic pacing. */
export const simulatedEngine: Engine = {
  id: 'simulated',
  async execute(req, { onStep, signal }) {
    const result = buildRun(req.cfg, req.scope, req.held);
    for (const s of result.steps) {
      await sleep(Math.min(260 + s.latencyMs * 1.4, 760), signal);
      onStep(s);
    }
    return result;
  },
};

/**
 * Talks to the Playground BFF (see README, "BFF contract").
 *   POST {base}/api/runs                  -> { runId }
 *   WS   {base}/api/runs/:runId/events    -> {type:'step', step} ... {type:'done', result}
 */
export function liveEngine(base: string): Engine {
  return {
    id: 'live',
    async execute(req, { onStep, signal }) {
      const res = await fetch(`${base}/api/runs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req), signal,
      });
      if (!res.ok) throw new Error(`BFF responded ${res.status} ${res.statusText}`);
      const { runId } = (await res.json()) as { runId: string };
      const wsBase = /^https?:/.test(base)
        ? base.replace(/^http/, 'ws')
        : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${base}`;
      return new Promise<RunResult>((resolve, reject) => {
        const ws = new WebSocket(`${wsBase}/api/runs/${runId}/events`);
        signal.addEventListener('abort', () => { ws.close(); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
        ws.onmessage = (e) => {
          const m = JSON.parse(String(e.data));
          if (m.type === 'step') onStep(m.step as Step);
          else if (m.type === 'done') { ws.close(); resolve(m.result as RunResult); }
        };
        ws.onerror = () => reject(new Error('Could not open the run event stream.'));
      });
    },
  };
}

export async function pingBff(base: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const r = await fetch(`${base}/api/health`);
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, detail: r.ok ? `Connected${j.version ? ` (BFF ${j.version})` : ''}` : `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : 'Unreachable' };
  }
}
