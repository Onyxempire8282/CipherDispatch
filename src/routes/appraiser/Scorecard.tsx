import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { supabaseCD } from "../../lib/supabaseCD";
import { NavBar } from "../../components/NavBar";
import { useRole } from "../../hooks/useRole";
import PageHeader from "../../components/ui/PageHeader";
import "../../routes/admin/contractor-detail.css";

export default function Scorecard() {
  const { role, userId, fullName } = useRole();
  const [openClaims, setOpenClaims] = useState<any[]>([]);
  const [allClaims, setAllClaims] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const [profileRes, openRes, allRes] = await Promise.all([
        supabaseCD.from("profiles").select("*").eq("user_id", userId).single(),
        supabaseCD.from("claims_v")
          .select("id, claim_number, customer_name, firm, status, appointment_start, city, state")
          .eq("assigned_to", userId)
          .is("archived_at", null)
          .not("status", "in", '("COMPLETED","CANCELED")'),
        supabaseCD.from("claims_v")
          .select("id, claim_number, customer_name, firm, status, created_at, completion_date, pay_amount")
          .eq("assigned_to", userId)
          .is("archived_at", null)
          .gte("created_at", ninetyDaysAgo.toISOString()),
      ]);

      setProfile(profileRes.data);
      setOpenClaims(openRes.data || []);
      setAllClaims(allRes.data || []);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="cd__loading">Loading...</div>;

  const completed = allClaims.filter(c => c.status === "COMPLETED");
  const total = allClaims.length;
  const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  const turnarounds = completed
    .filter(c => c.completion_date && c.created_at)
    .map(c => {
      const created = new Date(c.created_at).getTime();
      const done = new Date(c.completion_date).getTime();
      return (done - created) / (1000 * 60 * 60 * 24);
    })
    .filter(d => d >= 0);
  const avgTurnaround = turnarounds.length > 0
    ? Math.round(turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length * 10) / 10
    : 0;

  const totalEarnings = completed.reduce((sum, c) => sum + (c.pay_amount || 0), 0);

  return (
    <div>
      <NavBar role={role || "appraiser"} userName={fullName || undefined} />
      <PageHeader
        label="My Performance"
        title="Scorecard"
        sub="90-day performance overview"
        compact
      />

      <div className="cd__wrap">
        {/* Scorecard */}
        <div className="cd__section cd__section--accent">
          <div className="cd__section-header">
            <div className="cd__section-title">90-Day Performance</div>
            <div className="cd__section-line" />
          </div>
          <div className="cd__section-body">
            <div className="cd__score-grid">
              <div className="cd__score-cell">
                <div className="cd__score-num cd__score-num--amber">{openClaims.length}</div>
                <div className="cd__score-label">Open Claims</div>
              </div>
              <div className="cd__score-cell">
                <div className="cd__score-num cd__score-num--green">{completed.length}</div>
                <div className="cd__score-label">Completed</div>
              </div>
              <div className="cd__score-cell">
                <div className="cd__score-num">{completionRate}%</div>
                <div className="cd__score-label">Completion Rate</div>
              </div>
              <div className="cd__score-cell">
                <div className="cd__score-num">{avgTurnaround || "---"}</div>
                <div className="cd__score-label">Avg Days</div>
              </div>
              <div className="cd__score-cell">
                <div className="cd__score-num">{total}</div>
                <div className="cd__score-label">Total Claims</div>
              </div>
              <div className="cd__score-cell">
                <div className="cd__score-num cd__score-num--amber">${totalEarnings.toFixed(0)}</div>
                <div className="cd__score-label">Earnings (90D)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Open Claims */}
        <div className="cd__section">
          <div className="cd__section-header">
            <div className="cd__section-title">My Open Claims ({openClaims.length})</div>
            <div className="cd__section-line" />
          </div>
          <div className="cd__section-body">
            {openClaims.length === 0 ? (
              <div className="cd__empty">No open claims assigned</div>
            ) : (
              <div className="cd__claims-list">
                {openClaims.map(c => (
                  <Link key={c.id} to={`/claim/${c.id}`} className="cd__claim-row">
                    <span className="cd__claim-num">#{c.claim_number}</span>
                    <span className="cd__claim-name">{c.customer_name}</span>
                    <span className="cd__claim-firm">{c.firm || "---"}</span>
                    <span className="cd__claim-status">{c.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Completed */}
        <div className="cd__section">
          <div className="cd__section-header">
            <div className="cd__section-title">Recently Completed ({completed.length})</div>
            <div className="cd__section-line" />
          </div>
          <div className="cd__section-body">
            {completed.length === 0 ? (
              <div className="cd__empty">No completed claims in last 90 days</div>
            ) : (
              <div className="cd__claims-list">
                {completed.slice(0, 10).map(c => (
                  <Link key={c.id} to={`/claim/${c.id}`} className="cd__claim-row">
                    <span className="cd__claim-num">#{c.claim_number}</span>
                    <span className="cd__claim-name">{c.customer_name}</span>
                    <span className="cd__claim-firm">{c.firm || "---"}</span>
                    <span className="cd__claim-pay">{c.pay_amount ? `$${c.pay_amount.toFixed(2)}` : "---"}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
