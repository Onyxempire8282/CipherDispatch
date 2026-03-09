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
  { label: "Contractors", path: "/admin/contractors" },
  { label: "KPI", path: "/admin/kpi" },
];

const APPRAISER_TABS = [
  { label: "My Claims", path: "/my-claims" },
  { label: "Calendar", path: "/my-claims?view=calendar" },
  { label: "My Routes", path: "/my-routes" },
];

const ADMIN_BOTTOM_NAV = [
  { label: "Claims", icon: "◫", path: "/admin/claims" },
  { label: "Vendors", icon: "⊹", path: "/admin/vendors" },
  { label: "Payouts", icon: "⊞", path: "/admin/payouts" },
  { label: "KPI", icon: "⊟", path: "/admin/kpi" },
  { label: "Home", icon: "⌂", path: "/" },
];

const APPRAISER_BOTTOM_NAV = [
  { label: "Claims", icon: "◫", path: "/my-claims" },
  { label: "Routes", icon: "⊹", path: "/my-routes" },
  { label: "Capture", icon: "⊡", path: "/appraiser/claim" },
  { label: "Home", icon: "⊟", path: "/" },
];

export const NavBar: React.FC<NavBarProps> = ({ role, userName }) => {
  const nav = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const tabs = role === "admin" ? ADMIN_TABS : APPRAISER_TABS;
  const bottomTabs = role === "admin" ? ADMIN_BOTTOM_NAV : APPRAISER_BOTTOM_NAV;

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
  <>
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

    <div className="bottom-nav">
      {bottomTabs.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`bottom-nav__item ${
            item.path === "/"
              ? location.pathname === "/"
                ? "bottom-nav__item--active"
                : ""
              : location.pathname.startsWith(item.path)
              ? "bottom-nav__item--active"
              : ""
          }`}
        >
          <span className="bottom-nav__icon">{item.icon}</span>
          <span className="bottom-nav__label">{item.label}</span>
        </Link>
      ))}
    </div>
  </>
  );
};
