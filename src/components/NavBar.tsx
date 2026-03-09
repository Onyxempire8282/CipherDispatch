import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./navbar.css";

interface NavBarProps {
  role: "admin" | "appraiser";
  userName?: string;
}

const ADMIN_TABS = [
  { label: "Claims", path: "/admin/claims" },
  { label: "Calendar", path: "/admin/claims?view=calendar" },
  { label: "Vendors", path: "/admin/vendors" },
  { label: "Payouts", path: "/admin/payouts" },
];

const APPRAISER_TABS = [
  { label: "My Claims", path: "/my-claims" },
  { label: "Calendar", path: "/my-claims?view=calendar" },
  { label: "My Routes", path: "/my-routes" },
];

export const NavBar: React.FC<NavBarProps> = ({ role, userName }) => {
  const nav = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const tabs = role === "admin" ? ADMIN_TABS : APPRAISER_TABS;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav("/login");
  };

  const isActiveTab = (tabPath: string): boolean => {
    const [pathname, search] = tabPath.split("?");
    if (search) {
      return location.pathname === pathname && location.search.includes(search);
    }
    return location.pathname === pathname && !location.search.includes("view=");
  };

  return (
    <nav className="nav">
      <div className="nav__left">
        <Link to="/" className="nav__mark">CD</Link>
        <Link to="/" className="nav__brand">
          <div className="nav__brand-name">
            <span>CIPHER</span>DISPATCH
          </div>
          <div className="nav__brand-sub">Claims Operations</div>
        </Link>
        <div className="nav__tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`nav__tab${isActiveTab(tab.path) ? " nav__tab--active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="nav__right">
        <div className="nav__user">
          <span className="nav__user-name">
            {userName || (role === "admin" ? "Admin" : "Appraiser")}
          </span>
          {role === "admin" ? "Dispatcher" : "Field"}
        </div>
        <button className="nav__logout" onClick={handleLogout}>
          Logout
        </button>
        <button
          className="nav__hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "\u2715" : "\u2630"}
        </button>
      </div>
      <div className={`nav__drawer${menuOpen ? " nav__drawer--open" : ""}`}>
        {tabs.map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            className={`nav__drawer-link${isActiveTab(tab.path) ? " nav__drawer-link--active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            {tab.label}
          </Link>
        ))}
        <button
          className="nav__logout"
          onClick={() => {
            setMenuOpen(false);
            handleLogout();
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};
