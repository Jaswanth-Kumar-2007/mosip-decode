export type Role = 'issuer' | 'wallet' | 'verifier';
export type FormatId = 'ldp_vc' | 'vc+sd-jwt' | 'mso_mdoc';
export type Flow = 'cross-device' | 'same-device' | 'dc-api';
export type RequestMode = 'by_reference' | 'by_value';
export type TamperMode = 'none' | 'expired' | 'bad_signature' | 'wrong_type' | 'nonce_replay';
export type Scope = 'issue' | 'present' | 'full';
export type ActorId = 'issuer' | 'authz' | 'wallet' | 'library' | 'verifier';
export type Outcome = 'PASS' | 'WARN' | 'FAIL';
export type VerificationResult = 'VALID' | 'INVALID' | 'EXPIRED';
export type StepStatus = 'ok' | 'warn' | 'error';

export type ArtifactKind =
  | 'credential_offer'
  | 'issuer_metadata'
  | 'token'
  | 'credential'
  | 'authorization_request'
  | 'presentation_definition'
  | 'vp_token'
  | 'verification_result'
  | 'other';

/** A module that can play a role in a test run (Inji module or an external/mock implementation). */
export interface Impl {
  id: string;
  role: Role;
  name: string;
  vendor: 'inji' | 'external';
  tagline: string;
  /** GitHub repo that owns gaps found against this module (used for issue drafts). */
  repo: string;
  formats: FormatId[];
  /** Formats that only work in mock / preview mode on this module. */
  experimental?: FormatId[];
  /** Issuer: proof types it can sign with. Verifier: proof types it can verify. */
  proofs?: Partial<Record<FormatId, string[]>>;
  /** Issuer: DID methods it can issue under. Verifier: DID methods it can resolve. */
  dids?: string[];
  /** Wallet: presentation flows it supports. */
  flows?: Flow[];
}

export interface RunConfig {
  issuerId: string;
  walletId: string;
  verifierId: string;
  format: FormatId;
  vcVersion: '1.1' | '2.0';
  credentialType: string;
  proofType: string;
  didMethod: string;
  flow: Flow;
  requestMode: RequestMode;
  tamper: TamperMode;
  stackVersion: string;
}

export interface StepError {
  code: string;
  message: string;
  layer: 'issuer' | 'wallet' | 'verifier' | 'library' | 'protocol';
  /** Impl id that owns the gap (used to pick the repo for an issue draft). */
  blame: string;
}

export interface Handoff {
  kind: 'qr' | 'deeplink' | 'dc-api';
  uri: string;
  bytes: number;
  label: string;
}

export interface Step {
  id: string;
  phase: 'issuance' | 'presentation';
  from: ActorId;
  to: ActorId;
  label: string;
  protocol: string;
  status: StepStatus;
  latencyMs: number;
  note?: string;
  artifact?: ArtifactKind;
  payload?: { title: string; body: unknown };
  handoff?: Handoff;
  error?: StepError;
  /** True when the playground deliberately corrupted something at this step (replay & tamper). */
  injected?: boolean;
}

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export interface Verification {
  result: VerificationResult;
  code?: string;
  checks: Check[];
}

export interface CredCtx {
  uuid: string;
  issuerDid: string;
  holderDid: string;
  issuedAt: string;
  expiresAt: string;
  sig: string;
  salts: string[];
  digests: string[];
  format: FormatId;
  vcVersion: '1.1' | '2.0';
  credentialType: string;
  proofType: string;
  didMethod: string;
  claims: Record<string, string>;
}

export interface Artifact {
  raw: string | Record<string, unknown>;
  decoded: unknown;
}

export interface HeldCredential {
  id: string;
  walletId: string;
  issuerId: string;
  ctx: CredCtx;
  artifact: Artifact;
  issuedAt: string;
}

export interface RunResult {
  steps: Step[];
  credential?: HeldCredential;
  verification?: Verification;
  outcome: Outcome;
  expected: VerificationResult | 'n/a';
  error?: StepError;
  durationMs: number;
}

export interface Run extends RunResult {
  id: string;
  startedAt: string;
  scope: Scope;
  config: RunConfig;
  engine: 'simulated' | 'live';
  suiteId?: string;
}
