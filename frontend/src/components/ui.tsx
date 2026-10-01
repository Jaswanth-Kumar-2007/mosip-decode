import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Outcome, VerificationResult } from '../types';

export const cx = (...c: Array<string | false | undefined | null>) => c.filter(Boolean).join(' ');

const TONE: Record<string, string> = {
  PASS: 'border-pass/30 bg-pass/10 text-pass',
  VALID: 'border-pass/30 bg-pass/10 text-pass',
  WARN: 'border-warn/40 bg-signal/15 text-warn',
  EXPIRED: 'border-warn/40 bg-signal/15 text-warn',
  FAIL: 'border-fail/30 bg-fail/10 text-fail',
  INVALID: 'border-fail/30 bg-fail/10 text-fail',
  'n/a': 'border-line bg-paper text-ink-muted',
};

export function OutcomePill({ value, className }: { value?: Outcome | VerificationResult | 'n/a'; className?: string }) {
  const v = value ?? 'n/a';
  return <span className={cx('chip', TONE[v], className)}>{v}</span>;
}

export function VendorBadge({ vendor }: { vendor: 'inji' | 'external' }) {
  return vendor === 'inji' ? (
    <span className="chip border-issuer/25 bg-issuer/10 text-issuer">Inji</span>
  ) : (
    <span className="chip border-line bg-paper text-ink-muted">External</span>
  );
}

export function CopyButton({ text, label = 'Copy', className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={cx('btn btn-ghost !px-2 !py-1 !text-[12px]', className)}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1400); } catch { /* clipboard blocked */ }
      }}
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
      {done ? 'Copied' : label}
    </button>
  );
}

export function Segmented<T extends string>({
  value, options, onChange, ariaLabel,
}: { value: T; options: Array<{ id: T; label: string; hint?: string }>; onChange: (v: T) => void; ariaLabel: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex rounded-lg border border-line bg-paper p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          title={o.hint}
          onClick={() => onChange(o.id)}
          className={cx(
            'rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors',
            value === o.id ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-faint">{hint}</span>}
    </label>
  );
}

export function Empty({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-[15px] font-bold">{title}</p>
      <p className="max-w-md text-ink-muted">{body}</p>
      {children}
    </div>
  );
}

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
