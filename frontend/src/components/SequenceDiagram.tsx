import { useEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import type { ActorId, RunConfig, Step } from '../types';
import { ACTOR_ORDER, actorNames, toMermaid } from '../engine/report';
import { CopyButton } from './ui';

const COL = 168;
const X0 = 96;
const W = X0 * 2 + COL * 4;
const ROW = 46;
const TOP = 12;
const BAND = 30;
const xOf = (a: ActorId) => X0 + ACTOR_ORDER.indexOf(a) * COL;
const ACCENT: Record<ActorId, string> = { issuer: '#4C86E0', authz: '#4C86E0', wallet: '#F47B20', library: '#F47B20', verifier: '#27B987' };
const STROKE = { ok: '#B8C6F0', warn: '#F5B800', error: '#FF6B6B' } as const;

interface Props { steps: Step[]; cfg: RunConfig; selectedId?: string; onSelect: (id: string) => void; running: boolean }

export function SequenceDiagram({ steps, cfg, selectedId, onSelect, running }: Props) {
  const [limit, setLimit] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const names = actorNames(cfg);
  const visible = limit === null ? steps : steps.slice(0, limit);

  useEffect(() => {
    if (limit === null) return;
    if (limit >= steps.length) { setLimit(null); return; }
    const t = setTimeout(() => setLimit(limit + 1), 520);
    return () => clearTimeout(t);
  }, [limit, steps.length]);

  useEffect(() => {
    const el = scroller.current;
    if (el && (running || limit !== null)) el.scrollTop = el.scrollHeight;
  }, [visible.length, running, limit]);

  const layout = useMemo(() => {
    let y = TOP;
    let phase = '';
    const bands: Array<{ y: number; phase: string }> = [];
    const items: Array<{ s: Step; n: number; cy: number }> = [];
    visible.forEach((s, i) => {
      if (s.phase !== phase) { phase = s.phase; bands.push({ y, phase }); y += BAND; }
      items.push({ s, n: i + 1, cy: y + ROW / 2 });
      y += ROW;
    });
    return { bands, items, H: Math.max(y + 24, 220) };
  }, [visible]);

  return (
    <section className="bench overflow-hidden" aria-label="Sequence diagram">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <h2 className="text-[15px] font-bold text-white">Live sequence</h2>
        <div className="flex gap-1.5">
          <button className="btn !border-white/15 !bg-transparent !px-2 !py-1 !text-[12px] !text-slate-200 hover:!bg-white/10 disabled:!text-slate-500" disabled={!steps.length || running} onClick={() => setLimit(0)}>
            <Play size={13} /> Replay
          </button>
          <CopyButton text={steps.length ? toMermaid(steps, cfg) : ''} label="Mermaid" className="!border-white/15 !bg-transparent !text-slate-200 hover:!bg-white/10" />
        </div>
      </div>

      <div className="overflow-x-auto scroll-thin">
        <div style={{ minWidth: 780 }}>
          <svg viewBox={`0 0 ${W} 62`} width="100%" role="img" aria-label="Participants" className="block">
            {ACTOR_ORDER.map((a) => (
              <g key={a} transform={`translate(${xOf(a) - 74},8)`}>
                <rect width="148" height="46" rx="8" fill="#131F40" stroke="#2A3868" />
                <rect width="4" height="46" rx="2" fill={ACCENT[a]} />
                <text x="14" y="20" fontSize="12" fontWeight="700" fill="#F2F5FF">{names[a].title.length > 20 ? `${names[a].title.slice(0, 19)}…` : names[a].title}</text>
                <text x="14" y="36" fontSize="10.5" fill="#8A94AB">{names[a].sub}</text>
              </g>
            ))}
          </svg>

          <div ref={scroller} className="scroll-thin max-h-[620px] overflow-y-auto">
            {!visible.length ? (
              <p className="px-6 py-14 text-center text-slate-400">Pick an issuer, wallet and verifier, then run a flow. Each protocol message appears here as it happens.</p>
            ) : (
              <svg viewBox={`0 0 ${W} ${layout.H}`} width="100%" className="block" role="list" aria-label="Protocol messages">
                <defs>
                  {(Object.keys(STROKE) as Array<keyof typeof STROKE>).map((k) => (
                    <marker key={k} id={`ah-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M0 0 L10 5 L0 10 z" fill={STROKE[k]} />
                    </marker>
                  ))}
                </defs>
                {ACTOR_ORDER.map((a) => (
                  <line key={a} x1={xOf(a)} x2={xOf(a)} y1={0} y2={layout.H} stroke="#2A3868" strokeDasharray="3 6" />
                ))}
                {layout.bands.map((b) => (
                  <g key={b.phase}>
                    <rect x="0" y={b.y} width={W} height={BAND - 6} fill="rgba(255,255,255,0.05)" />
                    <text x="14" y={b.y + 15} fontSize="11.5" fontWeight="700" fill="#C7D2F5">
                      {b.phase === 'issuance' ? 'OpenID4VCI: issue and hold' : 'OpenID4VP: present and verify'}
                    </text>
                  </g>
                ))}
                {layout.items.map(({ s, n, cy }, idx) => {
                  const x1 = xOf(s.from);
                  const x2 = xOf(s.to);
                  const self = s.from === s.to;
                  const live = running && idx === layout.items.length - 1;
                  const col = STROKE[s.status];
                  const dir = x2 >= x1 ? 1 : -1;
                  const selected = s.id === selectedId;
                  const mid = (x1 + x2) / 2;
                  return (
                    <g key={s.id} className="arrive cursor-pointer" role="listitem" tabIndex={0} aria-label={`Step ${n}: ${s.label}, ${s.status}`}
                      onClick={() => onSelect(s.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.id); } }}>
                      <rect x="0" y={cy - ROW / 2} width={W} height={ROW} fill={selected ? 'rgba(244,123,32,0.14)' : 'transparent'} />
                      <circle cx="16" cy={cy} r="9" fill={s.status === 'error' ? '#D43A3A' : s.status === 'warn' ? '#C98A00' : '#2A3868'} />
                      <text x="16" y={cy + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{n}</text>
                      {self ? (
                        <>
                          <path d={`M${x1} ${cy - 7} h34 v14 h-30`} fill="none" stroke={col} strokeWidth="1.6" markerEnd={`url(#ah-${s.status === 'error' ? 'error' : s.status})`} className={live ? 'wire-live' : ''} />
                          <text x={x1 + 44} y={cy + 4} fontSize="11.5" fill="#E6ECFF">{s.label}</text>
                        </>
                      ) : (
                        <>
                          <line x1={x1 + dir * 3} x2={x2 - dir * (s.status === 'error' ? 14 : 3)} y1={cy + 6} y2={cy + 6} stroke={col} strokeWidth="1.6"
                            strokeDasharray={s.injected ? '2 4' : undefined}
                            markerEnd={s.status === 'error' ? undefined : `url(#ah-${s.status})`} className={live ? 'wire-live' : ''} />
                          {s.status === 'error' && <path d={`M${dir > 0 ? x2 - 16 : x2 + 4} ${cy} l12 12 m0 -12 l-12 12`} stroke={col} strokeWidth="2.2" fill="none" />}
                          <text x={mid} y={cy - 4} textAnchor="middle" fontSize="11.5" fill="#E6ECFF" stroke="#0B1530" strokeWidth="4" paintOrder="stroke">{s.label}</text>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
