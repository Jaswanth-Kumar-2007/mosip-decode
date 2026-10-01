import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <AppHeader />
      <main>{children}</main>
    </div>
  );
}