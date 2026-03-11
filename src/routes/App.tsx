import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { NavBar } from "../components/NavBar";
import PageHeader from "../components/ui/PageHeader";
import AppraiserDashboard from "./appraiser/Dashboard";
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
    needsScheduling: 0,
  });

  const loadStats = async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const baseQuery = () =>
      supabase
        .from("claims_v")
        .select("id", { count: "exact", head: true })
        .is("archived_at", null)
        .not("status", "in", '("COMPLETED","CANCELED")');

    const [unassigned, inField, atRisk, needsSched] = await Promise.all([
      baseQuery().is("assigned_to", null),
      baseQuery()
        .gte("appointment_start", todayStart)
        .lt("appointment_start", todayEnd),
      baseQuery()
        .is("assigned_to", null)
        .lt("created_at", h24ago),
      baseQuery()
        .or("assigned_to.is.null,appointment_start.is.null"),
    ]);

    setStats({
      unassigned: unassigned.count ?? 0,
      inFieldToday: inField.count ?? 0,
      atRisk: atRisk.count ?? 0,
      needsScheduling: needsSched.count ?? 0,
    });
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
              <div className={`dashboard__stat-cell${stats.atRisk > 0 ? " dashboard__stat-cell--danger" : ""}`}>
                <div className={`dashboard__stat-num${stats.atRisk > 0 ? " dashboard__stat-num--danger" : ""}`}>{stats.atRisk}</div>
                <div className="dashboard__stat-label">At Risk</div>
              </div>
              <div className="dashboard__stat-cell">
                <div className="dashboard__stat-num">{stats.needsScheduling}</div>
                <div className="dashboard__stat-label">Needs Scheduling</div>
              </div>
            </div>

            <div className="dashboard__ops-label">Operations</div>

            <div className="dashboard__ops-grid">
              <Link to="/claims" className="dashboard__op-card">
                <div className="dashboard__op-icon dashboard__op-icon--mono">UC</div>
                <div className="dashboard__op-name">Unassigned Claims</div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat"><span>{stats.unassigned}</span> claims</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>

              <Link to="/calendar" className="dashboard__op-card">
                <div className="dashboard__op-icon dashboard__op-icon--mono">TS</div>
                <div className="dashboard__op-name">Today's Schedule</div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat"><span>{stats.inFieldToday}</span> in field</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>

              <Link to="/claims" className="dashboard__op-card">
                <div className="dashboard__op-icon dashboard__op-icon--mono">AR</div>
                <div className="dashboard__op-name">At Risk</div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat"><span>{stats.atRisk}</span> claims</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>
            </div>

            <div className="dashboard__ops-grid">
              <Link to="/admin/claims/new" className="dashboard__op-card dashboard__op-card--cta">
                <div className="dashboard__op-icon dashboard__op-icon--mono">NC</div>
                <div className="dashboard__op-name">Create New Claim</div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">New</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>

              {p.role === "admin" && (
                <Link to="/vendors" className="dashboard__op-card">
                  <div className="dashboard__op-icon dashboard__op-icon--mono">VP</div>
                  <div className="dashboard__op-name">Vendors & Payouts</div>
                  <div className="dashboard__op-footer">
                    <div className="dashboard__op-stat">Firms</div>
                    <div className="dashboard__op-open">Open</div>
                  </div>
                </Link>
              )}

              <Link to="/contractors" className="dashboard__op-card">
                <div className="dashboard__op-icon dashboard__op-icon--mono">CM</div>
                <div className="dashboard__op-name">Contractor Management</div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Team</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>
            </div>

            {p.role === "admin" && (
              <div className="dashboard__ops-grid dashboard__ops-grid--full dashboard__ops-grid--last">
                <Link to="/kpi" className="dashboard__op-card">
                  <div className="dashboard__op-icon dashboard__op-icon--mono">KP</div>
                  <div className="dashboard__op-name">KPI Dashboard</div>
                  <div className="dashboard__op-footer">
                    <div className="dashboard__op-stat">Analytics</div>
                    <div className="dashboard__op-open">Open</div>
                  </div>
                </Link>
              </div>
            )}
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
            <div className="dashboard__ops-label">Operations</div>

            <div className="dashboard__ops-grid">
              <Link to="/claims" className="dashboard__op-card">
                <div className="dashboard__op-icon dashboard__op-icon--mono">CL</div>
                <div className="dashboard__op-name">All Claims</div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Claims</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>

              <Link to="/calendar" className="dashboard__op-card">
                <div className="dashboard__op-icon dashboard__op-icon--mono">CA</div>
                <div className="dashboard__op-name">Calendar</div>
                <div className="dashboard__op-footer">
                  <div className="dashboard__op-stat">Calendar</div>
                  <div className="dashboard__op-open">Open</div>
                </div>
              </Link>
            </div>
          </div>
        </>
      ) : (
        <AppraiserDashboard />
      )}
    </div>
  );
}
