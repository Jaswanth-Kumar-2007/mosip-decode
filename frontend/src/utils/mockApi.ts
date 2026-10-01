import type { Credential, VerificationResult } from "../types";

const demoCredential: Credential = {
  id: "urn:inji:credential:demo-001",
  type: "UniversityDegreeCredential",
  holder: "Demo Holder",
  issuer: "Inji Certify",
  issuedAt: new Date().toISOString(),
  status: "issued",
};

let credential = demoCredential;

export const mockApi = {
  issueCredential(): Credential {
    credential = {
      ...credential,
      id: `urn:inji:credential:${Date.now()}`,
      issuedAt: new Date().toISOString(),
      status: "issued",
    };
    return credential;
  },

  holdCredential(): Credential {
    credential = { ...credential, status: "held" };
    return credential;
  },

  presentCredential(): Credential {
    credential = { ...credential, status: "presented" };
    return credential;
  },

  verifyCredential(): VerificationResult {
    credential = { ...credential, status: "verified" };
    return {
      valid: true,
      message: "Credential signature and presentation checks passed.",
      checkedAt: new Date().toISOString(),
    };
  },

  getCredential(): Credential {
    return credential;
  },
};