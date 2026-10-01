import { useState } from "react";
import { FlowDiagram } from "../components/playground/FlowDiagram";
import { mockApi } from "../utils/mockApi";

export function PlaygroundPage() {
  const [step, setStep] = useState(0);
  const steps = ["Issue", "Hold", "Present", "Verify"];

  const run = () => {
    if (step < 4) {
      if (step === 0) mockApi.issueCredential();
      if (step === 1) mockApi.holdCredential();
      if (step === 2) mockApi.presentCredential();
      if (step === 3) mockApi.verifyCredential();
      setStep(step + 1);
    }
  };

  return (
    <div className="page-container">
      <div className="page-heading"><span>INTEROPERABILITY DEMO</span><h1>Playground</h1><p>Run the complete credential lifecycle across the three separate modules.</p></div>
      <FlowDiagram />
      <section className="playground-panel">
        <div className="steps">
          {steps.map((item, index) => <div className={`step ${index < step ? "done" : ""} ${index === step ? "active" : ""}`} key={item}><b>{index + 1}</b><span>{item}</span></div>)}
        </div>
        <div className="playground-action">
          <h2>{step < 4 ? `Step ${step + 1}: ${steps[step]}` : "Full cycle complete"}</h2>
          <p>{step < 4 ? `Simulate the ${steps[step].toLowerCase()} stage of the OpenID credential lifecycle.` : "Issuer → Wallet → Verifier completed successfully."}</p>
          <button className="primary-btn" onClick={run} disabled={step === 4}>{step === 4 ? "Completed" : `Run ${steps[step]}`}</button>
        </div>
      </section>
    </div>
  );
}