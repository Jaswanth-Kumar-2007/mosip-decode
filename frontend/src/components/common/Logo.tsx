import { ShieldCheck } from "lucide-react";

export function Logo() {
  return (
    <div className="logo">
      <div className="logo-mark"><ShieldCheck size={20} /></div>
      <div>
        <strong>Inji</strong>
        <span> Interoperability</span>
      </div>
    </div>
  );
}