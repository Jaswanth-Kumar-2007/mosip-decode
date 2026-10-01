import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink, Smartphone } from 'lucide-react';
import type { Step } from '../types';
import { QR_DENSE_BYTES, QR_MAX_BYTES } from '../engine/simulator';
import { CopyButton, cx } from './ui';

export function HandoffPanel({ step, simulated }: { step?: Step; simulated: boolean }) {
  const h = step?.handoff;
  if (!step || !h) {
    return (
      <section className="panel p-4">
        <h2 className="h-section">Wallet handoff</h2>
        <p className="mt-1 text-ink-muted">The QR code, deep link or Digital Credentials API call that connects the two devices shows up here.</p>
      </section>
    );
  }
  const pct = Math.min(100, Math.round((h.bytes / QR_MAX_BYTES) * 100));
  const tooBig = h.bytes > QR_MAX_BYTES;
  return (
    <section className="panel p-4" aria-label="Wallet handoff">
      <div className="flex items-center justify-between gap-2">
        <h2 className="h-section">Wallet handoff</h2>
        <span className="chip border-line bg-paper text-ink-muted">{h.kind === 'qr' ? 'QR code' : h.kind === 'deeplink' ? 'Deep link' : 'DC API'}</span>
      </div>
      <p className="text-[12px] text-ink-muted">{h.label}</p>

      {h.kind === 'qr' && (
        <div className="mt-3 flex items-start gap-4">
          {tooBig ? (
            <div className="flex h-[168px] w-[168px] shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-fail/50 bg-fail/5 p-3 text-center text-[12px] font-semibold text-fail">
              Too large for one QR code
            </div>
          ) : (
            <div className="shrink-0 rounded-lg border border-line bg-white p-1.5">
              <QRCodeSVG value={h.uri} size={156} level="M" fgColor="#0E1B3D" bgColor="#FFFFFF" marginSize={1} />
            </div>
          )}
          <div className="min-w-0 flex-1 text-[12px]">
            <p className="font-semibold">{h.bytes.toLocaleString()} of {QR_MAX_BYTES.toLocaleString()} bytes</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper" role="img" aria-label={`${pct}% of QR capacity`}>
              <div className={cx('h-full', tooBig ? 'bg-fail' : h.bytes > QR_DENSE_BYTES ? 'bg-signal' : 'bg-pass')} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-ink-muted">
              {tooBig ? 'Pass the request by reference so the QR only carries a request_uri.' : h.bytes > QR_DENSE_BYTES ? 'Dense code. Cameras may struggle at arm length.' : 'Comfortable to scan.'}
            </p>
            <p className="mt-1.5 flex items-center gap-1 text-ink-muted"><Smartphone size={13} /> Scan with the wallet app</p>
          </div>
        </div>
      )}

      {h.kind === 'deeplink' && (
        <a href={h.uri} className="mt-3 flex items-center gap-1.5 break-all rounded-md border border-line bg-paper p-2 font-mono text-[11.5px] text-issuer underline-offset-2 hover:underline">
          <ExternalLink size={13} className="shrink-0" /> {h.uri.length > 220 ? `${h.uri.slice(0, 220)}…` : h.uri}
        </a>
      )}
      {h.kind === 'dc-api' && (
        <pre className="scroll-thin mt-3 max-h-40 overflow-auto rounded-md bg-ink-bench p-2.5 font-mono text-[11.5px] text-slate-200" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
{`navigator.credentials.get({ digital: { requests: [${h.uri.slice(0, 160)}…] } })`}
        </pre>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        {simulated ? <p className="text-[11.5px] text-ink-faint">Simulated URI. Connect the BFF for a link a real wallet can open.</p> : <span />}
        <CopyButton text={h.uri} label="Copy URI" />
      </div>
    </section>
  );
}
