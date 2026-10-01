import { CreditCard, QrCode, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { mockApi } from "../../utils/mockApi";

export function WalletPanel() {
  const [held, setHeld] = useState(mockApi.getCredential().status === "held");

  const receive = () => {
    mockApi.holdCredential();
    setHeld(true);
  };

  return (
    <section className="product-panel wallet-panel">
      <div className="panel-copy">
        <span className="eyebrow">WALLET · INJI WEB</span>
        <h1>Hold and present your credentials.</h1>
        <p>A holder-facing experience for securely storing credentials and presenting them to relying parties.</p>
        <div className="button-row">
          <button className="primary-btn" onClick={receive}><CreditCard size={18} /> Receive credential</button>
          <button className="secondary-btn"><QrCode size={18} /> Present by QR</button>
        </div>
        {held && <div className="success-note"><CheckCircle2 size={18} /> Credential is now held in the wallet.</div>}
      </div>
      <div className="phone-card">
        <div className="phone-top">Inji Web <span>●</span></div>
        <div className="mini-credential"><b>University Degree</b><small>Issued by Inji Certify</small><strong>VERIFIED CREDENTIAL</strong></div>
        <button className="secondary-btn full">Present credential</button>
      </div>
    </section>
  );
}