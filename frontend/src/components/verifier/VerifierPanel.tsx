import { ScanLine, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { mockApi } from "../../utils/mockApi";

export function VerifierPanel() {
  const [verified, setVerified] = useState<boolean | null>(null);

  const verify = () => {
    const result = mockApi.verifyCredential();
    setVerified(result.valid);
  };

  return (
    <section className="product-panel verifier-panel">
      <div className="panel-copy">
        <span className="eyebrow">VERIFIER · INJI VERIFY</span>
        <h1>Verify credentials with confidence.</h1>
        <p>Request and verify presentations from a wallet using the OpenID4VP relying-party flow.</p>
        <button className="primary-btn" onClick={verify}><ScanLine size={18} /> Verify presentation</button>
        {verified === true && <div className="success-note"><ShieldCheck size={18} /> Credential verified successfully.</div>}
        {verified === false && <div className="error-note"><XCircle size={18} /> Verification failed.</div>}
      </div>
      <div className="verify-result">
        <div className="verify-icon"><ShieldCheck size={42} /></div>
        <span>VERIFICATION RESULT</span>
        <h2>{verified ? "Valid credential" : "Awaiting presentation"}</h2>
        <p>{verified ? "Signature, issuer and presentation checks passed." : "Start a verification request to inspect a credential."}</p>
      </div>
    </section>
  );
}