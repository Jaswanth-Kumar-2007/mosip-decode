import { ChevronRight, Landmark, ShieldCheck, Wallet } from 'lucide-react';
import type { FormatId, Impl, Role, RunConfig } from '../types';
import { FORMATS, implsFor } from '../data/catalog';
import { VendorBadge, cx } from './ui';

const ROLE = {
  issuer: { title: 'Issuer', sub: 'OpenID4VCI', icon: Landmark, text: 'text-issuer', bg: 'bg-issuer', ring: 'border-issuer bg-issuer/[0.06]', key: 'issuerId' },
  wallet: { title: 'Wallet', sub: 'Holds and presents', icon: Wallet, text: 'text-wallet', bg: 'bg-wallet', ring: 'border-wallet bg-wallet/[0.07]', key: 'walletId' },
  verifier: { title: 'Verifier', sub: 'OpenID4VP', icon: ShieldCheck, text: 'text-verifier', bg: 'bg-verifier', ring: 'border-verifier bg-verifier/[0.06]', key: 'verifierId' },
} as const;

function FormatChips({ impl, format }: { impl: Impl; format: FormatId }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {(Object.keys(FORMATS) as FormatId[]).map((f) => {
        const has = impl.formats.includes(f);
        const exp = impl.experimental?.includes(f);
        return (
          <span
            key={f}
            title={!has ? 'Not supported' : exp ? 'Mock / preview mode' : 'Supported'}
            className={cx(
              'chip !text-[10.5px]',
              !has && 'border-line text-ink-faint line-through',
              has && !exp && 'border-line bg-white text-ink-soft',
              has && exp && 'border-dashed border-warn/60 bg-signal/10 text-warn',
              f === format && has && '!border-ink',
            )}
          >
            {FORMATS[f].short}
          </span>
        );
      })}
    </div>
  );
}

export function RolePicker({ cfg, onChange }: { cfg: RunConfig; onChange: (patch: Partial<RunConfig>) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {(Object.keys(ROLE) as Role[]).map((role, idx) => {
        const r = ROLE[role];
        const Icon = r.icon;
        const selected = cfg[r.key as keyof RunConfig] as string;
        return (
          <section key={role} className="relative" aria-label={r.title}>
            <div className="mb-2 flex items-center gap-2.5">
              <span className={cx('flex h-8 w-8 items-center justify-center rounded-lg text-white', r.bg)}>
                <Icon size={17} />
              </span>
              <div className="leading-tight">
                <h2 className="text-[15px] font-bold">{r.title}</h2>
                <p className="text-[12px] text-ink-muted">{r.sub}</p>
              </div>
            </div>
            <div role="radiogroup" aria-label={`${r.title} implementation`} className="flex flex-col gap-2">
              {implsFor(role).map((i) => {
                const active = selected === i.id;
                const lacks = !i.formats.includes(cfg.format);
                return (
                  <button
                    key={i.id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange({ [r.key]: i.id } as Partial<RunConfig>)}
                    className={cx(
                      'rounded-lg border bg-white p-3 text-left transition-colors',
                      active ? r.ring : 'border-line hover:border-ink-faint',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold leading-snug">{i.name}</span>
                      <VendorBadge vendor={i.vendor} />
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-muted">{i.tagline}</p>
                    <FormatChips impl={i} format={cfg.format} />
                    {lacks && <p className="mt-1.5 text-[11.5px] font-semibold text-fail">Does not support {FORMATS[cfg.format].short}</p>}
                    {role === 'wallet' && i.flows && (
                      <p className="mt-1.5 text-[11.5px] text-ink-faint">Flows: {i.flows.map((f) => f.replace('-device', '')).join(', ')}</p>
                    )}
                  </button>
                );
              })}
            </div>
            {idx < 2 && (
              <span className="absolute -right-[18px] top-1 z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-ink-muted lg:flex" aria-hidden>
                <ChevronRight size={16} />
              </span>
            )}
          </section>
        );
      })}
    </div>
  );
}
