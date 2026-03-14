import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { supabaseCD } from "../../lib/supabaseCD";
import { NavBar } from "../../components/NavBar";
import { useRole } from "../../hooks/useRole";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import "./vendor-profile.css";

type Vendor = {
  id: string;
  name: string;
  color: string;
  pay_cycle_type?: string;
  reference_pay_date?: string;
  pay_amount?: number | null;
  fee_auto?: number | null;
  fee_heavy_duty?: number | null;
  fee_photos_scope?: number | null;
  default_insurance_company?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  active?: boolean;
  created_at?: string;
};

type HistoryClaim = {
  id: string;
  claim_number: string;
  customer_name: string;
  status: string;
  claim_type?: string;
  file_total?: number | null;
  pay_amount?: number | null;
  created_at?: string;
  completed_at?: string;
};

type SortCol = "claim_number" | "customer_name" | "status" | "created_at" | "file_total";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

export default function VendorProfile() {
  const { id } = useParams<{ id: string }>();
  const { role } = useRole();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fee form
  const [feeAuto, setFeeAuto] = useState("");
  const [feeHeavy, setFeeHeavy] = useState("");
  const [feePhotos, setFeePhotos] = useState("");
  const [defaultInsurance, setDefaultInsurance] = useState("");

  // Stats
  const [totalClaims, setTotalClaims] = useState(0);
  const [openClaims, setOpenClaims] = useState(0);
  const [completedClaims, setCompletedClaims] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // History
  const [history, setHistory] = useState<HistoryClaim[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [sortCol, setSortCol] = useState<SortCol>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const loadVendor = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabaseCD
      .from("vendors")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      setLoading(false);
      return;
    }
    setVendor(data);
    setFeeAuto(data.fee_auto != null ? String(data.fee_auto) : "");
    setFeeHeavy(data.fee_heavy_duty != null ? String(data.fee_heavy_duty) : "");
    setFeePhotos(data.fee_photos_scope != null ? String(data.fee_photos_scope) : "");
    setDefaultInsurance(data.default_insurance_company || "");
    setLoading(false);
  }, [id]);

  const loadStats = useCallback(async () => {
    if (!vendor) return;
    const firmName = vendor.name;

    const [totalRes, openRes, completedRes, revenueRes] = await Promise.all([
      supabaseCD.from("claims_v").select("id", { count: "exact", head: true })
        .eq("firm", firmName).is("archived_at", null),
      supabaseCD.from("claims_v").select("id", { count: "exact", head: true })
        .eq("firm", firmName).is("archived_at", null)
        .not("status", "in", '("COMPLETED","CANCELED")'),
      supabaseCD.from("claims_v").select("id", { count: "exact", head: true })
        .eq("firm", firmName).is("archived_at", null)
        .eq("status", "COMPLETED"),
      supabaseCD.from("claims_v").select("file_total, pay_amount")
        .eq("firm", firmName).is("archived_at", null)
        .eq("status", "COMPLETED"),
    ]);

    setTotalClaims(totalRes.count ?? 0);
    setOpenClaims(openRes.count ?? 0);
    setCompletedClaims(completedRes.count ?? 0);

    const rev = (revenueRes.data || []).reduce((sum: number, c: any) =>
      sum + (c.file_total || c.pay_amount || 0), 0);
    setTotalRevenue(rev);
  }, [vendor]);

  const loadHistory = useCallback(async () => {
    if (!vendor) return;
    const from = historyPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count } = await supabaseCD
      .from("claims_v")
      .select("id, claim_number, customer_name, status, claim_type, file_total, pay_amount, created_at, completed_at", { count: "exact" })
      .eq("firm", vendor.name)
      .is("archived_at", null)
      .order(sortCol, { ascending: sortDir === "asc" })
      .range(from, to);

    setHistory((data as HistoryClaim[]) || []);
    setHistoryTotal(count ?? 0);
  }, [vendor, historyPage, sortCol, sortDir]);

  useEffect(() => { loadVendor(); }, [loadVendor]);
  useEffect(() => { if (vendor) loadStats(); }, [vendor, loadStats]);
  useEffect(() => { if (vendor) loadHistory(); }, [vendor, loadHistory]);

  const handleSaveFees = async () => {
    if (!vendor) return;
    setSaving(true);
    const { error } = await supabaseCD
      .from("vendors")
      .update({
        fee_auto: feeAuto ? parseFloat(feeAuto) : null,
        fee_heavy_duty: feeHeavy ? parseFloat(feeHeavy) : null,
        fee_photos_scope: feePhotos ? parseFloat(feePhotos) : null,
        default_insurance_company: defaultInsurance || null,
      })
      .eq("id", vendor.id);

    if (error) alert(`Error saving fees: ${error.message}`);
    else await loadVendor();
    setSaving(false);
  };

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
    setHistoryPage(0);
  };

  const sortIndicator = (col: SortCol) =>
    sortCol === col ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "";

  const totalPages = Math.ceil(historyTotal / PAGE_SIZE);

  if (loading) return <div className="vprof__loading">Loading...</div>;
  if (!vendor) return <div className="vprof__loading">Vendor not found</div>;

  return (
    <div>
      <NavBar role={role || "admin"} />
      <PageHeader
        label="Vendor Management"
        title={vendor.name}
        sub={vendor.active !== false ? "Active Firm" : "Inactive Firm"}
      />

      <div className="vprof__wrap">
        <Link to="/admin/vendors-payouts" className="btn btn--ghost btn--sm vprof__back">
          Back to Vendors
        </Link>

        {/* Section 1: Firm Header */}
        <div className="vprof__section vprof__section--accent">
          <div className="vprof__section-header">
            <div className="vprof__section-title">Firm Overview</div>
            <div className="vprof__section-line" />
          </div>
          <div className="vprof__section-body">
            <div className="vprof__firm-header">
              <span className="vprof__firm-swatch" style={{ background: vendor.color }} />
              <div className="vprof__firm-info">
                <div className="vprof__firm-name">{vendor.name}</div>
                <span className={`vprof__firm-status ${vendor.active !== false ? "vprof__firm-status--active" : "vprof__firm-status--inactive"}`}>
                  {vendor.active !== false ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div className="vprof__stats">
              <div className="vprof__stat">
                <div className="vprof__stat-num">{totalClaims}</div>
                <div className="vprof__stat-label">Total Claims</div>
              </div>
              <div className="vprof__stat">
                <div className="vprof__stat-num vprof__stat-num--amber">{openClaims}</div>
                <div className="vprof__stat-label">Open</div>
              </div>
              <div className="vprof__stat">
                <div className="vprof__stat-num vprof__stat-num--green">{completedClaims}</div>
                <div className="vprof__stat-label">Completed</div>
              </div>
              <div className="vprof__stat">
                <div className="vprof__stat-num vprof__stat-num--amber">${totalRevenue.toFixed(0)}</div>
                <div className="vprof__stat-label">Revenue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Fee Configuration */}
        <div className="vprof__section">
          <div className="vprof__section-header">
            <div className="vprof__section-title">Fee Configuration</div>
            <div className="vprof__section-line" />
          </div>
          <div className="vprof__section-body">
            <div className="vprof__fee-grid">
              <Field label="Auto Fee">
                <input
                  type="number"
                  step="0.01"
                  className="field__input"
                  value={feeAuto}
                  onChange={(e) => setFeeAuto(e.target.value)}
                  placeholder="$0.00"
                />
              </Field>
              <Field label="Heavy Duty Fee">
                <input
                  type="number"
                  step="0.01"
                  className="field__input"
                  value={feeHeavy}
                  onChange={(e) => setFeeHeavy(e.target.value)}
                  placeholder="$0.00"
                />
              </Field>
              <Field label="Photos / Scope Fee">
                <input
                  type="number"
                  step="0.01"
                  className="field__input"
                  value={feePhotos}
                  onChange={(e) => setFeePhotos(e.target.value)}
                  placeholder="$0.00"
                />
              </Field>
              <Field label="Default Insurance Company">
                <input
                  type="text"
                  className="field__input"
                  value={defaultInsurance}
                  onChange={(e) => setDefaultInsurance(e.target.value)}
                  placeholder="e.g. State Farm"
                />
              </Field>
            </div>
            <div className="vprof__fee-actions">
              <button
                className="btn btn--primary btn--sm"
                onClick={handleSaveFees}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Fees"}
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Contact & Profile */}
        <div className="vprof__section">
          <div className="vprof__section-header">
            <div className="vprof__section-title">Contact & Profile</div>
            <div className="vprof__section-line" />
          </div>
          <div className="vprof__section-body">
            <div className="vprof__info-grid">
              <div className="vprof__info-cell">
                <div className="vprof__info-label">Contact Name</div>
                <div className="vprof__info-value">{vendor.contact_name || "---"}</div>
              </div>
              <div className="vprof__info-cell">
                <div className="vprof__info-label">Email</div>
                <div className="vprof__info-value">{vendor.contact_email || "---"}</div>
              </div>
              <div className="vprof__info-cell">
                <div className="vprof__info-label">Phone</div>
                <div className="vprof__info-value">{vendor.contact_phone || "---"}</div>
              </div>
              <div className="vprof__info-cell">
                <div className="vprof__info-label">Pay Schedule</div>
                <div className="vprof__info-value">
                  {vendor.pay_cycle_type ? vendor.pay_cycle_type.replace(/_/g, " ") : "---"}
                </div>
              </div>
              <div className="vprof__info-cell">
                <div className="vprof__info-label">Base Fee</div>
                <div className="vprof__info-value">
                  {vendor.pay_amount != null ? `$${vendor.pay_amount}` : "---"}
                </div>
              </div>
              <div className="vprof__info-cell">
                <div className="vprof__info-label">Added</div>
                <div className="vprof__info-value">
                  {vendor.created_at ? new Date(vendor.created_at).toLocaleDateString() : "---"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Claim History */}
        <div className="vprof__section">
          <div className="vprof__section-header">
            <div className="vprof__section-title">Claim History ({historyTotal})</div>
            <div className="vprof__section-line" />
          </div>
          <div className="vprof__section-body">
            {/* Quick stats */}
            <div className="vprof__history-pills">
              <span className="vprof__history-pill">Total: {historyTotal}</span>
              <span className="vprof__history-pill">Open: {openClaims}</span>
              <span className="vprof__history-pill">Completed: {completedClaims}</span>
              <span className="vprof__history-pill">Revenue: ${totalRevenue.toFixed(0)}</span>
            </div>

            {history.length === 0 ? (
              <div className="vprof__empty">No claims found for this firm</div>
            ) : (
              <>
                <div className="vprof__history-wrap">
                  <table className="vprof__history-table">
                    <thead>
                      <tr>
                        <th className="vprof__th--sortable" onClick={() => handleSort("claim_number")}>
                          Claim #{sortIndicator("claim_number")}
                        </th>
                        <th className="vprof__th--sortable" onClick={() => handleSort("customer_name")}>
                          Customer{sortIndicator("customer_name")}
                        </th>
                        <th className="vprof__th--sortable" onClick={() => handleSort("status")}>
                          Status{sortIndicator("status")}
                        </th>
                        <th>Type</th>
                        <th className="vprof__th--sortable vprof__th--right" onClick={() => handleSort("file_total")}>
                          Amount{sortIndicator("file_total")}
                        </th>
                        <th className="vprof__th--sortable" onClick={() => handleSort("created_at")}>
                          Created{sortIndicator("created_at")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((c) => (
                        <tr key={c.id} className="vprof__history-row">
                          <td>
                            <Link to={`/claim/${c.id}`} className="vprof__history-link">
                              #{c.claim_number}
                            </Link>
                          </td>
                          <td className="vprof__history-name">{c.customer_name}</td>
                          <td>
                            <span className={`vprof__history-status vprof__history-status--${(c.status || "unassigned").toLowerCase()}`}>
                              {c.status || "UNASSIGNED"}
                            </span>
                          </td>
                          <td className="vprof__history-type">
                            {(c.claim_type || "auto").replace(/_/g, " ")}
                          </td>
                          <td className="vprof__history-amount">
                            {c.file_total != null
                              ? `$${Number(c.file_total).toFixed(2)}`
                              : c.pay_amount != null
                              ? `$${Number(c.pay_amount).toFixed(2)}`
                              : "---"}
                          </td>
                          <td className="vprof__history-date">
                            {c.created_at ? new Date(c.created_at).toLocaleDateString() : "---"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="vprof__pagination">
                    <button
                      className="btn btn--ghost btn--sm"
                      disabled={historyPage === 0}
                      onClick={() => setHistoryPage(historyPage - 1)}
                    >
                      Prev
                    </button>
                    <span className="vprof__pagination-info">
                      Page {historyPage + 1} of {totalPages}
                    </span>
                    <button
                      className="btn btn--ghost btn--sm"
                      disabled={historyPage >= totalPages - 1}
                      onClick={() => setHistoryPage(historyPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
