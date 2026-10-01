import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PageShell } from "./components/common/PageShell";
import { HomePage } from "./pages/HomePage";
import { IssuerPage } from "./pages/IssuerPage";
import { WalletPage } from "./pages/WalletPage";
import { VerifierPage } from "./pages/VerifierPage";
import { PlaygroundPage } from "./pages/PlaygroundPage";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PageShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/issuer" element={<IssuerPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/verifier" element={<VerifierPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
        </Routes>
      </PageShell>
    </BrowserRouter>
  </React.StrictMode>
);