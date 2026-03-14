import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { supabaseCD } from "../../lib/supabaseCD";
import {
  initializeSupabaseAuthz,
  getSupabaseAuthz,
} from "../../lib/supabaseAuthz";
import { PayCycleType } from "../../utils/payoutCalculations";
import { getTimezoneForState } from "../../utils/stateTimezone";
import {
  forecastPayouts,
  getWeeklyView,
  getMonthlyView,
  getUpcomingPayouts,
  PayoutForecast,
  FirmSchedule,
  WeeklyTotal,
  MonthlyTotal,
  Claim,
} from "../../utils/payoutForecasting";
import { normalizeFirmNameForConfig, calculateExpectedPayout } from "../../utils/firmFeeConfig";
import { NavBar } from "../../components/NavBar";
import { useRole } from "../../hooks/useRole";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import {
  getThisWeekPayouts,
  getNextWeekPayouts,
  getThisMonthPayouts,
  calculateTotalPayout,
} from "../../utils/payoutLogic";
import "./vendors-payouts.css";

/* ─── Types ─── */

type Vendor = {
  id: string;
  name: string;
  color: string;
  pay_cycle_type?: PayCycleType;
  reference_pay_date?: string;
  pay_amount?: number | null;
  active?: boolean;
  created_at?: string;
};

interface ClaimDetail extends Claim {
  claim_number?: string;
  customer_name?: string;
}

type TabMode = "vendors" | "payouts";
type ViewMode = "upcoming" | "weekly" | "monthly";

const PAY_CYCLE_OPTIONS: { value: PayCycleType; label: string }[] = [
  { value: "weekly_thu_fri_thu", label: "Weekly (Thursday)" },
  { value: "biweekly_thu_fri_thu", label: "Bi-Weekly (Wednesday)" },
  { value: "biweekly_fri_sat_fri", label: "Bi-Weekly (Thursday)" },
  { value: "monthly_15th_prev_month", label: "Monthly — 15th (prev month)" },
  { value: "semimonthly_15th_end", label: "Semi-Monthly — 15th & EOM" },
  { value: "monthly_last_same_month", label: "Monthly — End of Month" },
];

function formatScheduleLabel(type?: string): string {
  if (!type) return "No schedule set";
  const match = PAY_CYCLE_OPTIONS.find((o) => o.value === type);
  return match ? match.label : type.replace(/_/g, " ");
}

/* ─── Component ─── */

export default function VendorsPayouts() {
  const nav = useNavigate();
  const { role } = useRole();
  const [tab, setTab] = useState<TabMode>("vendors");

  /* ── Vendor state ── */
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [authzReady, setAuthzReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  /* Vendor form */
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#9CA3AF");
  const [formCycle, setFormCycle] = useState<PayCycleType>("weekly_thu_fri_thu");
  const [formRefDate, setFormRefDate] = useState("");
  const [formPayAmt, setFormPayAmt] = useState("");
  const [formActive, setFormActive] = useState(true);

  /* ── Payout state ── */
  const [claims, setClaims] = useState<Claim[]>([]);
  const [payouts, setPayouts] = useState<PayoutForecast[]>([]);
  const [weeklyView, setWeeklyView] = useState<WeeklyTotal[]>([]);
  const [monthlyView, setMonthlyView] = useState<MonthlyTotal[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("upcoming");
  const [selectedPayout, setSelectedPayout] = useState<PayoutForecast | null>(null);
  const [payoutClaims, setPayoutClaims] = useState<ClaimDetail[]>([]);
  const [firmSchedules, setFirmSchedules] = useState<Record<string, FirmSchedule>>({});
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editingClaim, setEditingClaim] = useState<ClaimDetail | null>(null);
  const [editingRefDate, setEditingRefDate] = useState(false);
  const [newRefDate, setNewRefDate] = useState("");

  /* ── Auth init ── */
  useEffect(() => {
    (async () => {
      try {
        await initializeSupabaseAuthz(supabase, supabaseCD);
        setAuthzReady(true);
      } catch (err: any) {
        console.error("Auth init failed:", err);
        setVendorLoading(false);
      }
    })();
  }, []);

  /* ── Load vendors ── */
  const loadVendors = async () => {
    if (!authzReady) return;
    setVendorLoading(true);
    try {
      const { data, error } = await supabaseCD
        .from("vendors")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setVendors(data || []);
    } catch (err: any) {
      console.error("Error loading vendors:", err);
    } finally {
      setVendorLoading(false);
    }
  };

  useEffect(() => {
    if (authzReady) loadVendors();
  }, [authzReady]);

  /* ── Load payout data ── */
  const loadPayouts = async () => {
    setPayoutLoading(true);
    try {
      const [claimsRes, vendorsRes] = await Promise.all([
        supabaseCD
          .from("claims_v")
          .select("*")
          .is("archived_at", null)
          .or("status.eq.COMPLETED,status.eq.SCHEDULED,status.eq.IN_PROGRESS"),
        supabaseCD
          .from("vendors")
          .select("name, pay_schedule_type, pay_day, reference_date, color")
          .eq("active", true),
      ]);
      if (claimsRes.error) throw claimsRes.error;

      const allClaims = ((claimsRes.data || []) as Claim[]).filter(
        (c: any) => !c.is_supplement
      );
      setClaims(allClaims);

      const schedules: Record<string, FirmSchedule> = Object.fromEntries(
        (vendorsRes.data || [])
          .filter((v: any) => v.pay_schedule_type)
          .map((v: any) => [
            normalizeFirmNameForConfig(v.name),
            {
              pay_schedule_type: v.pay_schedule_type,
              pay_day: v.pay_day ?? 0,
              reference_date: v.reference_date ? new Date(v.reference_date) : undefined,
            },
          ])
      );
      setFirmSchedules(schedules);

      const allPayouts = forecastPayouts(allClaims, schedules);
      setPayouts(allPayouts);
      setWeeklyView(getWeeklyView(allPayouts));
      setMonthlyView(getMonthlyView(allPayouts));
    } catch (err: any) {
      console.error("Error loading payout data:", err);
    } finally {
      setPayoutLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  /* ── Vendor CRUD ── */
  const openAddModal = () => {
    setEditingVendor(null);
    setFormName("");
    setFormColor("#9CA3AF");
    setFormCycle("weekly_thu_fri_thu");
    setFormRefDate("");
    setFormPayAmt("");
    setFormActive(true);
    setDeleteConfirmId(null);
    setModalOpen(true);
  };

  const openEditModal = (v: Vendor) => {
    setEditingVendor(v);
    setFormName(v.name);
    setFormColor(v.color);
    setFormCycle(v.pay_cycle_type || "weekly_thu_fri_thu");
    setFormRefDate(v.reference_pay_date || "");
    setFormPayAmt(v.pay_amount?.toString() || "");
    setFormActive(v.active !== false);
    setDeleteConfirmId(null);
    setMenuOpenId(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingVendor(null);
    setDeleteConfirmId(null);
  };

  const saveVendor = async () => {
    if (!formName.trim()) return alert("Vendor name is required");
    if (formCycle.startsWith("biweekly") && !formRefDate) {
      return alert("Reference date is required for bi-weekly schedules");
    }

    const payload = {
      name: formName.trim(),
      color: formColor,
      pay_cycle_type: formCycle,
      reference_pay_date: formRefDate || null,
      pay_amount: formPayAmt ? parseFloat(formPayAmt) : null,
      active: formActive,
    };

    try {
      if (editingVendor) {
        const { error } = await supabaseCD
          .from("vendors")
          .update(payload)
          .eq("id", editingVendor.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseCD.from("vendors").insert([payload]);
        if (error) throw error;
      }
      closeModal();
      await loadVendors();
      await loadPayouts();
    } catch (err: any) {
      alert(`Error saving vendor: ${err.message}`);
    }
  };

  const toggleActive = async (v: Vendor) => {
    try {
      const { error } = await supabaseCD
        .from("vendors")
        .update({ active: !v.active })
        .eq("id", v.id);
      if (error) throw error;
      setMenuOpenId(null);
      await loadVendors();
      await loadPayouts();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const deleteVendor = async (id: string) => {
    try {
      const { error } = await supabaseCD.from("vendors").delete().eq("id", id);
      if (error) throw error;
      closeModal();
      await loadVendors();
      await loadPayouts();
    } catch (err: any) {
      alert(`Error deleting vendor: ${err.message}`);
    }
  };

  /* ── Payout interactions ── */
  const handlePayoutClick = async (payout: PayoutForecast) => {
    setSelectedPayout(payout);
    setEditingClaimId(null);
    setEditingRefDate(false);
    try {
      const { data, error } = await supabaseCD
        .from("claims_v")
        .select("*")
        .is("archived_at", null)
        .in("id", payout.claimIds);
      if (error) throw error;
      setPayoutClaims(data || []);
    } catch (err: any) {
      console.error("Error loading claim details:", err);
    }
  };

  const handleUpdateAmount = async (claimId: string, newAmount: number, claim: ClaimDetail) => {
    try {
      const updateData: any = {};
      if (claim.status === "COMPLETED") {
        if (claim.file_total != null) updateData.file_total = newAmount;
        else updateData.pay_amount = newAmount;
      } else {
        updateData.pay_amount = newAmount;
      }

      const { error } = await supabaseCD
        .from("claims")
        .update(updateData)
        .eq("id", claimId);
      if (error) throw error;

      setPayoutClaims((prev) =>
        prev.map((c) => (c.id === claimId ? { ...c, ...updateData } : c))
      );
      await loadPayouts();

      if (selectedPayout) {
        const { data } = await supabaseCD
          .from("claims_v")
          .select("*")
          .is("archived_at", null)
          .in("id", selectedPayout.claimIds);
        setPayoutClaims(data || []);
      }
    } catch (err: any) {
      console.error("Error updating amount:", err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleSaveEditAmount = async () => {
    if (!editingClaim) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt < 0) return alert("Enter a valid amount");
    await handleUpdateAmount(editingClaim.id, amt, editingClaim);
    setEditingClaimId(null);
    setEditingClaim(null);
    setEditAmount("");
  };

  const handleUpdateReferenceDate = async (firmName: string, date: string) => {
    await supabaseCD
      .from("vendors")
      .update({ reference_date: date, reference_date_updated_at: new Date().toISOString() })
      .eq("name", firmName);
    await loadPayouts();
    await loadVendors();
  };

  /* ── Payout computed values ── */
  const upcomingPayouts = getUpcomingPayouts(payouts, 30);
  const thisWeekTotal = calculateTotalPayout(getThisWeekPayouts(payouts));
  const nextWeekTotal = calculateTotalPayout(getNextWeekPayouts(payouts));
  const thisMonthTotal = calculateTotalPayout(getThisMonthPayouts(payouts));
  const thisWeekCount = getThisWeekPayouts(payouts).length;
  const nextWeekCount = getNextWeekPayouts(payouts).length;
  const thisMonthCount = getThisMonthPayouts(payouts).length;

  /* ── Vendor color lookup for payout cards ── */
  const vendorColorMap: Record<string, string> = {};
  vendors.forEach((v) => {
    vendorColorMap[v.name] = v.color;
    vendorColorMap[normalizeFirmNameForConfig(v.name)] = v.color;
  });

  const getVendorColor = (firmName: string): string => {
    return vendorColorMap[firmName] || vendorColorMap[normalizeFirmNameForConfig(firmName)] || "#4a5058";
  };

  /* ── Detail modal total ── */
  const detailTotal = payoutClaims.reduce((sum, c) => {
    if (c.status === "COMPLETED") return sum + (c.file_total || c.pay_amount || 0);
    return sum + (c.pay_amount || calculateExpectedPayout(c.firm) || 0);
  }, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /* ── Current week/month check helpers ── */
  const isCurrentWeek = (weekStart: Date) => {
    const now = new Date();
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((day + 6) % 7));
    mon.setHours(0, 0, 0, 0);
    const ws = new Date(weekStart);
    ws.setHours(0, 0, 0, 0);
    return ws.getTime() === mon.getTime();
  };

  const isCurrentMonth = (year: number, month: number) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month;
  };

  /* ── Render ── */
  return (
    <div className="vp">
      <NavBar role={role || "admin"} />
      <PageHeader
        label="Command Center"
        title="Vendors & Payouts"
        sub="Manage firms and forecast cash flow from completed and scheduled claims"
      />

      {/* Tab row */}
      <div className="vp__tabs">
        <button
          className={`vp__tab ${tab === "vendors" ? "vp__tab--active" : ""}`}
          onClick={() => setTab("vendors")}
        >
          Manage Vendors
        </button>
        <button
          className={`vp__tab ${tab === "payouts" ? "vp__tab--active" : ""}`}
          onClick={() => setTab("payouts")}
        >
          Payout Dashboard
        </button>
      </div>

      {/* ═══════════════ TAB 1: VENDORS ═══════════════ */}
      {tab === "vendors" && (
        <div className="vp__body">
          <div className="vp__section-header">
            <div>
              <div className="vp__section-title">Registered Firms</div>
              <div className="vp__section-sub">Firms, pay schedules, and status</div>
            </div>
            <button className="btn btn--primary btn--sm" onClick={openAddModal}>
              + Add Vendor
            </button>
          </div>

          {vendorLoading ? (
            <div className="vp__empty">Loading vendors...</div>
          ) : vendors.length === 0 ? (
            <div className="vp__empty">
              <div className="vp__empty-title">No Vendors Configured</div>
              <div className="vp__empty-sub">Add your first firm to begin tracking payouts</div>
              <button className="btn btn--primary btn--sm" onClick={openAddModal}>
                + Add Vendor
              </button>
            </div>
          ) : (
            <div className="vp__vendor-list">
              {vendors.map((v) => (
                <div
                  key={v.id}
                  className="vendor-card"
                  style={{ "--vendor-color": v.color } as React.CSSProperties}
                >
                  <div className="vendor-card__header">
                    <div className="vendor-card__header-left">
                      <div className="vendor-card__name">{v.name}</div>
                      <span
                        className={`vendor-card__badge ${
                          v.active !== false
                            ? "vendor-card__badge--active"
                            : "vendor-card__badge--inactive"
                        }`}
                      >
                        {v.active !== false ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="vendor-card__header-right">
                      <button
                        className="vendor-card__menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === v.id ? null : v.id);
                        }}
                      >
                        ⋮
                      </button>
                      {menuOpenId === v.id && (
                        <div className="vendor-card__dropdown">
                          <button
                            className="vendor-card__dropdown-item"
                            onClick={() => openEditModal(v)}
                          >
                            Edit Vendor
                          </button>
                          <button
                            className="vendor-card__dropdown-item"
                            onClick={() => toggleActive(v)}
                          >
                            {v.active !== false ? "Set Inactive" : "Set Active"}
                          </button>
                          <button
                            className="vendor-card__dropdown-item vendor-card__dropdown-item--danger"
                            onClick={() => {
                              setMenuOpenId(null);
                              if (confirm("Delete this vendor permanently?")) deleteVendor(v.id);
                            }}
                          >
                            Delete Vendor
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="vendor-card__meta">
                    <div className="vendor-card__field">
                      <div className="vendor-card__field-label">Pay Schedule</div>
                      <div className="vendor-card__field-value">
                        {formatScheduleLabel(v.pay_cycle_type)}
                      </div>
                    </div>
                    <div className="vendor-card__field">
                      <div className="vendor-card__field-label">Base Fee</div>
                      <div className="vendor-card__field-value">
                        {v.pay_amount ? `$${v.pay_amount}` : "—"}
                      </div>
                    </div>
                    {v.pay_cycle_type?.startsWith("biweekly") && (
                      <div className="vendor-card__field">
                        <div className="vendor-card__field-label">Reference Date</div>
                        <div className="vendor-card__field-value">
                          {v.reference_pay_date
                            ? new Date(v.reference_pay_date + "T00:00:00").toLocaleDateString()
                            : "—"}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    className="vendor-card__profile-btn"
                    onClick={() => nav(`/admin/vendors/${v.id}`)}
                  >
                    VIEW PROFILE
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ TAB 2: PAYOUTS ═══════════════ */}
      {tab === "payouts" && (
        <div className="vp__body">
          {payoutLoading ? (
            <div className="vp__empty">Loading payout forecasts...</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="vp__stats">
                <div className="vp__stat vp__stat--primary">
                  <div className="vp__stat-label">This Week</div>
                  <div className="vp__stat-amount vp__stat-amount--amber">
                    ${thisWeekTotal.toFixed(2)}
                  </div>
                  <div className="vp__stat-sub">
                    {thisWeekCount} payout{thisWeekCount !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="vp__stat">
                  <div className="vp__stat-label">Next Week</div>
                  <div className="vp__stat-amount">
                    ${nextWeekTotal.toFixed(2)}
                  </div>
                  <div className="vp__stat-sub">
                    {nextWeekCount} payout{nextWeekCount !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="vp__stat">
                  <div className="vp__stat-label">This Month</div>
                  <div className="vp__stat-amount">
                    ${thisMonthTotal.toFixed(2)}
                  </div>
                  <div className="vp__stat-sub">
                    {thisMonthCount} payout{thisMonthCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {/* View mode selector */}
              <div className="vp__views">
                {(["upcoming", "weekly", "monthly"] as ViewMode[]).map((m) => (
                  <button
                    key={m}
                    className={`vp__view-btn ${viewMode === m ? "vp__view-btn--active" : ""}`}
                    onClick={() => setViewMode(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* ── UPCOMING VIEW ── */}
              {viewMode === "upcoming" && (
                <div className="vp__payout-list">
                  <h4 className="vp__view-header">
                    Next 30 Days ({upcomingPayouts.length} payouts)
                  </h4>
                  {upcomingPayouts.length === 0 ? (
                    <div className="vp__empty">
                      <div className="vp__empty-title">No Payouts In This Period</div>
                      <div className="vp__empty-sub">
                        Complete or schedule claims to see forecasted payouts here
                      </div>
                    </div>
                  ) : (
                    upcomingPayouts.map((p, i) => {
                      const isPastDue = p.payoutDate < today;
                      return (
                        <div
                          key={i}
                          className="payout-card"
                          style={{ "--vendor-color": getVendorColor(p.firm) } as React.CSSProperties}
                          onClick={() => handlePayoutClick(p)}
                        >
                          <div className="payout-card__header">
                            <div className="payout-card__firm">{p.firm}</div>
                            <div className="payout-card__header-right">
                              {isPastDue && (
                                <span className="payout-card__overdue">Past Due</span>
                              )}
                              <div className="payout-card__date">
                                {p.payoutDate.toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="payout-card__body">
                            <div className="payout-card__field">
                              <div className="payout-card__meta-label">Work Period</div>
                              <div className="payout-card__meta-value">
                                {p.periodStart.toLocaleDateString()} –{" "}
                                {p.periodEnd.toLocaleDateString()}
                              </div>
                            </div>
                            <div className="payout-card__field">
                              <div className="payout-card__meta-label">Claims</div>
                              <div className="payout-card__meta-value">{p.claimCount}</div>
                            </div>
                            <div className="payout-card__field payout-card__field--amount">
                              <div className="payout-card__meta-label">Amount</div>
                              <div className="payout-card__amount">
                                ${p.totalExpected.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── WEEKLY VIEW ── */}
              {viewMode === "weekly" && (
                <div className="vp__payout-list">
                  <h4 className="vp__view-header">
                    Weekly Totals ({weeklyView.length} weeks)
                  </h4>
                  {weeklyView.slice(0, 12).map((week, i) => (
                    <div
                      key={i}
                      className={`payout-week ${isCurrentWeek(week.weekStart) ? "payout-week--current" : ""}`}
                    >
                      <div className="payout-week__header">
                        <div className="payout-week__label">
                          {week.weekStart.toLocaleDateString()} –{" "}
                          {week.weekEnd.toLocaleDateString()}
                        </div>
                        <div className="payout-week__total">
                          ${week.totalAmount.toFixed(2)}
                        </div>
                      </div>
                      {week.payouts.map((p, j) => (
                        <div
                          key={j}
                          className="payout-week__row"
                          style={{ "--vendor-color": getVendorColor(p.firm) } as React.CSSProperties}
                        >
                          <div className="payout-week__firm">{p.firm}</div>
                          <div className="payout-week__amount">
                            ${p.totalExpected.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* ── MONTHLY VIEW ── */}
              {viewMode === "monthly" && (
                <div className="vp__payout-list">
                  <h4 className="vp__view-header">
                    Monthly Totals ({monthlyView.length} months)
                  </h4>
                  {monthlyView.slice(0, 6).map((month, i) => (
                    <div
                      key={i}
                      className={`payout-month ${isCurrentMonth(month.year, month.month) ? "payout-month--current" : ""}`}
                    >
                      <div className="payout-month__header">
                        <div className="payout-month__label">
                          {month.monthName} {month.year}
                        </div>
                        <div className="payout-month__total">
                          ${month.totalAmount.toFixed(2)}
                        </div>
                      </div>
                      {Object.entries(month.byFirm).map(([firm, amount], j) => (
                        <div
                          key={j}
                          className="payout-week__row"
                          style={{ "--vendor-color": getVendorColor(firm) } as React.CSSProperties}
                        >
                          <div className="payout-week__firm">{firm}</div>
                          <div className="payout-week__amount">${amount.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Info box */}
              <div className="vp__info-box">
                <div className="vp__info-title">Payout Forecast Details</div>
                <div className="vp__info-text">
                  All views display payouts grouped by <strong>when the payout occurs</strong>,
                  not when the work was performed.
                </div>
                <div className="vp__info-text">
                  Completed claims use <strong>file_total</strong> or{" "}
                  <strong>pay_amount</strong>. Scheduled claims use{" "}
                  <strong>pay_amount</strong> or the firm's base fee.
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════ ADD/EDIT VENDOR MODAL ═══════════════ */}
      {modalOpen && (
        <div className="vp__overlay" onClick={closeModal}>
          <div className="vp__modal" onClick={(e) => e.stopPropagation()}>
            <div className="vp__modal-header">
              <div>
                <div className="vp__modal-eyebrow">Vendor Management</div>
                <div className="vp__modal-title">
                  {editingVendor ? "Edit Vendor" : "Add New Vendor"}
                </div>
              </div>
              <button className="vp__modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="vp__modal-body">
              <Field label="Vendor Name">
                <input
                  type="text"
                  className="field__input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Sedgwick"
                />
              </Field>

              <Field label="Calendar Color">
                <div className="vp__color-row">
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="vp__color-swatch"
                  />
                  <input
                    type="text"
                    className="field__input vp__color-text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    placeholder="#9CA3AF"
                  />
                </div>
              </Field>

              <Field label="Pay Schedule">
                <div className="field__select-wrap">
                  <select
                    className="field__select"
                    value={formCycle}
                    onChange={(e) => setFormCycle(e.target.value as PayCycleType)}
                  >
                    {PAY_CYCLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <div className="field__select-arrow">▾</div>
                </div>
              </Field>

              {formCycle.startsWith("biweekly") && (
                <Field
                  label="Reference Date"
                  hint="Enter any known past pay date to anchor the bi-weekly schedule"
                >
                  <input
                    type="date"
                    className="field__input"
                    value={formRefDate}
                    onChange={(e) => setFormRefDate(e.target.value)}
                  />
                </Field>
              )}

              <Field label="Base Fee (Per Claim)">
                <input
                  type="number"
                  step="0.01"
                  className="field__input"
                  value={formPayAmt}
                  onChange={(e) => setFormPayAmt(e.target.value)}
                  placeholder="$0.00"
                />
              </Field>

              <div className="vp__toggle-field">
                <label className="vp__toggle-label">
                  <input
                    type="checkbox"
                    className="vp__toggle-checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                  />
                  Active
                </label>
                <div className="vp__toggle-hint">
                  Inactive vendors are excluded from payout forecasting
                </div>
              </div>
            </div>

            <div className="vp__modal-footer">
              {editingVendor && deleteConfirmId !== editingVendor.id && (
                <button
                  className="btn btn--danger btn--sm vp__modal-delete"
                  onClick={() => setDeleteConfirmId(editingVendor.id)}
                >
                  Delete Vendor
                </button>
              )}
              {editingVendor && deleteConfirmId === editingVendor.id && (
                <div className="vp__delete-confirm">
                  <span className="vp__delete-confirm-text">
                    Permanently delete this vendor?
                  </span>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => deleteVendor(editingVendor.id)}
                  >
                    Confirm Delete
                  </button>
                </div>
              )}
              <div className="vp__modal-footer-right">
                <button className="btn btn--ghost btn--sm" onClick={closeModal}>
                  Cancel
                </button>
                <button className="btn btn--primary btn--sm" onClick={saveVendor}>
                  Save Vendor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ PAYOUT DETAIL MODAL ═══════════════ */}
      {selectedPayout && (
        <div className="vp__overlay" onClick={() => setSelectedPayout(null)}>
          <div
            className="vp__modal vp__modal--wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vp__modal-header">
              <div>
                <div className="vp__modal-eyebrow">Payout Details</div>
                <div className="vp__modal-title">
                  {selectedPayout.firm} —{" "}
                  {selectedPayout.payoutDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="vp__modal-sub">
                  Work Period: {selectedPayout.periodStart.toLocaleDateString()} –{" "}
                  {selectedPayout.periodEnd.toLocaleDateString()}
                </div>
              </div>
              <button
                className="vp__modal-close"
                onClick={() => setSelectedPayout(null)}
              >
                ✕
              </button>
            </div>

            {/* Reference date for biweekly */}
            {firmSchedules[selectedPayout.firm]?.pay_schedule_type === "biweekly" && (
              <div className="vp__ref-date">
                {editingRefDate ? (
                  <div className="vp__ref-date-edit">
                    <span>Reference Date:</span>
                    <input
                      type="date"
                      className="field__input vp__ref-date-input"
                      value={newRefDate}
                      onChange={(e) => setNewRefDate(e.target.value)}
                    />
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={async () => {
                        if (newRefDate) {
                          await handleUpdateReferenceDate(selectedPayout.firm, newRefDate);
                          setEditingRefDate(false);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => setEditingRefDate(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span>
                      Reference Date:{" "}
                      <span className="vp__ref-date-value">
                        {firmSchedules[selectedPayout.firm]?.reference_date?.toLocaleDateString() ||
                          "Not set"}
                      </span>
                    </span>
                    <button
                      className="vp__ref-date-edit-btn"
                      onClick={() => {
                        const rd = firmSchedules[selectedPayout.firm]?.reference_date;
                        setNewRefDate(rd ? rd.toISOString().split("T")[0] : "");
                        setEditingRefDate(true);
                      }}
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Claims table */}
            <div className="vp__modal-body vp__modal-body--table">
              <div className="vp__detail-table-wrap">
                <table className="vp__detail-table">
                  <thead>
                    <tr>
                      <th>Claim #</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th className="vp__detail-th--right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutClaims.map((c) => {
                      const amt =
                        c.status === "COMPLETED"
                          ? c.file_total || c.pay_amount || 0
                          : c.pay_amount || calculateExpectedPayout(c.firm) || 0;
                      const isEditing = editingClaimId === c.id;

                      return (
                        <tr key={c.id}>
                          <td className="vp__detail-claim-num">
                            #{c.claim_number || "N/A"}
                          </td>
                          <td>
                            {c.completion_date
                              ? new Date(c.completion_date).toLocaleDateString()
                              : c.appointment_start
                              ? new Date(c.appointment_start).toLocaleDateString('en-US', { timeZone: getTimezoneForState(c.state) })
                              : "—"}
                          </td>
                          <td>
                            <span
                              className={`vp__detail-status ${
                                c.status === "COMPLETED"
                                  ? "vp__detail-status--completed"
                                  : "vp__detail-status--scheduled"
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="vp__detail-td--right">
                            {isEditing ? (
                              <div className="vp__amount-edit">
                                <input
                                  type="number"
                                  step="0.01"
                                  className="vp__amount-input"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(e.target.value)}
                                />
                                <button
                                  className="vp__amount-save"
                                  onClick={handleSaveEditAmount}
                                >
                                  ✓
                                </button>
                                <button
                                  className="vp__amount-cancel"
                                  onClick={() => {
                                    setEditingClaimId(null);
                                    setEditingClaim(null);
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="vp__amount-cell">
                                <span className="vp__amount-value">
                                  ${amt.toFixed(2)}
                                </span>
                                <button
                                  className="vp__amount-edit-btn"
                                  onClick={() => {
                                    setEditingClaimId(c.id);
                                    setEditingClaim(c);
                                    setEditAmount(amt.toString());
                                  }}
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="vp__detail-total-row">
                      <td colSpan={3}>
                        Total ({payoutClaims.length} claim
                        {payoutClaims.length !== 1 ? "s" : ""})
                      </td>
                      <td className="vp__detail-td--right vp__detail-total-amt">
                        ${detailTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="vp__modal-footer">
              <div className="vp__modal-footer-right">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setSelectedPayout(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
