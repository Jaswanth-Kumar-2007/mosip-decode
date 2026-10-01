import type {
  ActorId, Artifact, Check, CredCtx, FormatId, HeldCredential, Outcome, RunConfig, RunResult, Scope, Step,
  StepError, Verification, VerificationResult,
} from '../types';
import { TAMPERS, credentialType, impl } from '../data/catalog';
import { makeCtx, render, renderVp, type Mutation } from './credentials';
import { b64u, byteLen, enc, rnd, sig, sum, uuid } from './util';

/** Simulated engine. Pure functions that mimic the OpenID4VCI / OpenID4VP exchanges for a configuration. */

export const QR_MAX_BYTES = 2331; // QR version 40, error-correction level M, binary mode
export const QR_DENSE_BYTES = 900; // above this, camera scanning gets unreliable

const HOST: Record<string, string> = {
  'inji-certify': 'certify.playground.local',
  'mock-oid4vci': 'issuer.mock.local',
  'inji-verify': 'verify.playground.local',
  'inji-verify-sdk': 'rp-sdk.playground.local',
  'mock-oid4vp': 'verifier.mock.local',
  'inji-wallet-mobile': 'mimoto.playground.local',
  'inji-web': 'injiweb.playground.local',
  'mock-wallet': 'wallet.mock.local',
};
export const host = (id: string) => HOST[id] ?? `${id}.local`;
const authHost = (issuerId: string) => (issuerId === 'inji-certify' ? 'esignet.playground.local' : `auth.${host(issuerId)}`);

export interface PhaseResult {
  steps: Step[];
  failed?: Step;
  ctx?: CredCtx;
  artifact?: Artifact;
  verification?: Verification;
}

type StepInit = Omit<Step, 'id' | 'phase' | 'latencyMs'> & { latencyMs?: number };

function stepper(phase: Step['phase']) {
  const steps: Step[] = [];
  let failed: Step | undefined;
  const push = (s: StepInit): Step => {
    const st: Step = {
      ...s,
      id: `${phase === 'issuance' ? 'i' : 'p'}${steps.length + 1}`,
      phase,
      latencyMs: s.latencyMs ?? Math.round(35 + Math.random() * 300),
    };
    steps.push(st);
    if (st.status === 'error' && !failed) failed = st;
    return st;
  };
  return { steps, push, failed: () => failed };
}

const err = (code: string, message: string, layer: StepError['layer'], blame: string): StepError => ({ code, message, layer, blame });
const fmtTag = (f: FormatId) => (f === 'ldp_vc' ? 'ldp' : f === 'vc+sd-jwt' ? 'sdjwt' : 'mdoc');
const jwtOf = (header: object, payload: object) => `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}.${sig()}`;

function configEntry(cfg: RunConfig): Record<string, unknown> {
  const ct = credentialType(cfg.credentialType);
  const base = {
    scope: `${cfg.credentialType}-${fmtTag(cfg.format)}`,
    cryptographic_binding_methods_supported: ['did:jwk'],
    proof_types_supported: { jwt: { proof_signing_alg_values_supported: ['ES256'] } },
  };
  if (cfg.format === 'vc+sd-jwt')
    return { format: 'vc+sd-jwt', vct: ct.id, credential_signing_alg_values_supported: [cfg.proofType], ...base };
  if (cfg.format === 'mso_mdoc')
    return { format: 'mso_mdoc', doctype: 'org.iso.18013.5.1.mDL', credential_signing_alg_values_supported: [cfg.proofType], ...base };
  return {
    format: 'ldp_vc',
    credential_definition: { '@context': ['https://www.w3.org/2018/credentials/v1'], type: ['VerifiableCredential', ct.id] },
    credential_signing_alg_values_supported: [cfg.proofType],
    ...base,
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Issuance (OpenID4VCI)                                                                       */
/* ------------------------------------------------------------------------------------------ */
export function buildIssuance(cfg: RunConfig): PhaseResult {
  const issuer = impl(cfg.issuerId);
  const wallet = impl(cfg.walletId);
  const s = stepper('issuance');
  const out = (extra: Partial<PhaseResult> = {}): PhaseResult => ({ steps: s.steps, failed: s.failed(), ...extra });

  const iss = `https://${host(issuer.id)}`;
  const as = `https://${authHost(issuer.id)}`;
  const cfgId = `${cfg.credentialType}-${fmtTag(cfg.format)}`;
  const ct = credentialType(cfg.credentialType);

  // 1. Credential offer
  const offerUri = `openid-credential-offer://?credential_offer_uri=${enc(`${iss}/v1/offers/${rnd(12)}`)}`;
  const offer = {
    credential_issuer: iss,
    credential_configuration_ids: [cfgId],
    grants: { authorization_code: { issuer_state: rnd(24) } },
  };
  if (!issuer.formats.includes(cfg.format)) {
    const e = err('unsupported_credential_format', `${issuer.name} has no credential configuration for ${cfg.format}.`, 'issuer', issuer.id);
    s.push({
      from: 'issuer', to: 'wallet', label: 'Credential Offer', protocol: 'OpenID4VCI', status: 'error', error: e,
      note: 'The issuer cannot create an offer for this format.',
      payload: { title: 'error', body: { error: e.code, error_description: e.message } },
    });
    return out();
  }
  s.push({
    from: 'issuer', to: 'wallet', label: 'Credential Offer', protocol: 'OpenID4VCI', status: 'ok', artifact: 'credential_offer',
    note: wallet.id === 'inji-web' ? 'Opened in the browser wallet through a link.' : 'Scanned from a QR code or opened by deep link.',
    handoff: { kind: wallet.id === 'inji-web' ? 'deeplink' : 'qr', uri: offerUri, bytes: byteLen(offerUri), label: 'Credential offer' },
    payload: { title: 'credential_offer', body: { credential_offer_uri: offerUri, credential_offer: offer } },
  });

  // 2. Issuer metadata
  s.push({
    from: 'library', to: 'issuer', label: 'GET issuer metadata', protocol: 'OpenID4VCI', status: 'ok', artifact: 'issuer_metadata',
    payload: {
      title: '/.well-known/openid-credential-issuer',
      body: {
        request: { method: 'GET', url: `${iss}/.well-known/openid-credential-issuer` },
        response: {
          credential_issuer: iss,
          credential_endpoint: `${iss}/v1/credential`,
          authorization_servers: [as],
          credential_configurations_supported: { [cfgId]: configEntry(cfg) },
        },
      },
    },
  });

  // 3. Match configuration with wallet capabilities
  if (!wallet.formats.includes(cfg.format)) {
    const e = err('wallet_unsupported_format', `${wallet.name} cannot store credentials in format ${cfg.format}.`, 'library', wallet.id);
    s.push({
      from: 'library', to: 'wallet', label: 'Match configuration', protocol: 'OpenID4VCI', status: 'error', error: e,
      note: 'Offered configuration is outside the wallet capability list.',
      payload: { title: 'error', body: { error: e.code, wallet_formats: wallet.formats, offered: cfg.format } },
    });
    return out();
  }
  s.push({
    from: 'library', to: 'wallet', label: 'Match configuration', protocol: 'OpenID4VCI', status: 'ok',
    payload: { title: 'configuration match', body: { selected: cfgId, format: cfg.format, wallet_formats: wallet.formats } },
  });

  // 4. Authorization server metadata
  s.push({
    from: 'library', to: 'authz', label: 'GET AS metadata', protocol: 'OAuth 2.0', status: 'ok',
    payload: {
      title: '/.well-known/oauth-authorization-server',
      body: {
        request: { method: 'GET', url: `${as}/.well-known/oauth-authorization-server` },
        response: {
          issuer: as, authorization_endpoint: `${as}/authorize`, token_endpoint: `${as}/oauth/v2/token`,
          code_challenge_methods_supported: ['S256'], grant_types_supported: ['authorization_code'],
        },
      },
    },
  });

  // 5. Authorization request (PKCE)
  const state = rnd(16);
  const code = rnd(24);
  s.push({
    from: 'wallet', to: 'authz', label: 'Authorization request (PKCE)', protocol: 'OAuth 2.0', status: 'ok',
    payload: {
      title: 'authorization request',
      body: {
        method: 'GET',
        url: `${as}/authorize`,
        params: {
          response_type: 'code', client_id: wallet.id, redirect_uri: `${host(wallet.id)}/redirect`, scope: cfgId,
          state, code_challenge: sig(43), code_challenge_method: 'S256', issuer_state: offer.grants.authorization_code.issuer_state,
        },
      },
    },
  });

  // 6. Authenticate and consent
  s.push({
    from: 'authz', to: 'wallet', label: 'Authenticate and consent', protocol: 'OAuth 2.0', status: 'ok',
    note: issuer.id === 'inji-certify' ? 'eSignet-style login (mock identity plugin).' : 'Mock login screen.',
    payload: { title: 'authorization response', body: { redirect: `${host(wallet.id)}/redirect?code=${code}&state=${state}` } },
  });

  // 7. Token exchange
  const cNonce = rnd(22);
  s.push({
    from: 'library', to: 'authz', label: 'Token exchange', protocol: 'OAuth 2.0', status: 'ok', artifact: 'token',
    payload: {
      title: 'token exchange',
      body: {
        request: { method: 'POST', url: `${as}/oauth/v2/token`, body: { grant_type: 'authorization_code', code, code_verifier: sig(43), client_id: wallet.id } },
        response: { access_token: jwtOf({ alg: 'RS256', typ: 'at+jwt' }, { iss: as, aud: iss, scope: cfgId, exp: Math.floor(Date.now() / 1000) + 300 }), token_type: 'Bearer', expires_in: 300, c_nonce: cNonce, c_nonce_expires_in: 300 },
      },
    },
  });

  // 8. Credential request / response
  const ctx = makeCtx(cfg, host(issuer.id));
  const artifact = render(ctx);
  const proofJwt = jwtOf(
    { typ: 'openid4vci-proof+jwt', alg: 'ES256', jwk: { kty: 'EC', crv: 'P-256' } },
    { iss: wallet.id, aud: iss, iat: Math.floor(Date.now() / 1000), nonce: cNonce },
  );
  const fmtFields =
    cfg.format === 'vc+sd-jwt' ? { vct: ct.id } : cfg.format === 'mso_mdoc' ? { doctype: 'org.iso.18013.5.1.mDL' } : { credential_definition: { type: ['VerifiableCredential', ct.id] } };
  s.push({
    from: 'library', to: 'issuer', label: 'Credential request', protocol: 'OpenID4VCI', status: 'ok', artifact: 'credential',
    note: `Issued as ${cfg.format}, signed with ${cfg.proofType} under ${cfg.didMethod}.`,
    payload: {
      title: 'credential request / response',
      body: {
        request: { method: 'POST', url: `${iss}/v1/credential`, headers: { Authorization: 'Bearer <access_token>' }, body: { format: cfg.format, ...fmtFields, proof: { proof_type: 'jwt', jwt: proofJwt } } },
        response: { credential: artifact.raw, c_nonce: rnd(22), c_nonce_expires_in: 300 },
        ...(cfg.format === 'ldp_vc' ? {} : { _decoded_by_playground: artifact.decoded }),
      },
    },
  });

  // 9. Store
  const mock = issuer.experimental?.includes(cfg.format) || wallet.experimental?.includes(cfg.format);
  s.push({
    from: 'library', to: 'wallet', label: 'Store credential', protocol: 'Wallet', status: mock ? 'warn' : 'ok',
    note: mock ? `${cfg.format} runs in mock / preview mode on this module.` : 'Credential saved in the wallet key store.',
    payload: { title: 'stored credential', body: { id: `urn:uuid:${ctx.uuid}`, format: cfg.format, issuer: ctx.issuerDid, holder_binding: ctx.holderDid } },
  });

  return out({ ctx, artifact });
}

/* ------------------------------------------------------------------------------------------ */
/* Presentation (OpenID4VP)                                                                    */
/* ------------------------------------------------------------------------------------------ */
function mutationFor(t: RunConfig['tamper']): Mutation {
  return { expired: t === 'expired', badSig: t === 'bad_signature', wrongType: t === 'wrong_type' };
}

const TAMPER_NOTE: Record<RunConfig['tamper'], string> = {
  none: '',
  expired: 'Tamper injected: validity end moved to 2023-01-01.',
  bad_signature: 'Tamper injected: last 6 characters of the signature replaced.',
  wrong_type: 'Tamper injected: credential type changed to PaymentCredential.',
  nonce_replay: 'Tamper injected: VP is bound to a stale nonce from an earlier session.',
};

export function buildPresentation(cfg: RunConfig, held: HeldCredential | null): PhaseResult {
  const wallet = impl(cfg.walletId);
  const verifier = impl(cfg.verifierId);
  const s = stepper('presentation');
  const out = (extra: Partial<PhaseResult> = {}): PhaseResult => ({ steps: s.steps, failed: s.failed(), ...extra });

  const vHost = `https://${host(verifier.id)}`;
  const responseUri = `${vHost}/v1/verify/vp-response`;
  const clientId = `redirect_uri:${responseUri}`;
  const nonce = rnd(24);
  const state = rnd(16);
  const ct = credentialType(cfg.credentialType);
  const accepted = verifier.proofs?.[cfg.format] ?? [];
  const claimNames = Object.keys(ct.claims);

  // presentation_definition
  const fmtKey: Record<FormatId, object> = {
    ldp_vc: { ldp_vc: { proof_type: accepted } },
    'vc+sd-jwt': { 'vc+sd-jwt': { 'sd-jwt_alg_values': accepted, 'kb-jwt_alg_values': ['ES256'] } },
    mso_mdoc: { mso_mdoc: { alg: accepted } },
  };
  const path = (k: string) =>
    cfg.format === 'ldp_vc' ? `$.credentialSubject.${k}` : cfg.format === 'mso_mdoc' ? `$['org.iso.18013.5.1']['${k}']` : `$.${k}`;
  const typeField =
    cfg.format === 'ldp_vc'
      ? { path: ['$.type'], filter: { type: 'array', contains: { const: ct.id } } }
      : cfg.format === 'vc+sd-jwt'
        ? { path: ['$.vct'], filter: { type: 'string', const: ct.id } }
        : { path: ['$.docType'], filter: { type: 'string', const: 'org.iso.18013.5.1.mDL' } };
  const pd = {
    id: uuid(),
    name: 'Interoperability playground request',
    purpose: 'Verify the credential issued in the previous step',
    input_descriptors: [
      {
        id: 'cred-1',
        name: ct.label,
        format: fmtKey[cfg.format],
        constraints: { limit_disclosure: 'required', fields: [typeField, ...claimNames.map((k) => ({ path: [path(k)], name: k, purpose: `Needed to check ${k} against the issuing record`, intent_to_retain: false }))] },
      },
    ],
  };
  const vpFormats = Object.assign({}, ...verifier.formats.map((f) => fmtKey[f]));
  const requestObj = {
    client_id: clientId, client_id_scheme: 'redirect_uri', response_type: 'vp_token', response_mode: 'direct_post',
    response_uri: responseUri, nonce, state, client_metadata: { vp_formats: vpFormats }, presentation_definition: pd,
  };

  const byRef = cfg.requestMode === 'by_reference' && cfg.flow !== 'dc-api';
  const requestUri = `${vHost}/v1/verify/vp-request/${rnd(10)}`;
  const uri = byRef
    ? `openid4vp://authorize?client_id=${enc(clientId)}&request_uri=${enc(requestUri)}`
    : `openid4vp://authorize?client_id=${enc(clientId)}&client_id_scheme=redirect_uri&response_type=vp_token&response_mode=direct_post&response_uri=${enc(responseUri)}&nonce=${nonce}&state=${state}&presentation_definition=${enc(JSON.stringify(pd))}&client_metadata=${enc(JSON.stringify({ vp_formats: vpFormats }))}`;
  const dcPayload = JSON.stringify({ protocol: 'openid4vp', data: requestObj });
  const handoffBytes = cfg.flow === 'dc-api' ? byteLen(dcPayload) : byteLen(uri);
  const kind = cfg.flow === 'cross-device' ? 'qr' : cfg.flow === 'same-device' ? 'deeplink' : 'dc-api';
  const label1 = cfg.flow === 'cross-device' ? 'Authorization request (QR)' : cfg.flow === 'same-device' ? 'Authorization request (deep link)' : 'Authorization request (DC API)';
  const handoff = { kind, uri: cfg.flow === 'dc-api' ? dcPayload : uri, bytes: handoffBytes, label: 'Authorization request' } as const;
  const hasReqArtifact = !byRef;

  // 1. Verifier produces the request
  if (!verifier.formats.includes(cfg.format)) {
    const e = err('verifier_unsupported_format', `${verifier.name} cannot request or validate ${cfg.format}.`, 'verifier', verifier.id);
    s.push({
      from: 'verifier', to: 'wallet', label: label1, protocol: 'OpenID4VP', status: 'error', error: e,
      note: 'The relying party has no presentation profile for this format.',
      payload: { title: 'error', body: { error: e.code, verifier_formats: verifier.formats, requested: cfg.format } },
    });
    return out();
  }
  if (!wallet.flows?.includes(cfg.flow)) {
    const e = err('wallet_flow_unsupported', `${wallet.name} does not support the ${cfg.flow} flow.`, 'wallet', wallet.id);
    s.push({
      from: 'verifier', to: 'wallet', label: label1, protocol: 'OpenID4VP', status: 'error', error: e, handoff,
      note: 'The request reached the wallet but it cannot handle this delivery method.',
      payload: { title: 'error', body: { error: e.code, wallet_flows: wallet.flows, requested: cfg.flow } },
    });
    return out();
  }
  if (cfg.flow === 'cross-device' && handoffBytes > QR_MAX_BYTES) {
    const e = err('qr_capacity_exceeded', `Request is ${handoffBytes} bytes; the largest QR code holds ${QR_MAX_BYTES}. Use request_uri (by reference).`, 'protocol', verifier.id);
    s.push({
      from: 'verifier', to: 'wallet', label: label1, protocol: 'OpenID4VP', status: 'error', error: e, handoff,
      note: 'Request passed by value does not fit in a QR code.',
      payload: { title: 'error', body: { error: e.code, bytes: handoffBytes, max_bytes: QR_MAX_BYTES, presentation_definition: pd } },
    });
    return out();
  }
  const dense = cfg.flow === 'cross-device' && handoffBytes > QR_DENSE_BYTES;
  s.push({
    from: 'verifier', to: 'wallet', label: label1, protocol: 'OpenID4VP', status: dense ? 'warn' : 'ok', handoff,
    artifact: hasReqArtifact ? 'authorization_request' : undefined,
    note: dense ? `Dense QR (${handoffBytes} bytes). Scanning may be unreliable; prefer request_uri.` : byRef ? 'Request is passed by reference (request_uri).' : 'Request is passed by value.',
    payload: { title: 'authorization request', body: cfg.flow === 'dc-api' ? { navigator_credentials_get: { digital: { requests: [{ protocol: 'openid4vp', data: requestObj }] } } } : { uri, bytes: handoffBytes, ...(byRef ? {} : { request: requestObj }) } },
  });

  // 2. Resolve request_uri
  if (byRef) {
    s.push({
      from: 'library', to: 'verifier', label: 'GET request_uri', protocol: 'OpenID4VP', status: 'ok', artifact: 'authorization_request',
      payload: {
        title: 'request object',
        body: {
          request: { method: 'GET', url: requestUri },
          response: { content_type: 'application/oauth-authz-req+jwt', jwt: jwtOf({ alg: 'ES256', typ: 'oauth-authz-req+jwt' }, requestObj), decoded: requestObj },
        },
      },
    });
  }

  // 3. Match credentials
  const matchBody = { presentation_definition: pd, wallet_credentials: held ? [`urn:uuid:${held.ctx.uuid}`] : [] };
  if (!held) {
    const e = err('no_matching_credential', `${wallet.name} holds no ${cfg.format} credential. Issue one first.`, 'wallet', wallet.id);
    s.push({
      from: 'library', to: 'wallet', label: 'Match credentials', protocol: 'OpenID4VP', status: 'error', error: e, artifact: 'presentation_definition',
      payload: { title: 'error', body: { error: e.code, ...matchBody } },
    });
    return out();
  }
  if (!accepted.includes(held.ctx.proofType)) {
    const e = err('no_matching_credential', `Credential proof "${held.ctx.proofType}" is not in the request's accepted list [${accepted.join(', ')}].`, 'protocol', verifier.id);
    s.push({
      from: 'library', to: 'wallet', label: 'Match credentials', protocol: 'OpenID4VP', status: 'error', error: e, artifact: 'presentation_definition',
      note: 'Proof-type incompatibility between issuer and verifier.',
      payload: { title: 'error', body: { error: e.code, credential_proof: held.ctx.proofType, accepted, ...matchBody } },
    });
    return out();
  }
  s.push({
    from: 'library', to: 'wallet', label: 'Match credentials', protocol: 'OpenID4VP', status: 'ok', artifact: 'presentation_definition',
    payload: { title: 'presentation_definition', body: { ...matchBody, matches: [{ input_descriptor_id: 'cred-1', credential: `urn:uuid:${held.ctx.uuid}` }] } },
  });

  // 4. Consent
  s.push({
    from: 'wallet', to: 'wallet', label: 'Consent and selective disclosure', protocol: 'Wallet', status: 'ok',
    payload: { title: 'consent', body: { disclosing: claimNames.slice(0, 3), withheld: claimNames.slice(3) } },
  });

  // 5. Build VP (tamper happens here)
  const tampered = cfg.tamper !== 'none';
  const art = render(held.ctx, mutationFor(cfg.tamper));
  const vpNonce = cfg.tamper === 'nonce_replay' ? `stale-${rnd(14)}` : nonce;
  const vp = renderVp(held.ctx, art, { nonce: vpNonce, audience: clientId });
  s.push({
    from: 'library', to: 'wallet', label: tampered ? 'Build VP (tampered)' : 'Build VP', protocol: 'OpenID4VP', status: tampered ? 'warn' : 'ok',
    artifact: 'vp_token', injected: tampered, note: tampered ? TAMPER_NOTE[cfg.tamper] : 'Holder binding added.',
    payload: { title: 'vp_token', body: { vp_token: vp.raw, _decoded_by_playground: vp.decoded } },
  });

  // 6. Response
  s.push({
    from: 'wallet', to: 'verifier', label: cfg.flow === 'dc-api' ? 'DC API response' : 'Authorization response', protocol: 'OpenID4VP', status: 'ok',
    payload: {
      title: 'authorization response',
      body: {
        request: {
          method: 'POST', url: responseUri, content_type: 'application/x-www-form-urlencoded',
          body: {
            vp_token: '<see Build VP>', state,
            presentation_submission: { id: uuid(), definition_id: pd.id, descriptor_map: [{ id: 'cred-1', format: cfg.format, path: '$' }] },
          },
        },
        response: { redirect_uri: `${vHost}/#/result/${state}` },
      },
    },
  });

  // 7. Validation
  const didOk = (verifier.dids ?? []).includes(held.ctx.didMethod);
  const nonceOk = cfg.tamper !== 'nonce_replay';
  const typeOk = cfg.tamper !== 'wrong_type';
  const sigOk = cfg.tamper !== 'bad_signature';
  const liveOk = cfg.tamper !== 'expired';
  const checks: Check[] = [
    { name: 'Request nonce and audience match', ok: didOk ? nonceOk : false, detail: !didOk ? 'skipped' : nonceOk ? 'nonce matches the request' : 'nonce does not match the request' },
    { name: `Issuer DID resolves (${held.ctx.didMethod})`, ok: didOk, detail: didOk ? `${verifier.name} resolved ${held.ctx.didMethod}` : `${verifier.name} cannot resolve ${held.ctx.didMethod}` },
    { name: 'Credential type matches request', ok: didOk ? typeOk : false, detail: !didOk ? 'skipped' : typeOk ? ct.id : 'type differs from the presentation_definition' },
    { name: `Proof type accepted (${held.ctx.proofType})`, ok: true, detail: `in [${accepted.join(', ')}]` },
    { name: 'Signature valid', ok: didOk ? sigOk : false, detail: !didOk ? 'skipped: issuer key could not be resolved' : sigOk ? 'signature verifies' : 'signature does not verify' },
    { name: 'Credential not expired', ok: didOk ? liveOk : false, detail: !didOk ? 'skipped' : liveOk ? 'within validity period' : 'validity period has ended' },
  ];
  let result: VerificationResult = 'VALID';
  let code = '';
  if (!didOk) { result = 'INVALID'; code = 'did_resolution_failed'; }
  else if (!nonceOk) { result = 'INVALID'; code = 'nonce_mismatch'; }
  else if (!typeOk) { result = 'INVALID'; code = 'credential_type_mismatch'; }
  else if (!sigOk) { result = 'INVALID'; code = 'invalid_signature'; }
  else if (!liveOk) { result = 'EXPIRED'; code = 'credential_expired'; }
  const verification: Verification = { result, code, checks };

  const mock = verifier.experimental?.includes(cfg.format);
  const expected = TAMPERS[cfg.tamper].expect;
  if (!didOk) {
    const e = err('did_resolution_failed', `${verifier.name} cannot resolve ${held.ctx.didMethod}; issuer ${held.ctx.issuerDid.slice(0, 40)}... is unknown to it.`, 'verifier', verifier.id);
    s.push({
      from: 'verifier', to: 'verifier', label: 'Verify VP and credential', protocol: 'Verifier', status: 'error', error: e,
      note: 'DID method gap between issuer and verifier.', payload: { title: 'verification checks', body: { result, code, checks } },
    });
  } else {
    s.push({
      from: 'verifier', to: 'verifier', label: 'Verify VP and credential', protocol: 'Verifier', status: mock && result === 'VALID' ? 'warn' : 'ok',
      note: result === expected && result !== 'VALID' ? 'Rejected as expected for this tamper mode.' : mock ? `${cfg.format} verification is in mock / preview mode.` : undefined,
      payload: { title: 'verification checks', body: { result, code, checks } },
    });
  }

  // 8. Result
  s.push({
    from: 'verifier', to: 'wallet', label: `Result: ${result}`, protocol: 'Verifier', status: 'ok', artifact: 'verification_result',
    payload: {
      title: 'verification result',
      body: { verificationStatus: result === 'VALID' ? 'SUCCESS' : result, verificationErrorCode: code, verifier: verifier.name, format: cfg.format, issuer: held.ctx.issuerDid, checks: checks.map((c) => `${c.ok ? 'pass' : 'fail'}: ${c.name}`) },
    },
  });

  return out({ verification });
}

/* ------------------------------------------------------------------------------------------ */
/* Orchestration                                                                               */
/* ------------------------------------------------------------------------------------------ */
export function toHeld(cfg: RunConfig, ctx: CredCtx, artifact: Artifact): HeldCredential {
  return { id: `cred-${rnd(6)}`, walletId: cfg.walletId, issuerId: cfg.issuerId, ctx, artifact, issuedAt: ctx.issuedAt };
}

export function summarize(
  cfg: RunConfig, scope: Scope, steps: Step[], verification: Verification | undefined, failed: Step | undefined,
): { outcome: Outcome; expected: VerificationResult | 'n/a'; error?: StepError } {
  const expected = scope === 'issue' ? 'n/a' : (TAMPERS[cfg.tamper].expect as VerificationResult);
  if (failed) return { outcome: 'FAIL', expected, error: failed.error };
  const warns = steps.some((st) => st.status === 'warn' && !st.injected);
  if (scope !== 'issue') {
    if (!verification) return { outcome: 'FAIL', expected, error: err('no_verification_result', 'The flow ended without a verification result.', 'verifier', cfg.verifierId) };
    if (verification.result !== expected) {
      return { outcome: 'FAIL', expected, error: err('unexpected_verification_result', `Expected ${expected} but the verifier returned ${verification.result}.`, 'verifier', cfg.verifierId) };
    }
  }
  return { outcome: warns ? 'WARN' : 'PASS', expected };
}

export function buildRun(cfg: RunConfig, scope: Scope, held: HeldCredential | null): RunResult {
  let steps: Step[] = [];
  let credential: HeldCredential | undefined;
  let verification: Verification | undefined;
  let failed: Step | undefined;
  if (scope !== 'present') {
    const r = buildIssuance(cfg);
    steps = r.steps;
    failed = r.failed;
    if (r.ctx && r.artifact) credential = toHeld(cfg, r.ctx, r.artifact);
  }
  if (scope !== 'issue' && !failed) {
    const p = buildPresentation(cfg, credential ?? held);
    steps = [...steps, ...p.steps];
    failed = p.failed;
    verification = p.verification;
  }
  const { outcome, expected, error } = summarize(cfg, scope, steps, verification, failed);
  return { steps, credential, verification, outcome, expected, error, durationMs: sum(steps.map((x) => x.latencyMs)) };
}

/** Capability preflight: what the simulator predicts for this configuration, without animating it. */
export function preflight(cfg: RunConfig): { outcome: Outcome; message: string } {
  const r = buildRun(cfg, 'full', null);
  const bad = r.steps.find((x) => x.status === 'error');
  if (bad?.error) return { outcome: 'FAIL', message: bad.error.message };
  const warn = r.steps.find((x) => x.status === 'warn' && !x.injected);
  if (warn) return { outcome: 'WARN', message: warn.note ?? 'Completes with a warning.' };
  return { outcome: r.outcome, message: 'All capability checks pass.' };
}
