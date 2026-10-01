import { Link, NavLink } from "react-router-dom";
import { Logo } from "./Logo";
import { routes } from "../../utils/navigation";

export function AppHeader() {
  return (
    <header className="app-header">
      <Link to={routes.home} className="brand-link"><Logo /></Link>
      <nav>
        <NavLink to={routes.issuer}>Issuer</NavLink>
        <NavLink to={routes.wallet}>Wallet</NavLink>
        <NavLink to={routes.verifier}>Verifier</NavLink>
        <NavLink to={routes.playground}>Playground</NavLink>
      </nav>
      <span className="engine-pill">● Simulated engine</span>
    </header>
  );
}