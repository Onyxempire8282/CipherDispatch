import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { NavBar } from "../components/NavBar";
import PageHeader from "../components/ui/PageHeader";
import "./app.css";

type Profile = { user_id: string; role: "admin" | "appraiser"; full_name?: string };

export default function App() {
  const nav = useNavigate();
  const [p, setP] = useState<Profile | null>(null);
  const [clock, setClock] = useState("");
  const [stats, setStats] = useState({ activeClaims: 0, pendingPayouts: 0, activeVendors: 0, needsScheduling: 0 });

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return nav("/login");
      const { data } = await supabase
        .from("profiles")
        .select("user_id, role, full_name")
        .eq("user_id", user.id)
        .single();
      if (!data) return nav("/login");
      setP(data as Profile);

      const [claimsRes, vendorsRes] = await Promise.all([
        supabase.from("claims_v").select("status, payout_status, appointment_start").is("archived_at", null),
        supabase.from("vendors").select("active").eq("active", true),
      ]);

      const claims = claimsRes.data || [];
      setStats({
        activeClaims: claims.filter(c => c.status !== "COMPLETED" && c.status !== "CANCELED").length,
        pendingPayouts: claims.filter(c => c.payout_status === "unpaid" && c.status === "COMPLETED").length,
        activeVendors: vendorsRes.data?.length || 0,
        needsScheduling: claims.filter(c => !c.appointment_start && c.status === "IN_PROGRESS").length,
      });
    })();
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!p) return null;

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <NavBar role={p.role} userName={p.full_name} />

      {p.role === "admin" ? (
        <>
          <PageHeader
            label="Cipher Dispatch"
            title="Command Center"
            sub="Claims operations and dispatch management"
            aside={
              <>
                <div className="page-header__clock">{clock}</div>
                <div className="page-header__date">{dateStr}</div>
              </>
            }
          />

          <div className="dashboard__main">
            <div className="dashboard__stat-strip">
              <div className="dashboard__stat-cell">
                <div className="dashboard__stat-num">{stats.activeClaims}</div>
                <div className="dashboard__stat-label">Active Claims</div>
              </div>
              <div className="dashboard__stat-cell">
                <div className="dashboard__stat-num">{stats.pendingPayouts}</div>
                <div className="dashboard__stat-label">Pending Payouts</div>
              </div>
              <div className="dashboard__stat-cell">
                <div className="dashboard__stat-num">{stats.activeVendors}</div>
                <div className="dashboard__stat-label">Active Vendors</div>
              </div>
              <div className="dashboard__stat-cell">
                <div className="dashboard__stat-num">{stats.needsScheduling}</div>
                <div className="dashboard__stat-label">Needs Scheduling</div>
              </div>
            </div>

            <div className="dashboard__ops-label">Operations</div>

            <div className="dashboard__ops-grid">
              <Link to="/admin/claims" className="dashboard__op-card">
                <div className="dashboard__op-num">01</div>
                <div className="dashboard__op-icon">📋</div>
                <div className="dashboard__op-name">View All Claims</div>
                <div className="dashboard__op-desc">
                  View and manage all active claims in the system. Filter by firm, status, or adjuster.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Claims</div>
                  <div className="dashboard__op-open">Open →</div>
                </div>
              </Link>

              <Link to="/admin/claims/new" className="dashboard__op-card">
                <div className="dashboard__op-num">02</div>
                <div className="dashboard__op-icon">＋</div>
                <div className="dashboard__op-name">Create New Claim</div>
                <div className="dashboard__op-desc">
                  Start a new insurance claim with customer and vehicle details. Assign firm and adjuster.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">New</div>
                  <div className="dashboard__op-open">Open →</div>
                </div>
              </Link>

              <Link to="/admin/claims?archived=true" className="dashboard__op-card">
                <div className="dashboard__op-num">03</div>
                <div className="dashboard__op-icon">🗄</div>
                <div className="dashboard__op-name">Archived Claims</div>
                <div className="dashboard__op-desc">
                  View completed and archived claims for record keeping and billing reconciliation.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Archive</div>
                  <div className="dashboard__op-open">Open →</div>
                </div>
              </Link>
            </div>

            <div className="dashboard__ops-grid dashboard__ops-grid--last">
              <Link to="/admin/vendors" className="dashboard__op-card">
                <div className="dashboard__op-num">04</div>
                <div className="dashboard__op-icon">🏢</div>
                <div className="dashboard__op-name">Manage Vendors</div>
                <div className="dashboard__op-desc">
                  Add and edit vendors that provide payouts. Configure rates and firm assignments.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Vendors</div>
                  <div className="dashboard__op-open">Open →</div>
                </div>
              </Link>

              <Link to="/admin/payouts" className="dashboard__op-card">
                <div className="dashboard__op-num">05</div>
                <div className="dashboard__op-icon">💰</div>
                <div className="dashboard__op-name">Payout Dashboard</div>
                <div className="dashboard__op-desc">
                  View upcoming vendor payouts and revenue projections. Export billing reports.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Payouts</div>
                  <div className="dashboard__op-open">Open →</div>
                </div>
              </Link>

              <Link to="/admin/claims?view=calendar" className="dashboard__op-card">
                <div className="dashboard__op-num">06</div>
                <div className="dashboard__op-icon">📅</div>
                <div className="dashboard__op-name">Scheduling Calendar</div>
                <div className="dashboard__op-desc">
                  Monthly calendar view with firm color coding. Manage appointments and inspection schedules.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Calendar</div>
                  <div className="dashboard__op-open">Open →</div>
                </div>
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          <PageHeader
            label="Cipher Dispatch"
            title="My Dashboard"
            sub="Claims assigned to you"
          />

          <div className="dashboard__main">
            <div className="dashboard__ops-label">Quick Access</div>
            <div className="dashboard__link-grid">
              <Link to="/my-claims" className="dashboard__link-card">
                <div className="dashboard__link-icon">📋</div>
                <div>
                  <div className="dashboard__link-name">My Claims</div>
                  <div className="dashboard__link-desc">
                    View claims assigned to you and manage appraisals
                  </div>
                </div>
              </Link>

              <Link to="/my-claims?view=calendar" className="dashboard__link-card">
                <div className="dashboard__link-icon">📅</div>
                <div>
                  <div className="dashboard__link-name">Calendar View</div>
                  <div className="dashboard__link-desc">
                    View and schedule your claims on a monthly calendar
                  </div>
                </div>
              </Link>

              <Link to="/my-routes" className="dashboard__link-card">
                <div className="dashboard__link-icon">🚗</div>
                <div>
                  <div className="dashboard__link-name">My Routes</div>
                  <div className="dashboard__link-desc">
                    View routes and log mileage for tax records
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
