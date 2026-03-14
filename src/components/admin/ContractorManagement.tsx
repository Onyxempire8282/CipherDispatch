import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { supabaseCD } from "../../lib/supabaseCD";
import { useNavigate } from "react-router-dom";
import { NavBar } from "../NavBar";
import { useRole } from "../../hooks/useRole";
import "./contractor-management.css";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function ContractorManagement() {
  const [contractors, setContractors] = useState<any[]>([]);
  const [claims, setClaims]           = useState<any[]>([]);
  const [allClaims, setAllClaims]     = useState<any[]>([]);
  const [showInvite, setShowInvite]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [selected, setSelected]       = useState<any | null>(null);
  const nav = useNavigate();
  const { role } = useRole();

  // Invite form state
  const [form, setForm] = useState({
    email: "", full_name: "", first_name: "", last_name: "",
    phone: "", role: "appraiser", pay_rate: "",
    coverage_states: [] as string[], coverage_cities: "",
    license_number: "", notes: "",
  });

  const load = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);

    const [cRes, clRes, allRes] = await Promise.all([
      supabaseCD.from("profiles")
        .select("*")
        .in("role", ["appraiser", "writer"])
        .order("full_name"),
      supabaseCD.from("claims_v")
        .select("id, assigned_to, status, claim_number, customer_name, firm, appointment_start")
        .is("archived_at", null)
        .not("status", "in", '("COMPLETED","CANCELED")'),
      supabaseCD.from("claims_v")
        .select("id, assigned_to, status, created_at, completion_date")
        .is("archived_at", null)
        .gte("created_at", thirtyDaysAgo.toISOString()),
    ]);
    setContractors(cRes.data || []);
    setClaims(clRes.data || []);
    setAllClaims(allRes.data || []);
  };

  const getPerformance = (uid: string) => {
    const userClaims = allClaims.filter(c => c.assigned_to === uid);
    const completed = userClaims.filter(c => c.status === "COMPLETED");
    const total = userClaims.length;
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    // Average turnaround in days
    let avgTurnaround = 0;
    const turnarounds = completed
      .filter(c => c.completion_date && c.created_at)
      .map(c => {
        const created = new Date(c.created_at).getTime();
        const done = new Date(c.completion_date).getTime();
        return (done - created) / (1000 * 60 * 60 * 24);
      })
      .filter(d => d >= 0);
    if (turnarounds.length > 0) {
      avgTurnaround = Math.round(turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length * 10) / 10;
    }

    return { completed: completed.length, total, completionRate, avgTurnaround };
  };

  useEffect(() => { load(); }, []);

  const invite = async () => {
    setSaving(true);
    try {
      const { error } = await supabaseCD.functions.invoke("invite-contractor", {
        body: {
          ...form,
          pay_rate: form.pay_rate ? parseFloat(form.pay_rate) : null,
          coverage_cities: form.coverage_cities
            .split(",").map(s => s.trim()).filter(Boolean),
        }
      });
      if (error) throw error;
      alert(`Invite sent to ${form.email}`);
      setShowInvite(false);
      setForm({ email:"", full_name:"", first_name:"", last_name:"", phone:"", role:"appraiser", pay_rate:"", coverage_states:[], coverage_cities:"", license_number:"", notes:"" });
      await load();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
    setSaving(false);
  };

  const toggleAvailable = async (c: any) => {
    await supabaseCD.from("profiles")
      .update({ available: !c.available })
      .eq("user_id", c.user_id);
    await load();
  };

  const toggleState = (s: string) => {
    setForm(f => ({
      ...f,
      coverage_states: f.coverage_states.includes(s)
        ? f.coverage_states.filter(x => x !== s)
        : [...f.coverage_states, s]
    }));
  };

  const getOpenClaims = (uid: string) =>
    claims.filter(c => c.assigned_to === uid);

  return (
    <div className="ctm">
      <NavBar role={role || "admin"} />
      {/* Header */}
      <div className="ctm__header">
        <div>
          <div className="ctm__header-label">FIELD OPERATIONS</div>
          <h1 className="ctm__header-title">CONTRACTOR MANAGEMENT</h1>
        </div>
        <button className="ctm__invite-btn" onClick={() => setShowInvite(true)}>
          + INVITE CONTRACTOR
        </button>
      </div>

      {/* Summary strip */}
      <div className="ctm__strip">
        <div className="ctm__strip-stat">
          <span className="ctm__strip-num">{contractors.filter(c => c.available).length}</span>
          <span className="ctm__strip-label">AVAILABLE</span>
        </div>
        <div className="ctm__strip-stat">
          <span className="ctm__strip-num ctm__strip-num--dim">{contractors.filter(c => !c.available).length}</span>
          <span className="ctm__strip-label">UNAVAILABLE</span>
        </div>
        <div className="ctm__strip-stat">
          <span className="ctm__strip-num ctm__strip-num--amber">{claims.length}</span>
          <span className="ctm__strip-label">OPEN CLAIMS</span>
        </div>
        <div className="ctm__strip-stat">
          <span className="ctm__strip-num">{contractors.filter(c => c.onboard_status === "pending").length}</span>
          <span className="ctm__strip-label">PENDING ONBOARD</span>
        </div>
      </div>

      {/* Contractor cards */}
      <div className="ctm__grid">
        {contractors.map(c => {
          const open = getOpenClaims(c.user_id);
          const perf = getPerformance(c.user_id);
          return (
            <div
              key={c.user_id}
              className={`ctm__card ${!c.available ? "ctm__card--offline" : ""}`}
              onClick={() => nav(`/admin/contractors/${c.user_id}`)}
            >
              <div className="ctm__card-top">
                <div className="ctm__avatar">{(c.full_name || "?")[0]}</div>
                <div className="ctm__card-info">
                  <div className="ctm__card-name">{c.full_name || "—"}</div>
                  <div className="ctm__card-role">{c.role?.toUpperCase()}</div>
                  {c.email && <div className="ctm__card-email">{c.email}</div>}
                </div>
                <div className="ctm__card-right">
                  <button
                    className={`ctm__avail-btn ${c.available ? "ctm__avail-btn--on" : "ctm__avail-btn--off"}`}
                    onClick={e => { e.stopPropagation(); toggleAvailable(c); }}
                  >
                    {c.available ? "● AVAILABLE" : "○ OFFLINE"}
                  </button>
                </div>
              </div>

              <div className="ctm__card-stats">
                <div className="ctm__stat">
                  <div className="ctm__stat-num ctm__stat-num--amber">{open.length}</div>
                  <div className="ctm__stat-label">OPEN</div>
                </div>
                <div className="ctm__stat">
                  <div className="ctm__stat-num ctm__stat-num--green">{perf.completed}</div>
                  <div className="ctm__stat-label">DONE (90D)</div>
                </div>
                <div className="ctm__stat">
                  <div className="ctm__stat-num">{perf.completionRate}%</div>
                  <div className="ctm__stat-label">COMP RATE</div>
                </div>
                <div className="ctm__stat">
                  <div className="ctm__stat-num">{perf.avgTurnaround || "—"}</div>
                  <div className="ctm__stat-label">AVG DAYS</div>
                </div>
              </div>

              <div className="ctm__card-stats">
                <div className="ctm__stat">
                  <div className="ctm__stat-num">{c.pay_rate ? `$${c.pay_rate}` : "—"}</div>
                  <div className="ctm__stat-label">PER CLAIM</div>
                </div>
                <div className="ctm__stat">
                  <div className="ctm__stat-num">{c.rating ? c.rating.toFixed(1) : "—"}</div>
                  <div className="ctm__stat-label">RATING</div>
                </div>
                <div className="ctm__stat">
                  <div className="ctm__stat-num">{perf.total}</div>
                  <div className="ctm__stat-label">TOTAL (90D)</div>
                </div>
                <div className="ctm__stat">
                  <div className={`ctm__stat-num ctm__stat-badge ${
                    c.onboard_status === "active" ? "ctm__stat-badge--active" :
                    c.onboard_status === "pending" ? "ctm__stat-badge--pending" : "ctm__stat-badge--off"
                  }`}>{c.onboard_status?.toUpperCase() || "—"}</div>
                  <div className="ctm__stat-label">STATUS</div>
                </div>
              </div>

              {/* Open claims mini list */}
              {open.length > 0 && (
                <div className="ctm__open-claims">
                  {open.slice(0, 3).map(cl => (
                    <div key={cl.id} className="ctm__open-claim">
                      <span className="ctm__open-claim-num">#{cl.claim_number}</span>
                      <span className="ctm__open-claim-name">{cl.customer_name}</span>
                      <span className="ctm__open-claim-firm">{cl.firm}</span>
                    </div>
                  ))}
                  {open.length > 3 && (
                    <div className="ctm__open-more">+{open.length - 3} more</div>
                  )}
                </div>
              )}

              {/* Coverage */}
              {c.coverage_states?.length > 0 && (
                <div className="ctm__coverage">
                  {c.coverage_states.map((s: string) => (
                    <span key={s} className="ctm__coverage-tag">{s}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {contractors.length === 0 && (
          <div className="ctm__empty">
            No contractors yet. Click INVITE CONTRACTOR to add your first field appraiser.
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="ctm__overlay" onClick={() => setShowInvite(false)}>
          <div className="ctm__modal" onClick={e => e.stopPropagation()}>
            <div className="ctm__modal-hd">
              <div className="ctm__modal-title">INVITE CONTRACTOR</div>
              <button className="ctm__modal-close" onClick={() => setShowInvite(false)}>×</button>
            </div>
            <div className="ctm__modal-body">
              <div className="ctm__form-row">
                <div className="ctm__field">
                  <label className="ctm__label">EMAIL *</label>
                  <input className="ctm__input" type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="ctm__field">
                  <label className="ctm__label">ROLE</label>
                  <select className="ctm__select" value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="appraiser">Appraiser (Field)</option>
                    <option value="writer">Writer (Estimate)</option>
                  </select>
                </div>
              </div>
              <div className="ctm__form-row">
                <div className="ctm__field">
                  <label className="ctm__label">FIRST NAME</label>
                  <input className="ctm__input" value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value, full_name: `${e.target.value} ${f.last_name}`.trim() }))} />
                </div>
                <div className="ctm__field">
                  <label className="ctm__label">LAST NAME</label>
                  <input className="ctm__input" value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value, full_name: `${f.first_name} ${e.target.value}`.trim() }))} />
                </div>
              </div>
              <div className="ctm__form-row">
                <div className="ctm__field">
                  <label className="ctm__label">PHONE</label>
                  <input className="ctm__input" type="tel" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="ctm__field">
                  <label className="ctm__label">PAY RATE ($/CLAIM)</label>
                  <input className="ctm__input" type="number" value={form.pay_rate}
                    onChange={e => setForm(f => ({ ...f, pay_rate: e.target.value }))} />
                </div>
              </div>
              <div className="ctm__field">
                <label className="ctm__label">LICENSE NUMBER</label>
                <input className="ctm__input" value={form.license_number}
                  onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} />
              </div>
              <div className="ctm__field">
                <label className="ctm__label">COVERAGE CITIES (comma separated)</label>
                <input className="ctm__input" placeholder="Dallas, Houston, Austin"
                  value={form.coverage_cities}
                  onChange={e => setForm(f => ({ ...f, coverage_cities: e.target.value }))} />
              </div>
              <div className="ctm__field">
                <label className="ctm__label">COVERAGE STATES</label>
                <div className="ctm__state-grid">
                  {US_STATES.map(s => (
                    <button
                      key={s}
                      className={`ctm__state-btn ${form.coverage_states.includes(s) ? "ctm__state-btn--sel" : ""}`}
                      onClick={() => toggleState(s)}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div className="ctm__field">
                <label className="ctm__label">NOTES</label>
                <textarea className="ctm__textarea" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Equipment, vehicle, experience notes..." />
              </div>
            </div>
            <div className="ctm__modal-ft">
              <button className="ctm__btn-cancel" onClick={() => setShowInvite(false)}>CANCEL</button>
              <button
                className="ctm__btn-invite"
                disabled={!form.email || saving}
                onClick={invite}
              >
                {saving ? "SENDING..." : "SEND INVITE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
