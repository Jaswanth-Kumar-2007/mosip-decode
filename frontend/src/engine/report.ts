import type { ActorId, Run, RunConfig, Step } from '../types';
import { FORMATS, TAMPERS, impl } from '../data/catalog';

export const actorNames = (cfg: RunConfig): Record<ActorId, { title: string; sub: string }> => {
  const issuer = impl(cfg.issuerId);
  return {
    issuer: { title: issuer.name, sub: 'Issuer' },
    authz: { title: issuer.id === 'inji-certify' ? 'eSignet' : 'Mock AuthZ', sub: 'Authorization server' },
    wallet: { title: impl(cfg.walletId).name, sub: 'Wallet' },
    library: { title: 'Wallet library', sub: 'vci-client / openid4vp' },
    verifier: { title: impl(cfg.verifierId).name, sub: 'Verifier' },
  };
};

export const ACTOR_ORDER: ActorId[] = ['issuer', 'authz', 'wallet', 'library', 'verifier'];

/** Mermaid source for the run, so it can be pasted into docs or the Mermaid live editor. */
export function toMermaid(steps: Step[], cfg: RunConfig): string {
  const names = actorNames(cfg);
  const alias: Record<ActorId, string> = { issuer: 'I', authz: 'A', wallet: 'W', library: 'L', verifier: 'V' };
  const lines = ['sequenceDiagram'];
  const used = new Set<ActorId>();
  steps.forEach((s) => { used.add(s.from); used.add(s.to); });
  ACTOR_ORDER.filter((a) => used.has(a)).forEach((a) => lines.push(`  participant ${alias[a]} as ${names[a].title}`));
  let phase = '';
  steps.forEach((s) => {
    if (s.phase !== phase) {
      phase = s.phase;
      lines.push(`  Note over ${alias[s.from]},${alias[s.to === s.from ? 'wallet' : s.to]}: ${phase === 'issuance' ? 'OpenID4VCI issuance' : 'OpenID4VP presentation'}`);
    }
    const arrow = s.status === 'error' ? '--x' : '->>';
    lines.push(`  ${alias[s.from]}${arrow}${alias[s.to]}: ${s.label.replace(/[;#]/g, ' ')}`);
  });
  return lines.join('\n');
}

export function runToMarkdown(run: Run): string {
  const c = run.config;
  const rows: string[] = [
    `### Interoperability report ${run.id}`,
    '',
    '| Field | Value |', '|---|---|',
    `| Issuer | ${impl(c.issuerId).name} |`,
    `| Wallet | ${impl(c.walletId).name} |`,
    `| Verifier | ${impl(c.verifierId).name} |`,
    `| Format | ${FORMATS[c.format].label}${c.format === 'ldp_vc' ? ` (VC ${c.vcVersion})` : ''} |`,
    `| Proof type | ${c.proofType} |`,
    `| DID method | ${c.didMethod} |`,
    `| Presentation flow | ${c.flow}, request ${c.requestMode} |`,
    `| Test mode | ${c.tamper === 'none' ? 'happy path' : TAMPERS[c.tamper].label} |`,
    `| Scope | ${run.scope} |`,
    `| Stack version | ${c.stackVersion} |`,
    `| Engine | ${run.engine} |`,
    `| Verification | ${run.verification?.result ?? 'n/a'} (expected ${run.expected}) |`,
    `| **Outcome** | **${run.outcome}** |`,
  ];
  if (run.error) rows.push(`| Error | \`${run.error.code}\`: ${run.error.message} |`);
  rows.push('', 'Steps:', '');
  run.steps.forEach((s, i) => rows.push(`${i + 1}. [${s.status}] ${s.label} (${s.protocol}, ${s.latencyMs} ms)`));
  return rows.join('\n');
}

export function matrixToMarkdown(runs: Run[]): string {
  const head = '| Issuer | Wallet | Verifier | Format | Proof | Flow | Mode | Outcome | Error |\n|---|---|---|---|---|---|---|---|---|';
  const body = runs.map((r) => {
    const c = r.config;
    return `| ${impl(c.issuerId).name} | ${impl(c.walletId).name} | ${impl(c.verifierId).name} | ${c.format} | ${c.proofType} | ${c.flow} | ${c.tamper} | ${r.outcome} | ${r.error?.code ?? ''} |`;
  });
  return [head, ...body].join('\n');
}

export interface Gap {
  key: string;
  code: string;
  blame: string;
  layer: string;
  message: string;
  runs: Run[];
}

/** Group failed runs into distinct gaps (same error code, same module to blame). */
export function collectGaps(runs: Run[]): Gap[] {
  const map = new Map<string, Gap>();
  runs.forEach((r) => {
    if (r.outcome !== 'FAIL' || !r.error) return;
    const key = `${r.error.code}|${r.error.blame}`;
    const g = map.get(key) ?? { key, code: r.error.code, blame: r.error.blame, layer: r.error.layer, message: r.error.message, runs: [] };
    g.runs.push(r);
    map.set(key, g);
  });
  return [...map.values()].sort((a, b) => b.runs.length - a.runs.length);
}

export function issueDraft(g: Gap): string {
  const first = g.runs[0];
  const c = first.config;
  const blame = (() => { try { return impl(g.blame); } catch { return undefined; } })();
  const failing = first.steps.find((s) => s.status === 'error');
  return [
    `**Suggested repository:** ${blame?.repo ?? 'unknown'}`,
    '',
    `## ${g.code}: ${impl(c.issuerId).name} / ${impl(c.walletId).name} / ${impl(c.verifierId).name} (${c.format})`,
    '',
    '### What happened',
    g.message,
    '',
    '### Environment',
    `- Stack version: ${c.stackVersion}`,
    `- Engine: ${first.engine}${first.engine === 'simulated' ? ' (simulated, confirm against the live stack before filing)' : ''}`,
    `- Affected combinations in this session: ${g.runs.length}`,
    '',
    '### Reproduce',
    `1. Issuer: ${impl(c.issuerId).name}, wallet: ${impl(c.walletId).name}, verifier: ${impl(c.verifierId).name}`,
    `2. Format ${c.format}${c.format === 'ldp_vc' ? ` (VC ${c.vcVersion})` : ''}, proof type ${c.proofType}, DID method ${c.didMethod}`,
    `3. Presentation flow ${c.flow}, request ${c.requestMode}, test mode ${c.tamper}`,
    `4. Run the full cycle and open the protocol inspector at step "${failing?.label ?? 'n/a'}".`,
    '',
    '### Payload at the failing step',
    '```json',
    JSON.stringify(failing?.payload?.body ?? {}, null, 2),
    '```',
    '',
    '### Expected',
    'The exchange completes and the verifier returns VALID for an untampered credential.',
  ].join('\n');
}

export const download = (name: string, text: string, mime = 'text/plain') => {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};
