export const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export const rnd = (n: number, alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789') =>
  Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
export const hex = (n: number) => rnd(n, '0123456789abcdef');
export const sig = (n = 86) => rnd(n, B64URL);

export const b64u = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;

export const byteLen = (s: string) => new TextEncoder().encode(s).length;
export const enc = encodeURIComponent;
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
