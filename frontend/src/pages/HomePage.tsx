import { Link } from "react-router-dom";
import { ArrowRight, Building2, WalletCards, ShieldCheck, Workflow } from "lucide-react";
import { routes } from "../utils/navigation";

export function HomePage() {
  return (
    <div className="home-page">
      <section className="hero">
        <div>
          <span className="eyebrow">OPENID4VCI · OPENID4VP</span>
          <h1>One credential.<br /><em>Three interoperable experiences.</em></h1>
          <p>Explore how an issuer, wallet and verifier work together in a standards-based digital credential journey.</p>
          <div className="button-row">
            <Link className="primary-btn" to={routes.playground}>Open playground <ArrowRight size={18} /></Link>
            <Link className="secondary-btn" to={routes.issuer}>Explore modules</Link>
          </div>
        </div>
        <div className="hero-orbit"><Workflow size={96} /></div>
      </section>

      <section className="module-grid">
        <Link to={routes.issuer} className="module-card"><Building2 /><span>01 · Issuer</span><h2>Inji Certify</h2><p>Issue a verifiable credential.</p></Link>
        <Link to={routes.wallet} className="module-card"><WalletCards /><span>02 · Wallet</span><h2>Inji Web</h2><p>Hold and present credentials.</p></Link>
        <Link to={routes.verifier} className="module-card"><ShieldCheck /><span>03 · Verifier</span><h2>Inji Verify</h2><p>Request and verify presentations.</p></Link>
      </section>
    </div>
  );
}