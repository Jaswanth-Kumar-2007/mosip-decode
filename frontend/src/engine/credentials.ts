import type { Artifact, CredCtx, RunConfig } from '../types';
import { credentialType } from '../data/catalog';
import { B64URL, B58, b64u, hex, rnd, sig, uuid } from './util';

export interface Mutation {
  expired?: boolean;
  badSig?: boolean;
  wrongType?: boolean;
}

const PAST = '2023-01-01T00:00:00.000Z';
const flipSig = (s: string, bad?: boolean) => (bad ? s.slice(0, -6) + 'AAAAAA' : s);

export function makeDid(method: string, host: string): string {
  if (method === 'did:web') return `did:web:${host}`;
  if (method === 'did:key') return `did:key:z6Mk${rnd(44, B58)}`;
  return `did:jwk:${b64u(JSON.stringify({ kty: 'OKP', crv: 'Ed25519', x: rnd(43, B64URL) }))}`;
}

export function makeCtx(cfg: RunConfig, issuerHost: string): CredCtx {
  const claims = credentialType(cfg.credentialType).claims;
  const n = Object.keys(claims).length;
  const issued = new Date();
  const expires = new Date(issued.getTime() + 365 * 864e5);
  return {
    uuid: uuid(),
    issuerDid: makeDid(cfg.didMethod, issuerHost),
    holderDid: `did:jwk:${b64u(JSON.stringify({ kty: 'EC', crv: 'P-256', x: rnd(43, B64URL), y: rnd(43, B64URL) }))}`,
    issuedAt: issued.toISOString(),
    expiresAt: expires.toISOString(),
    sig: sig(),
    salts: Array.from({ length: n }, () => rnd(22, B64URL)),
    digests: Array.from({ length: n }, () => rnd(43, B64URL)),
    format: cfg.format,
    vcVersion: cfg.vcVersion,
    credentialType: cfg.credentialType,
    proofType: cfg.proofType,
    didMethod: cfg.didMethod,
    claims,
  };
}

const SUITE_CONTEXT: Record<string, string> = {
  Ed25519Signature2020: 'https://w3id.org/security/suites/ed25519-2020/v1',
  JsonWebSignature2020: 'https://w3id.org/security/suites/jws-2020/v1',
  RsaSignature2018: 'https://w3id.org/security/v2',
};

function renderLdp(ctx: CredCtx, m: Mutation): Artifact {
  const v2 = ctx.vcVersion === '2.0';
  const expiry = m.expired ? PAST : ctx.expiresAt;
  const proofSig = flipSig(ctx.sig, m.badSig);
  const proof: Record<string, unknown> = {
    type: ctx.proofType,
    created: ctx.issuedAt,
    proofPurpose: 'assertionMethod',
    verificationMethod: `${ctx.issuerDid}#key-0`,
  };
  if (ctx.proofType === 'Ed25519Signature2020') proof.proofValue = `z${proofSig}`;
  else {
    const alg = ctx.proofType === 'RsaSignature2018' ? 'PS256' : 'EdDSA';
    proof.jws = `${b64u(JSON.stringify({ alg, b64: false, crit: ['b64'] }))}..${proofSig}`;
  }
  const vc: Record<string, unknown> = {
    '@context': [
      v2 ? 'https://www.w3.org/ns/credentials/v2' : 'https://www.w3.org/2018/credentials/v1',
      SUITE_CONTEXT[ctx.proofType] ?? 'https://w3id.org/security/v2',
    ],
    id: `urn:uuid:${ctx.uuid}`,
    type: ['VerifiableCredential', m.wrongType ? 'PaymentCredential' : ctx.credentialType],
    issuer: ctx.issuerDid,
    ...(v2 ? { validFrom: ctx.issuedAt, validUntil: expiry } : { issuanceDate: ctx.issuedAt, expirationDate: expiry }),
    credentialSubject: { id: ctx.holderDid, ...ctx.claims },
    proof,
  };
  return { raw: vc, decoded: vc };
}

function renderSdJwt(ctx: CredCtx, m: Mutation): Artifact {
  const header = { alg: ctx.proofType, typ: 'vc+sd-jwt', kid: `${ctx.issuerDid}#key-0` };
  const payload = {
    iss: ctx.issuerDid,
    iat: Math.floor(Date.parse(ctx.issuedAt) / 1000),
    exp: Math.floor(Date.parse(m.expired ? PAST : ctx.expiresAt) / 1000),
    vct: m.wrongType ? 'PaymentCredential' : ctx.credentialType,
    cnf: { kid: ctx.holderDid },
    _sd: ctx.digests,
    _sd_alg: 'sha-256',
  };
  const names = Object.keys(ctx.claims);
  const disclosures = names.map((k, i) => [ctx.salts[i], k, ctx.claims[k]]);
  const encoded = disclosures.map((d) => b64u(JSON.stringify(d)));
  const compact = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}.${flipSig(ctx.sig, m.badSig)}~${encoded.join('~')}~`;
  return {
    raw: compact,
    decoded: { header, payload, disclosures: disclosures.map(([salt, name, value]) => ({ salt, name, value })) },
  };
}

function renderMdoc(ctx: CredCtx, m: Mutation): Artifact {
  const signature = flipSig(ctx.sig, m.badSig);
  const elements = Object.keys(ctx.claims).map((k, i) => ({
    digestID: i,
    random: ctx.salts[i].toLowerCase(),
    elementIdentifier: k,
    elementValue: ctx.claims[k],
  }));
  const decoded = {
    version: '1.0',
    status: 0,
    documents: [
      {
        docType: m.wrongType ? 'org.example.payment' : 'org.iso.18013.5.1.mDL',
        issuerSigned: {
          nameSpaces: { 'org.iso.18013.5.1': elements },
          issuerAuth: {
            protected: { alg: ctx.proofType },
            x5chain: '<mock X.509 certificate>',
            validityInfo: { signed: ctx.issuedAt, validFrom: ctx.issuedAt, validUntil: m.expired ? PAST : ctx.expiresAt },
            signature,
          },
        },
      },
    ],
  };
  const raw = 'a36776657273696f6e63312e30' + Array.from(signature).map((c) => c.charCodeAt(0).toString(16)).join('') + hex(24);
  return { raw, decoded };
}

export function render(ctx: CredCtx, m: Mutation = {}): Artifact {
  if (ctx.format === 'vc+sd-jwt') return renderSdJwt(ctx, m);
  if (ctx.format === 'mso_mdoc') return renderMdoc(ctx, m);
  return renderLdp(ctx, m);
}

export interface VpOptions {
  nonce: string;
  audience: string;
}

/** Wrap a credential artifact into the vp_token a wallet would send for the given format. */
export function renderVp(ctx: CredCtx, art: Artifact, o: VpOptions): Artifact {
  const now = new Date().toISOString();
  if (ctx.format === 'vc+sd-jwt') {
    const parts = String(art.raw).split('~');
    const issuerJwt = parts[0];
    const kept = parts.slice(1, -1).slice(0, 2);
    const kbHeader = { alg: 'ES256', typ: 'kb+jwt' };
    const kbPayload = { nonce: o.nonce, aud: o.audience, iat: Math.floor(Date.now() / 1000), sd_hash: sig(43) };
    const kb = `${b64u(JSON.stringify(kbHeader))}.${b64u(JSON.stringify(kbPayload))}.${sig()}`;
    return {
      raw: `${issuerJwt}~${kept.join('~')}~${kb}`,
      decoded: { issuerSignedJwt: '<unchanged>', disclosed: Object.keys(ctx.claims).slice(0, 2), kbJwt: { header: kbHeader, payload: kbPayload } },
    };
  }
  if (ctx.format === 'mso_mdoc') {
    const resp = {
      version: '1.0',
      status: 0,
      documents: [
        {
          ...((art.decoded as { documents: object[] }).documents[0] as object),
          deviceSigned: { deviceAuth: { deviceSignature: sig() }, sessionTranscript: { nonce: o.nonce, audience: o.audience } },
        },
      ],
    };
    return { raw: hex(220), decoded: resp };
  }
  const vp = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiablePresentation'],
    holder: ctx.holderDid,
    verifiableCredential: [art.raw],
    proof: {
      type: 'JsonWebSignature2020',
      created: now,
      proofPurpose: 'authentication',
      challenge: o.nonce,
      domain: o.audience,
      verificationMethod: `${ctx.holderDid}#0`,
      jws: `${b64u(JSON.stringify({ alg: 'ES256', b64: false, crit: ['b64'] }))}..${sig()}`,
    },
  };
  return { raw: vp, decoded: vp };
}
