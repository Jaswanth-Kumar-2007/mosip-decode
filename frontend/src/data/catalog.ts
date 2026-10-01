import type { FormatId, Flow, Impl, RunConfig, TamperMode } from '../types';

/**
 * CAPABILITY PROFILES
 * -------------------
 * These drive the *simulated* engine and the preflight check. They are assumptions about what each
 * module supports, NOT verified facts. When the Live BFF is connected, the real stack decides the
 * outcome and these profiles are only used to label the UI. Adjust them to match what you observe.
 */
export const IMPLS: Impl[] = [
  // ---- Issuers ------------------------------------------------------------------------------
  {
    id: 'inji-certify',
    role: 'issuer',
    name: 'Inji Certify',
    vendor: 'inji',
    tagline: 'OpenID4VCI issuer, plugin-based (mock or eSignet-backed)',
    repo: 'mosip/inji-certify',
    formats: ['ldp_vc', 'vc+sd-jwt', 'mso_mdoc'],
    experimental: ['mso_mdoc'],
    proofs: {
      ldp_vc: ['Ed25519Signature2020', 'RsaSignature2018'],
      'vc+sd-jwt': ['ES256', 'EdDSA'],
      mso_mdoc: ['ES256'],
    },
    dids: ['did:web', 'did:jwk'],
  },
  {
    id: 'mock-oid4vci',
    role: 'issuer',
    name: 'Generic OpenID4VCI mock',
    vendor: 'external',
    tagline: 'Standards-only issuer in the style of Walt.id / Sphereon',
    repo: '(external - not an Inji repo)',
    formats: ['ldp_vc', 'vc+sd-jwt'],
    proofs: {
      ldp_vc: ['Ed25519Signature2020', 'JsonWebSignature2020'],
      'vc+sd-jwt': ['ES256', 'EdDSA'],
    },
    dids: ['did:jwk', 'did:key'],
  },
  // ---- Wallets ------------------------------------------------------------------------------
  {
    id: 'inji-wallet-mobile',
    role: 'wallet',
    name: 'Inji Wallet (mobile)',
    vendor: 'inji',
    tagline: 'React Native app with Mimoto BFF, QR + deep link',
    repo: 'mosip/inji-wallet',
    formats: ['ldp_vc', 'vc+sd-jwt', 'mso_mdoc'],
    experimental: ['mso_mdoc'],
    flows: ['cross-device', 'same-device'],
  },
  {
    id: 'inji-web',
    role: 'wallet',
    name: 'Inji Web',
    vendor: 'inji',
    tagline: 'Browser wallet (React) with Mimoto BFF',
    repo: 'mosip/inji-web',
    formats: ['ldp_vc', 'vc+sd-jwt'],
    flows: ['same-device', 'dc-api'],
  },
  {
    id: 'mock-wallet',
    role: 'wallet',
    name: 'Generic OpenID4VP wallet mock',
    vendor: 'external',
    tagline: 'EUDI-style reference wallet stand-in',
    repo: '(external - not an Inji repo)',
    formats: ['ldp_vc', 'vc+sd-jwt', 'mso_mdoc'],
    flows: ['cross-device', 'same-device', 'dc-api'],
  },
  // ---- Verifiers ----------------------------------------------------------------------------
  {
    id: 'inji-verify',
    role: 'verifier',
    name: 'Inji Verify',
    vendor: 'inji',
    tagline: 'verify-service + verify-ui, OpenID4VP relying party',
    repo: 'mosip/inji-verify',
    formats: ['ldp_vc', 'vc+sd-jwt', 'mso_mdoc'],
    experimental: ['mso_mdoc'],
    proofs: {
      ldp_vc: ['Ed25519Signature2020', 'RsaSignature2018'],
      'vc+sd-jwt': ['ES256', 'EdDSA'],
      mso_mdoc: ['ES256'],
    },
    dids: ['did:web', 'did:jwk'],
  },
  {
    id: 'inji-verify-sdk',
    role: 'verifier',
    name: 'Inji Verify SDK',
    vendor: 'inji',
    tagline: 'react-inji-verify-sdk inside a custom relying party',
    repo: 'mosip/inji-verify',
    formats: ['ldp_vc', 'vc+sd-jwt'],
    proofs: {
      ldp_vc: ['Ed25519Signature2020', 'RsaSignature2018'],
      'vc+sd-jwt': ['ES256', 'EdDSA'],
    },
    dids: ['did:web', 'did:jwk'],
  },
  {
    id: 'mock-oid4vp',
    role: 'verifier',
    name: 'Generic OpenID4VP verifier mock',
    vendor: 'external',
    tagline: 'Standards-only relying party stand-in',
    repo: '(external - not an Inji repo)',
    formats: ['ldp_vc', 'vc+sd-jwt', 'mso_mdoc'],
    proofs: {
      ldp_vc: ['Ed25519Signature2020', 'JsonWebSignature2020'],
      'vc+sd-jwt': ['ES256', 'EdDSA'],
      mso_mdoc: ['ES256'],
    },
    dids: ['did:jwk', 'did:key', 'did:web'],
  },
];

export const impl = (id: string): Impl => {
  const found = IMPLS.find((i) => i.id === id);
  if (!found) throw new Error(`Unknown implementation: ${id}`);
  return found;
};
export const implsFor = (role: Impl['role']) => IMPLS.filter((i) => i.role === role);

export const FORMATS: Record<FormatId, { label: string; short: string; spec: string }> = {
  ldp_vc: { label: 'W3C VC (JSON-LD)', short: 'JSON-LD', spec: 'W3C VC 1.1 / 2.0, Data Integrity proofs' },
  'vc+sd-jwt': { label: 'SD-JWT VC', short: 'SD-JWT', spec: 'IETF SD-JWT VC, selective disclosure' },
  mso_mdoc: { label: 'mDoc / mDL', short: 'mdoc', spec: 'ISO/IEC 18013-5 (mock mode)' },
};

export const FLOWS: Record<Flow, { label: string; hint: string }> = {
  'cross-device': { label: 'Cross-device (QR)', hint: 'Verifier shows a QR, the phone wallet scans it' },
  'same-device': { label: 'Same-device (deep link)', hint: 'Verifier opens the wallet through openid4vp://' },
  'dc-api': { label: 'Digital Credentials API', hint: 'Browser asks the wallet through navigator.credentials' },
};

export const TAMPERS: Record<TamperMode, { label: string; hint: string; expect: string }> = {
  none: { label: 'No tampering', hint: 'Happy path', expect: 'VALID' },
  expired: { label: 'Expired credential', hint: 'Validity end moved into the past', expect: 'EXPIRED' },
  bad_signature: { label: 'Bad signature', hint: 'Last bytes of the proof are flipped', expect: 'INVALID' },
  wrong_type: { label: 'Wrong credential type', hint: 'type / vct / docType does not match the request', expect: 'INVALID' },
  nonce_replay: { label: 'Replayed nonce', hint: 'VP is bound to an old nonce', expect: 'INVALID' },
};

export const CREDENTIAL_TYPES = [
  {
    id: 'MockVerifiableCredential',
    label: 'Mock ID credential',
    claims: { fullName: 'Asha Verma', dateOfBirth: '1994-03-12', gender: 'Female', nationalId: 'MOCK-5073-9062-13', city: 'Pune' } as Record<string, string>,
  },
  {
    id: 'HealthInsuranceCredential',
    label: 'Health insurance',
    claims: { policyHolder: 'Asha Verma', policyNumber: 'HI-77421-009', plan: 'Family floater', coverageUntil: '2027-03-31', insurer: 'Sample Mutual' } as Record<string, string>,
  },
  {
    id: 'LandRegistryCredential',
    label: 'Land registry extract',
    claims: { parcelId: 'LR-04-1192', owner: 'Asha Verma', areaSqm: '1250', district: 'Haveli', registeredOn: '2019-08-02' } as Record<string, string>,
  },
];

export const credentialType = (id: string) => CREDENTIAL_TYPES.find((c) => c.id === id) ?? CREDENTIAL_TYPES[0];

export const proofOptions = (issuerId: string, format: FormatId): string[] => impl(issuerId).proofs?.[format] ?? [];
export const didOptions = (issuerId: string): string[] => impl(issuerId).dids ?? [];

/** Keep dependent fields valid whenever the user changes something upstream. */
export function normalizeConfig(cfg: RunConfig): RunConfig {
  const next = { ...cfg };
  const proofs = proofOptions(next.issuerId, next.format);
  if (!proofs.includes(next.proofType)) next.proofType = proofs[0] ?? 'n/a';
  const dids = didOptions(next.issuerId);
  if (!dids.includes(next.didMethod)) next.didMethod = dids[0] ?? 'did:web';
  if (next.format !== 'ldp_vc') next.vcVersion = '1.1';
  return next;
}

export const DEFAULT_CONFIG: RunConfig = normalizeConfig({
  issuerId: 'inji-certify',
  walletId: 'inji-wallet-mobile',
  verifierId: 'inji-verify',
  format: 'ldp_vc',
  vcVersion: '1.1',
  credentialType: 'MockVerifiableCredential',
  proofType: '',
  didMethod: '',
  flow: 'cross-device',
  requestMode: 'by_reference',
  tamper: 'none',
  stackVersion: 'collab-latest',
});
