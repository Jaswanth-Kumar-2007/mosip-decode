# Inji Interoperability Playground (frontend)

MOSIP Decode, problem 02. A single web app to pick an **issuer, wallet and verifier**, run issue, hold, present and verify end to end, and inspect every protocol message.

Stack: React 18, TypeScript, Vite, Tailwind, `qrcode.react`, `lucide-react`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typechecks, then builds to dist/
```

## Two engines

| Engine | What it does |
|---|---|
| **Simulated** (default) | Runs in the browser. Generates OpenID4VCI / OpenID4VP message shapes for W3C VC (JSON-LD), SD-JWT VC and mDoc, using capability profiles in `src/data/catalog.ts`. Use it for the demo flow, UI work and tamper tests. |
| **Live BFF** | Calls your Playground BFF, which drives Inji Certify, Mimoto and Inji Verify. Switch on the *Connect* page. |

The simulated profiles are **assumptions, not verified facts**. Gaps shown while simulated must be confirmed on the real stack before filing issues.

## BFF contract (what you build next)

```
GET  /api/health                 -> { version }
POST /api/runs  { cfg, scope, held }   -> { runId }      (types in src/types.ts)
WS   /api/runs/:runId/events     -> {type:"step", step} ... {type:"done", result}
```

Each `Step` is one protocol message: `from`, `to`, `label`, `protocol`, `status` (ok/warn/error), `latencyMs`, `payload`, optional `handoff` (QR / deep link / DC API) and `error`. The BFF only has to normalise Inji responses into this shape. The UI draws the sequence diagram, inspector, report, history and gap drafts from it.

## Task coverage

| Task | Where |
|---|---|
| M2 three-column Issuer / Wallet / Verifier selector | `RolePicker` |
| M3 live Issue flow (offer, token exchange, credential) | `buildIssuance`, `Inspector` |
| M4 Present and Verify (QR cross-device, same-device) with Valid / Invalid / Expired | `buildPresentation`, `ResultPanel` |
| M5 protocol inspector with raw payloads | `Inspector`, `JsonView` |
| M6 two or more formats, labelled per run | `ConfigBar` (JSON-LD, SD-JWT, mdoc) |
| M7 pass/fail report per run | `ResultPanel`, `report.ts` (Markdown / JSON export) |
| G1 non-Inji mocks | external issuer, wallet, verifier in the catalog |
| G2 mDoc | third format, flagged as mock |
| G3 animated sequence diagram | `SequenceDiagram` (+ Mermaid source copy) |
| G4 replay and tamper | expired, bad signature, wrong type, replayed nonce |
| G5 history dashboard | *History* tab (filters by version, format, outcome, verifier) |
| G6 same-device and DC API | flow selector |
| B1 CI-style suite | *Test suite* tab (matrix over all combinations) |
| B2 gap issues | *Gaps* tab with copyable GitHub issue drafts |
| Not built | live telemetry (Obsrv/Druid), Docker Compose bundle, real stack wiring |

## Still needed for the deliverables

1. Stand up Inji Certify, Mimoto + Inji Web / Wallet and Inji Verify (Docker Compose or the Collab sandbox).
2. Build the BFF per the contract above.
3. Run the suite live, confirm gaps, file issues, record the 3 to 5 minute demo.
