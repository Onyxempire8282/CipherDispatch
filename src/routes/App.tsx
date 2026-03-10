import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { NavBar } from "../components/NavBar";
import PageHeader from "../components/ui/PageHeader";
import type { AppRole } from "../lib/supabaseAuthz";
import "./app.css";

type Profile = { user_id: string; role: AppRole; full_name?: string };

export default function App() {
  const nav = useNavigate();
  const [p, setP] = useState<Profile | null>(null);
  const [clock, setClock] = useState("");
  const [stats, setStats] = useState({
    unassigned: 0,
    inFieldToday: 0,
    atRisk: 0,
    pendingReview: 0,
    activeClaims: 0,
    pendingPayouts: 0,
  });
  const [slaAlerts, setSlaAlerts] = useState<string[]>([]);

  const loadStats = async () => {
    const { data: claims } = await supabase
      .from("claims_v")
      .select("status, payout_status, appointment_start, assigned_to, created_at, pipeline_stage, completed_at")
      .is("archived_at", null);

    const all = claims || [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const unassigned = all.filter(c => !c.assigned_to && c.status !== "COMPLETED" && c.status !== "CANCELED");
    const inFieldToday = all.filter(c => c.appointment_start && c.appointment_start.slice(0, 10) === todayStr && c.status !== "COMPLETED" && c.status !== "CANCELED");
    const atRisk = unassigned.filter(c => c.created_at && c.created_at < h24ago);
    const pendingReview = all.filter(c => c.pipeline_stage === "photos_complete" || c.pipeline_stage === "estimate_writing");

    setStats({
      unassigned: unassigned.length,
      inFieldToday: inFieldToday.length,
      atRisk: atRisk.length,
      pendingReview: pendingReview.length,
      activeClaims: all.filter(c => c.status !== "COMPLETED" && c.status !== "CANCELED").length,
      pendingPayouts: all.filter(c => c.payout_status === "unpaid" && c.status === "COMPLETED").length,
    });

    // SLA alerts
    const alerts: string[] = [];
    if (atRisk.length > 0) alerts.push(`${atRisk.length} claim${atRisk.length > 1 ? "s" : ""} unassigned > 24h`);
    const estimateStale = all.filter(c => c.pipeline_stage === "photos_complete" && c.completed_at && new Date(c.completed_at).getTime() < now.getTime() - 4 * 60 * 60 * 1000);
    if (estimateStale.length > 0) alerts.push(`${estimateStale.length} estimate${estimateStale.length > 1 ? "s" : ""} pending > 4h`);
    setSlaAlerts(alerts);
  };

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
      await loadStats();
    })();

    // Realtime subscription for live stat updates
    const channel = supabase
      .channel("dashboard-claims")
      .on("postgres_changes", { event: "*", schema: "public", table: "claims" }, () => {
        loadStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

      {(p.role === "admin" || p.role === "dispatch") ? (
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
                <div className={`dashboard__stat-num${stats.unassigned > 0 ? " dashboard__stat-num--warn" : ""}`}>{stats.unassigned}</div>
                <div className="dashboard__stat-label">Unassigned</div>
              </div>
              <div className="dashboard__stat-cell">
                <div className="dashboard__stat-num">{stats.inFieldToday}</div>
                <div className="dashboard__stat-label">In Field Today</div>
              </div>
              <div className="dashboard__stat-cell">
                <div className={`dashboard__stat-num${stats.atRisk > 0 ? " dashboard__stat-num--danger" : ""}`}>{stats.atRisk}</div>
                <div className="dashboard__stat-label">At Risk</div>
              </div>
              <div className="dashboard__stat-cell">
                <div className="dashboard__stat-num">{stats.pendingReview}</div>
                <div className="dashboard__stat-label">Pending Review</div>
              </div>
            </div>

            {slaAlerts.length > 0 && (
              <div className="dashboard__sla-strip">
                {slaAlerts.map((alert, i) => (
                  <div key={i} className="dashboard__sla-alert">{alert}</div>
                ))}
              </div>
            )}

            <div className="dashboard__ops-label">Operations</div>

            <div className="dashboard__ops-grid">
              <Link to="/admin/claims" className="dashboard__op-card">
                <div className="dashboard__op-num">01</div>
                <div className="dashboard__op-icon dashboard__op-icon--mono">CLM</div>
                <div className="dashboard__op-name">View All Claims</div>
                <div className="dashboard__op-desc">
                  View and manage all active claims in the system. Filter by firm, status, or adjuster.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Claims</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>

              <Link to="/admin/claims/new" className="dashboard__op-card dashboard__op-card--cta">
                <div className="dashboard__op-num">02</div>
                <div className="dashboard__op-icon dashboard__op-icon--mono">NEW</div>
                <div className="dashboard__op-name">Create New Claim</div>
                <div className="dashboard__op-desc">
                  Start a new insurance claim with customer and vehicle details. Assign firm and adjuster.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">New</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>

              <Link to="/admin/claims?archived=true" className="dashboard__op-card">
                <div className="dashboard__op-num">03</div>
                <div className="dashboard__op-icon dashboard__op-icon--mono">ARC</div>
                <div className="dashboard__op-name">Archived Claims</div>
                <div className="dashboard__op-desc">
                  View completed and archived claims for record keeping and billing reconciliation.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Archive</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>
            </div>

            {p.role === "admin" && (
            <div className="dashboard__ops-grid">
              <Link to="/admin/vendors-payouts" className="dashboard__op-card">
                <div className="dashboard__op-num">04</div>
                <div className="dashboard__op-icon dashboard__op-icon--mono">FRM</div>
                <div className="dashboard__op-name">Vendors & Payouts</div>
                <div className="dashboard__op-desc">
                  Manage firms, pay schedules, and forecast cash flow from completed and scheduled claims.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Firms</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>

              <Link to="/admin/claims?view=calendar" className="dashboard__op-card">
                <div className="dashboard__op-num">05</div>
                <div className="dashboard__op-icon dashboard__op-icon--mono">CAL</div>
                <div className="dashboard__op-name">Scheduling Calendar</div>
                <div className="dashboard__op-desc">
                  Monthly calendar view with firm color coding. Manage appointments and inspection schedules.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Calendar</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>
            </div>
            )}

            <div className="dashboard__ops-grid dashboard__ops-grid--last">
              <Link to="/admin/contractors" className="dashboard__op-card">
                <div className="dashboard__op-num">{p.role === "admin" ? "06" : "04"}</div>
                <div className="dashboard__op-icon dashboard__op-icon--mono">TEM</div>
                <div className="dashboard__op-name">Contractor Management</div>
                <div className="dashboard__op-desc">
                  Manage field appraisers and writers. Track performance, availability, and coverage areas.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Team</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>

              {p.role === "admin" && (
              <Link to="/admin/kpi" className="dashboard__op-card">
                <div className="dashboard__op-num">07</div>
                <div className="dashboard__op-icon dashboard__op-icon--mono">KPI</div>
                <div className="dashboard__op-name">KPI Dashboard</div>
                <div className="dashboard__op-desc">
                  Revenue analytics, claim volume trends, inspector performance, and SLA monitoring.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Analytics</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>
              )}
            </div>
          </div>
        </>
      ) : p.role === "writer" ? (
        <>
          <PageHeader
            label="Cipher Dispatch"
            title="Writer Dashboard"
            sub="Estimate writing queue"
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
            </div>

            <div className="dashboard__ops-label">Operations</div>

            <div className="dashboard__ops-grid">
              <Link to="/admin/claims" className="dashboard__op-card">
                <div className="dashboard__op-num">01</div>
                <div className="dashboard__op-icon dashboard__op-icon--mono">CLM</div>
                <div className="dashboard__op-name">All Claims</div>
                <div className="dashboard__op-desc">
                  View all claims and their current status. Access estimates and photos.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Claims</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>

              <Link to="/admin/claims?view=calendar" className="dashboard__op-card">
                <div className="dashboard__op-num">02</div>
                <div className="dashboard__op-icon dashboard__op-icon--mono">CAL</div>
                <div className="dashboard__op-name">Calendar</div>
                <div className="dashboard__op-desc">
                  View scheduling calendar with appointment dates and deadlines.
                </div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Calendar</div>
                  <div className="dashboard__op-open">Open</div>
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
                <div className="dashboard__link-icon dashboard__link-icon--mono">CLM</div>
                <div>
                  <div className="dashboard__link-name">My Claims</div>
                  <div className="dashboard__link-desc">
                    View claims assigned to you and manage appraisals
                  </div>
                </div>
              </Link>

              <Link to="/my-claims?view=calendar" className="dashboard__link-card">
                <div className="dashboard__link-icon dashboard__link-icon--mono">CAL</div>
                <div>
                  <div className="dashboard__link-name">Calendar View</div>
                  <div className="dashboard__link-desc">
                    View and schedule your claims on a monthly calendar
                  </div>
                </div>
              </Link>

              <Link to="/my-routes" className="dashboard__link-card">
                <div className="dashboard__link-icon dashboard__link-icon--mono">RTE</div>
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
