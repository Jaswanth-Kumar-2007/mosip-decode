import { FilePlus2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { mockApi } from "../../utils/mockApi";

export function IssuerPanel() {
  const [issued, setIssued] = useState(false);
  const issue = () => {
    mockApi.issueCredential();
    setIssued(true);
  };

  return (
    <section className="product-panel issuer-panel">
      <div className="panel-copy">
        <span className="eyebrow">ISSUER · INJI CERTIFY</span>
        <h1>Issue trusted digital credentials.</h1>
        <p>Create a credential and make it available to a holder through the OpenID4VCI flow.</p>
        <button className="primary-btn" onClick={issue}>
          <FilePlus2 size={18} /> Issue credential
        </button>
        {issued && <div className="success-note"><CheckCircle2 size={18} /> Credential issued successfully.</div>}
      </div>
      <div className="credential-preview">
        <span>Digital Credential</span>
        <h3>University Degree</h3>
        <p>Issuer: Inji Certify</p>
        <div className="credential-line"><span>Credential ID</span><code>demo-001</code></div>
        <div className="credential-line"><span>Format</span><b>W3C VC · JSON-LD</b></div>
      </div>
    </section>
  );
}