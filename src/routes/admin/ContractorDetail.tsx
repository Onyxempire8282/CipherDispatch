import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { supabaseCD } from "../../lib/supabaseCD";
import { NavBar } from "../../components/NavBar";
import { useRole } from "../../hooks/useRole";
import PageHeader from "../../components/ui/PageHeader";
import "./contractor-detail.css";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function ContractorDetail() {
  const { id } = useParams();
  const { role } = useRole();
  const [contractor, setContractor] = useState<any>(null);
  const [openClaims, setOpenClaims] = useState<any[]>([]);
  const [allClaims, setAllClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "", last_name: "", phone: "", role: "appraiser",
    pay_rate: "", rating: "", license_number: "",
    coverage_states: [] as string[], coverage_cities: "",
    notes: "", onboard_status: "pending",
  });

  const loadContractor = async () => {
    if (!id) return;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [profileRes, openRes, allRes] = await Promise.all([
      supabaseCD.from("profiles").select("*").eq("user_id", id).single(),
      supabaseCD.from('claims')
        .select("id, claim_number, customer_name, firm, status, appointment_start, city, state")
        .eq("assigned_to", id)
        .is("archived_at", null)
        .not("status", "in", '("COMPLETED","CANCELED")'),
      supabaseCD.from('claims')
        .select("id, claim_number, customer_name, firm, status, created_at, completion_date, pay_amount")
        .eq("assigned_to", id)
        .is("archived_at", null)
        .gte("created_at", ninetyDaysAgo.toISOString()),
    ]);

    setContractor(profileRes.data);
    setOpenClaims(openRes.data || []);
    setAllClaims(allRes.data || []);
    setLoading(false);
  };

  const openEditModal = () => {
    if (!contractor) return;
    setEditForm({
      first_name: contractor.first_name || "",
      last_name: contractor.last_name || "",
      phone: contractor.phone || "",
      role: contractor.role || "appraiser",
      pay_rate: contractor.pay_rate?.toString() || "",
      rating: contractor.rating?.toString() || "",
      license_number: contractor.license_number || "",
      coverage_states: contractor.coverage_states || [],
      coverage_cities: (contractor.coverage_cities || []).join(", "),
      notes: contractor.notes || "",
      onboard_status: contractor.onboard_status || "pending",
    });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const fullName = `${editForm.first_name} ${editForm.last_name}`.trim();
      const { error } = await supabaseCD.from("profiles").update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        full_name: fullName,
        phone: editForm.phone,
        role: editForm.role,
        pay_rate: editForm.pay_rate ? parseFloat(editForm.pay_rate) : null,
        rating: editForm.rating ? parseFloat(editForm.rating) : null,
        license_number: editForm.license_number,
        coverage_states: editForm.coverage_states,
        coverage_cities: editForm.coverage_cities.split(",").map(s => s.trim()).filter(Boolean),
        notes: editForm.notes,
        onboard_status: editForm.onboard_status,
      }).eq("user_id", id);
      if (error) throw error;
      setShowEdit(false);
      await loadContractor();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
    setSaving(false);
  };

  const toggleEditState = (s: string) => {
    setEditForm(f => ({
      ...f,
      coverage_states: f.coverage_states.includes(s)
        ? f.coverage_states.filter(x => x !== s)
        : [...f.coverage_states, s]
    }));
  };

  const toggleAvailable = async () => {
    if (!id || !contractor) return;
    await supabaseCD.from("profiles")
      .update({ available: !contractor.available })
      .eq("user_id", id);
    await loadContractor();
  };

  useEffect(() => { loadContractor(); }, [id]);

  if (loading) return <div className="cd__loading">Loading...</div>;
  if (!contractor) return <div className="cd__loading">Contractor not found</div>;

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

  const totalRevenue = completed.reduce((sum, c) => sum + (c.pay_amount || 0), 0);

  return (
    <div>
      <NavBar role={role || "admin"} />
      <PageHeader
        label="Contractor Profile"
        title={contractor.full_name || "Unknown"}
        sub={`${contractor.role?.toUpperCase()} - ${contractor.email || "No email"}`}
        compact
      />

      <div className="cd__wrap">
        <Link to="/admin/contractors" className="btn btn--ghost btn--sm cd__back">Back to Contractors</Link>

        {/* Info Card */}
        <div className="cd__section">
          <div className="cd__section-header">
            <div className="cd__section-title">Profile</div>
            <div className="cd__section-line" />
            <button className="cd__edit-btn" onClick={openEditModal}>EDIT PROFILE</button>
          </div>
          <div className="cd__section-body">
            <div className="cd__info-grid">
              <div className="cd__info-item">
                <div className="cd__info-label">Role</div>
                <div className="cd__info-value">{contractor.role?.toUpperCase()}</div>
              </div>
              <div className="cd__info-item">
                <div className="cd__info-label">Email</div>
                <div className="cd__info-value">{contractor.email || "---"}</div>
              </div>
              <div className="cd__info-item">
                <div className="cd__info-label">Phone</div>
                <div className="cd__info-value">{contractor.phone || "---"}</div>
              </div>
              <div className="cd__info-item">
                <div className="cd__info-label">Pay Rate</div>
                <div className="cd__info-value">{contractor.pay_rate ? `$${contractor.pay_rate}` : "---"}</div>
              </div>
              <div className="cd__info-item">
                <div className="cd__info-label">Rating</div>
                <div className="cd__info-value">{contractor.rating ? contractor.rating.toFixed(1) : "---"}</div>
              </div>
              <div className="cd__info-item">
                <div className="cd__info-label">License</div>
                <div className="cd__info-value">{contractor.license_number || "---"}</div>
              </div>
              <div className="cd__info-item">
                <div className="cd__info-label">Status</div>
                <div className="cd__info-value">
                  <button
                    className={`cd__avail-toggle ${contractor.available ? "cd__avail-toggle--on" : "cd__avail-toggle--off"}`}
                    onClick={toggleAvailable}
                  >
                    {contractor.available ? "● AVAILABLE" : "○ OFFLINE"}
                  </button>
                </div>
              </div>
              <div className="cd__info-item">
                <div className="cd__info-label">Onboard</div>
                <div className={`cd__info-value cd__onboard-badge cd__onboard-badge--${contractor.onboard_status || "off"}`}>
                  {contractor.onboard_status?.toUpperCase() || "---"}
                </div>
              </div>
            </div>
            {contractor.coverage_states?.length > 0 && (
              <div className="cd__coverage">
                <div className="cd__info-label">Coverage</div>
                <div className="cd__coverage-tags">
                  {contractor.coverage_states.map((s: string) => (
                    <span key={s} className="cd__coverage-tag">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Performance Scorecard */}
        <div className="cd__section cd__section--accent">
          <div className="cd__section-header">
            <div className="cd__section-title">90-Day Scorecard</div>
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
                <div className="cd__score-num cd__score-num--amber">${totalRevenue.toFixed(0)}</div>
                <div className="cd__score-label">Revenue (90D)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Open Claims */}
        <div className="cd__section">
          <div className="cd__section-header">
            <div className="cd__section-title">Open Claims ({openClaims.length})</div>
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
                    <span className="cd__claim-loc">{c.city}{c.state ? `, ${c.state}` : ""}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Completed */}
        <div className="cd__section">
          <div className="cd__section-header">
            <div className="cd__section-title">Recent Completed ({completed.length})</div>
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
        {/* Notes */}
        {contractor.notes && (
          <div className="cd__section">
            <div className="cd__section-header">
              <div className="cd__section-title">Notes</div>
              <div className="cd__section-line" />
            </div>
            <div className="cd__section-body">
              <div className="cd__notes">{contractor.notes}</div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="cd__overlay" onClick={() => setShowEdit(false)}>
          <div className="cd__modal" onClick={e => e.stopPropagation()}>
            <div className="cd__modal-hd">
              <div className="cd__modal-eyebrow">CONTRACTOR</div>
              <div className="cd__modal-title">EDIT PROFILE</div>
              <button className="cd__modal-close" onClick={() => setShowEdit(false)}>×</button>
            </div>
            <div className="cd__modal-body">
              <div className="cd__form-row">
                <div className="cd__field">
                  <label className="cd__field-label">FIRST NAME</label>
                  <input className="cd__field-input" value={editForm.first_name}
                    onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
                </div>
                <div className="cd__field">
                  <label className="cd__field-label">LAST NAME</label>
                  <input className="cd__field-input" value={editForm.last_name}
                    onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
                </div>
              </div>
              <div className="cd__form-row">
                <div className="cd__field">
                  <label className="cd__field-label">PHONE</label>
                  <input className="cd__field-input" type="tel" value={editForm.phone}
                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="cd__field">
                  <label className="cd__field-label">ROLE</label>
                  <select className="cd__field-input cd__field-select" value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="appraiser">Appraiser (Field)</option>
                    <option value="writer">Writer (Estimate)</option>
                    <option value="dispatch">Dispatch</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="cd__form-row">
                <div className="cd__field">
                  <label className="cd__field-label">PAY RATE ($/CLAIM)</label>
                  <input className="cd__field-input" type="number" value={editForm.pay_rate}
                    onChange={e => setEditForm(f => ({ ...f, pay_rate: e.target.value }))} />
                </div>
                <div className="cd__field">
                  <label className="cd__field-label">RATING (1.0 — 5.0)</label>
                  <input className="cd__field-input" type="number" min="1" max="5" step="0.1"
                    value={editForm.rating}
                    onChange={e => setEditForm(f => ({ ...f, rating: e.target.value }))} />
                </div>
              </div>
              <div className="cd__form-row">
                <div className="cd__field">
                  <label className="cd__field-label">LICENSE NUMBER</label>
                  <input className="cd__field-input" value={editForm.license_number}
                    onChange={e => setEditForm(f => ({ ...f, license_number: e.target.value }))} />
                </div>
                <div className="cd__field">
                  <label className="cd__field-label">ONBOARD STATUS</label>
                  <select className="cd__field-input cd__field-select" value={editForm.onboard_status}
                    onChange={e => setEditForm(f => ({ ...f, onboard_status: e.target.value }))}>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              </div>
              <div className="cd__field">
                <label className="cd__field-label">COVERAGE CITIES (comma separated)</label>
                <input className="cd__field-input" placeholder="Dallas, Houston, Austin"
                  value={editForm.coverage_cities}
                  onChange={e => setEditForm(f => ({ ...f, coverage_cities: e.target.value }))} />
              </div>
              <div className="cd__field">
                <label className="cd__field-label">COVERAGE STATES</label>
                <div className="cd__state-grid">
                  {US_STATES.map(s => (
                    <button key={s} type="button"
                      className={`cd__state-btn ${editForm.coverage_states.includes(s) ? "cd__state-btn--sel" : ""}`}
                      onClick={() => toggleEditState(s)}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div className="cd__field">
                <label className="cd__field-label">NOTES</label>
                <textarea className="cd__field-input cd__field-textarea" value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Equipment, vehicle, experience notes..." />
              </div>
            </div>
            <div className="cd__modal-ft">
              <button className="cd__btn-cancel" onClick={() => setShowEdit(false)}>CANCEL</button>
              <button className="cd__btn-save" disabled={saving} onClick={saveEdit}>
                {saving ? "SAVING..." : "SAVE CHANGES"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
