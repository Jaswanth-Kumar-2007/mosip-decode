import { Bug, FlaskConical, History, Plug, Radio } from 'lucide-react';
import { cx } from './ui';

export type Tab = 'playground' | 'suite' | 'history' | 'gaps' | 'connect';

const TABS: Array<{ id: Tab; label: string; icon: typeof Radio }> = [
  { id: 'playground', label: 'Playground', icon: Radio },
  { id: 'suite', label: 'Test suite', icon: FlaskConical },
  { id: 'history', label: 'History', icon: History },
  { id: 'gaps', label: 'Gaps', icon: Bug },
  { id: 'connect', label: 'Connect', icon: Plug },
];

function Mark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
      <rect width="34" height="34" rx="8" fill="#0E1B3D" />
      <path d="M9 11 L17 23 L25 11" fill="none" stroke="#5B6784" strokeWidth="1.6" />
      <circle cx="9" cy="11" r="3.4" fill="#1B4F9C" />
      <circle cx="17" cy="23" r="3.4" fill="#F47B20" />
      <circle cx="25" cy="11" r="3.4" fill="#0B8A5B" />
    </svg>
  );
}

export function Header({ tab, onTab, live, runCount }: { tab: Tab; onTab: (t: Tab) => void; live: boolean; runCount: number }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="flex h-1">
        {['#0B8A5B', '#1B4F9C', '#F47B20', '#D43A3A', '#F5B800'].map((c, i) => (
          <span key={c} style={{ background: c, flex: [1, 3, 2, 1, 2][i] }} />
        ))}
      </div>
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Mark />
          <div className="leading-tight">
            <p className="text-[15px] font-bold tracking-tight">Inji Interoperability Playground</p>
            <p className="text-[12px] text-ink-muted">Issue, hold, present and verify across any OpenID4VCI / OpenID4VP stack</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-wrap items-center gap-1" aria-label="Sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={cx(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors',
                tab === id ? 'bg-ink text-white' : 'text-ink-muted hover:bg-paper hover:text-ink',
              )}
            >
              <Icon size={15} />
              {label}
              {id === 'history' && runCount > 0 && (
                <span className={cx('rounded-full px-1.5 text-[11px]', tab === id ? 'bg-white/20' : 'bg-paper')}>{runCount}</span>
              )}
            </button>
          ))}
        </nav>
        <button
          onClick={() => onTab('connect')}
          className={cx('chip !px-2.5 !py-1', live ? 'border-pass/30 bg-pass/10 text-pass' : 'border-warn/40 bg-signal/15 text-warn')}
          title="Open engine settings"
        >
          <span className={cx('h-1.5 w-1.5 rounded-full', live ? 'bg-pass' : 'bg-warn')} />
          {live ? 'Live BFF' : 'Simulated engine'}
        </button>
      </div>
    </header>
  );
}
