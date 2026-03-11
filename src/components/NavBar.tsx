import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { AppRole } from "../lib/supabaseAuthz";
import "./navbar.css";

interface NavBarProps {
  role: AppRole;
  userName?: string;
}

const ADMIN_TABS = [
  { label: "Claims", path: "/claims" },
  { label: "Calendar", path: "/calendar" },
  { label: "Vendors & Payouts", path: "/vendors" },
  { label: "Contractors", path: "/contractors" },
  { label: "KPI", path: "/kpi" },
];

const DISPATCH_TABS = [
  { label: "Claims", path: "/claims" },
  { label: "Calendar", path: "/calendar" },
  { label: "Contractors", path: "/contractors" },
];

const WRITER_TABS = [
  { label: "Claims", path: "/claims" },
  { label: "Calendar", path: "/calendar" },
];

const APPRAISER_TABS = [
  { label: "My Claims", path: "/my-claims" },
  { label: "Calendar", path: "/my-claims?view=calendar" },
  { label: "Today's Run", path: "/my-routes" },
];

const ADMIN_BOTTOM_NAV = [
  { label: "Claims", icon: "◫", path: "/claims" },
  { label: "Firms", icon: "⊹", path: "/vendors" },
  { label: "Team", icon: "⊡", path: "/contractors" },
  { label: "KPI", icon: "⊟", path: "/kpi" },
];

const DISPATCH_BOTTOM_NAV = [
  { label: "Claims", icon: "◫", path: "/claims" },
  { label: "Team", icon: "⊡", path: "/contractors" },
];

const WRITER_BOTTOM_NAV = [
  { label: "Claims", icon: "◫", path: "/claims" },
];

const APPRAISER_BOTTOM_NAV = [
  { label: "Claims", icon: "◫", path: "/my-claims" },
  { label: "Today", icon: "⊹", path: "/my-routes" },
];

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  dispatch: "Dispatch",
  writer: "Writer",
  appraiser: "Field",
};

export const NavBar: React.FC<NavBarProps> = ({ role, userName }) => {
  const nav = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const tabMap: Record<AppRole, typeof ADMIN_TABS> = {
    admin: ADMIN_TABS,
    dispatch: DISPATCH_TABS,
    writer: WRITER_TABS,
    appraiser: APPRAISER_TABS,
  };
  const bottomMap: Record<AppRole, typeof ADMIN_BOTTOM_NAV> = {
    admin: ADMIN_BOTTOM_NAV,
    dispatch: DISPATCH_BOTTOM_NAV,
    writer: WRITER_BOTTOM_NAV,
    appraiser: APPRAISER_BOTTOM_NAV,
  };
  const tabs = tabMap[role];
  const bottomTabs = bottomMap[role];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav("/login");
  };

  const isActiveTab = (tabPath: string): boolean => {
    const p = location.pathname;
    // Calendar tab matches both /calendar and legacy /admin/claims?view=calendar
    if (tabPath === "/calendar") {
      return p === "/calendar" || (p === "/admin/claims" && location.search.includes("view=calendar"));
    }
    // Claims tab: match /claims or /admin/claims but NOT when calendar view is active
    if (tabPath === "/claims") {
      return (p === "/claims" || p === "/admin/claims") && !location.search.includes("view=");
    }
    // Vendors tab: match /vendors or legacy paths
    if (tabPath === "/vendors") {
      return p === "/vendors" || p === "/admin/vendors-payouts" || p === "/admin/vendors" || p === "/admin/payouts";
    }
    // Contractors tab
    if (tabPath === "/contractors") {
      return p === "/contractors" || p === "/admin/contractors";
    }
    // KPI tab
    if (tabPath === "/kpi") {
      return p === "/kpi" || p === "/admin/kpi";
    }
    return p === tabPath;
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
      </div>
      <div className="nav__center">
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
      <div className="nav__right">
        <div className="nav__user">
          <span className="nav__user-name">
            {userName || ROLE_LABEL[role]}
          </span>
          {ROLE_LABEL[role]}
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
            isActiveTab(item.path) ? "bottom-nav__item--active" : ""
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
