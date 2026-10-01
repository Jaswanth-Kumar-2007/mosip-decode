# Inji Interoperability Playground

Frontend-only React + TypeScript + Vite prototype.

## Structure

```text
src/
├── assets/
├── components/
│   ├── common/
│   ├── issuer/
│   ├── wallet/
│   ├── verifier/
│   └── playground/
├── hooks/
├── pages/
│   ├── HomePage.tsx
│   ├── IssuerPage.tsx
│   ├── WalletPage.tsx
│   ├── VerifierPage.tsx
│   └── PlaygroundPage.tsx
├── types/
├── utils/
│   ├── mockApi.ts
│   └── navigation.ts
├── main.tsx
└── styles.css
```

## Routes

- `/` Home
- `/issuer` Inji Certify
- `/wallet` Inji Web
- `/verifier` Inji Verify
- `/playground` interoperability demo

## Run

```bash
npm install
npm run dev
```

The mock API is intentionally isolated in `src/utils/mockApi.ts`, so it can later be replaced with real backend/API calls without redesigning the page structure.
