import { ArrowRight, Building2, WalletCards, ShieldCheck } from "lucide-react";

export function FlowDiagram() {
  return (
    <div className="flow-grid">
      <div className="flow-node"><Building2 /><span>Issuer</span><small>Inji Certify</small></div>
      <ArrowRight className="flow-arrow" />
      <div className="flow-node"><WalletCards /><span>Wallet</span><small>Inji Web</small></div>
      <ArrowRight className="flow-arrow" />
      <div className="flow-node"><ShieldCheck /><span>Verifier</span><small>Inji Verify</small></div>
    </div>
  );
}