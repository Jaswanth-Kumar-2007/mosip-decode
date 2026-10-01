import { useMemo } from 'react';
import { CopyButton } from './ui';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function highlight(json: string): string {
  return esc(json).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      let cls = 'j-num';
      if (m.startsWith('"')) cls = m.endsWith(':') ? 'j-key' : 'j-str';
      else if (m === 'true' || m === 'false') cls = 'j-bool';
      else if (m === 'null') cls = 'j-null';
      return `<span class="${cls}">${m}</span>`;
    },
  );
}

export function JsonView({ body, maxHeight = 340 }: { body: unknown; maxHeight?: number }) {
  const text = useMemo(() => JSON.stringify(body, null, 2) ?? '', [body]);
  const html = useMemo(() => highlight(text), [text]);
  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10"><CopyButton text={text} className="!border-white/15 !bg-ink-bench2 !text-slate-200 hover:!bg-white/10" /></div>
      <pre className="scroll-thin overflow-auto rounded-lg bg-ink-bench p-3 pr-20 font-mono text-[12px] leading-relaxed text-slate-200" style={{ maxHeight, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
        dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
