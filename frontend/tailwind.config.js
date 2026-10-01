/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        paper: '#F4F6F9',
        ink: { DEFAULT: '#0E1B3D', soft: '#2B3A5F', muted: '#5B6784', faint: '#8A94AB', bench: '#0B1530', bench2: '#131F40' },
        line: '#DDE3EC',
        issuer: '#1B4F9C',
        wallet: '#F47B20',
        verifier: '#0B8A5B',
        pass: '#0B8A5B',
        warn: '#C98A00',
        fail: '#D43A3A',
        signal: '#F5B800',
      },
    },
  },
  plugins: [],
};
