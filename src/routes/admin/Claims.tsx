import { useEffect, useState, useCallback } from "react";
import { supabase, getCurrentFirmId } from "../../lib/supabase";
import { supabaseCD } from "../../lib/supabaseCD";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import {
  initializeSupabaseAuthz,
  getSupabaseAuthz,
} from "../../lib/supabaseAuthz";
import { getFirmColor } from "../../constants/firmColors";
import MonthlyCalendar from "../../components/claims/MonthlyCalendar";
import MobileAgendaView from "../../components/claims/MobileAgendaView";
import MobileClaimsList from "../../components/claims/MobileClaimsList";
import { NavBar } from "../../components/NavBar";
import { useRole } from "../../hooks/useRole";
import PageHeader from "../../components/ui/PageHeader";
import { useIsMobile } from "../../hooks/useIsMobile";
import { getTimezoneForState } from "../../utils/stateTimezone";
import "./claims.css";

type Claim = {
  id: string;
  claim_number: string;
  customer_name: string;
  status: string;
  vin?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  assigned_to?: string;
  appointment_start?: string;
  appointment_end?: string;
  firm?: string;
  notes?: string;
  created_at?: string;
  completed_at?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  zip?: string | null;
  lat?: number;
  lng?: number;
  pay_amount?: number | null;
  file_total?: number | null;
  pipeline_stage?: string;
  claim_type?: string;
  at_risk_unassigned?: boolean;
  at_risk_inspection?: boolean;
  at_risk_appraisal?: boolean;
  profiles?: {
    full_name?: string;
  } | null;
};

type ClaimStatus = "UNASSIGNED" | "SCHEDULED" | "IN_PROGRESS" | "WRITING" | "COMPLETED" | "CANCELED" | "ALL";
type PipelineTab = "all_active" | "needs_scheduling" | "in_progress" | "completed";

const PIPELINE_TABS: { key: PipelineTab; label: string }[] = [
  { key: "all_active", label: "All Active" },
  { key: "needs_scheduling", label: "Needs Scheduling" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

function getStatusBadgeClass(status?: string): string {
  switch (status) {
    case "SCHEDULED": return "claims__badge--scheduled";
    case "IN_PROGRESS": return "claims__badge--progress";
    case "WRITING": return "claims__badge--writing";
    case "COMPLETED": return "claims__badge--completed";
    case "CANCELED": return "claims__badge--canceled";
    default: return "claims__badge--status";
  }
}

function calcCycleTime(created?: string, completed?: string): string {
  if (!created || !completed) return "---";
  const diff = new Date(completed).getTime() - new Date(created).getTime();
  if (diff < 0) return "---";
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  return `${days}d`;
}

export default function AdminClaims() {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authzInitialized, setAuthzInitialized] = useState(false);
  const [showArchived, setShowArchived] = useState(
    searchParams.get("archived") === "true"
  );
  const routeLocation = useLocation();
  const isCalendarRoute = routeLocation.pathname === "/calendar" || searchParams.get("view") === "calendar";
  const [showCalendar, setShowCalendar] = useState(isCalendarRoute);
  const [activeTab, setActiveTab] = useState<PipelineTab>("all_active");
  const [tabCounts, setTabCounts] = useState<Record<PipelineTab, number>>({
    all_active: 0, needs_scheduling: 0, in_progress: 0, completed: 0,
  });
  const [selectedStatus, setSelectedStatus] = useState<ClaimStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [draggingClaimId, setDraggingClaimId] = useState<string | null>(null);
  const [confirmingCompleteId, setConfirmingCompleteId] = useState<string | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"assign" | "complete" | null>(null);
  const [bulkAppraiser, setBulkAppraiser] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [appraisers, setAppraisers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [firmId, setFirmId] = useState<string | null>(null);

  const isMobile = useIsMobile();
  const { role } = useRole();

  const initializeAuth = async () => {
    try {
      await initializeSupabaseAuthz(supabase, supabaseCD);
      setAuthzInitialized(true);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadProfiles = useCallback(async () => {
    const { data } = await supabaseCD
      .from("profiles")
      .select("user_id, full_name");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((p: any) => { if (p.user_id && p.full_name) map[p.user_id] = p.full_name; });
      setProfileMap(map);
    }
  }, []);

  const load = useCallback(async () => {
    if (!authzInitialized) return;

    try {
      setLoading(true);
      setError(null);

      const authz = getSupabaseAuthz();
      if (!authz || !authz.isInitialized) {
        throw new Error("Authorization not properly initialized");
      }

      let query = supabaseCD
        .from('claims')
        .select("*")
        .order("created_at", { ascending: false });

      query = authz.scopedClaimsQuery(query);
      if (firmId) query = query.eq("firm_id", firmId);
      query = query.gte("created_at", "2025-12-01T00:00:00.000Z");
      query = query.is("archived_at", null);

      const { data, error: queryError } = await query;

      if (queryError) {
        const errorResponse = authz.handleAuthError(queryError);
        if (errorResponse.shouldRedirect) {
          setError(`${errorResponse.message} Redirecting to login...`);
          setTimeout(() => { window.location.href = "/CipherDispatch/"; }, 2000);
          return;
        }
        throw new Error(errorResponse.message);
      }

      const claims = (data as Claim[]) || [];
      setAllClaims(claims);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authzInitialized, firmId]);

  const applyFilters = useCallback((claims: Claim[], tab: PipelineTab, status: ClaimStatus, search: string) => {
    let filtered = [...claims];

    // Tab filtering
    switch (tab) {
      case "all_active":
        filtered = filtered.filter(c => c.status !== "COMPLETED" && c.status !== "CANCELED");
        break;
      case "needs_scheduling":
        filtered = filtered.filter(c =>
          c.status !== "COMPLETED" && c.status !== "CANCELED" && !c.appointment_start
        );
        break;
      case "in_progress":
        filtered = filtered.filter(c => ["SCHEDULED", "IN_PROGRESS", "WRITING"].includes(c.status));
        break;
      case "completed":
        filtered = filtered.filter(c => c.status === "COMPLETED");
        break;
    }

    // Status pill filtering
    if (status !== "ALL" && tab !== "completed") {
      if (status === "UNASSIGNED") {
        filtered = filtered.filter(claim => !claim.assigned_to);
      } else {
        filtered = filtered.filter(claim => claim.status === status);
      }
    }

    // Search filtering
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(claim =>
        (claim.claim_number || "").toLowerCase().includes(q) ||
        (claim.customer_name || "").toLowerCase().includes(q) ||
        (claim.firm || "").toLowerCase().includes(q) ||
        (claim.vin || "").toLowerCase().includes(q) ||
        (claim.city || "").toLowerCase().includes(q)
      );
    }

    setRows(filtered);
  }, []);

  const handleQuickComplete = async (claimId: string) => {
    try {
      const { error } = await supabaseCD
        .from("claims")
        .update({ status: "COMPLETED" })
        .eq("id", claimId);
      if (error) throw error;
      setConfirmingCompleteId(null);
      load();
    } catch (err: any) {
      alert(`Error completing claim: ${err.message}`);
    }
  };

  const handleDragStart = (e: React.DragEvent, claim: Claim) => {
    setDraggingClaimId(claim.id);
    const payload = {
      id: claim.id,
      claimNumber: claim.claim_number,
      firmName: claim.firm || '',
      customerName: claim.customer_name,
      addressLine1: claim.address_line1 || '',
      city: claim.city || '',
      state: claim.state || '',
      zip: claim.zip || '',
      lat: claim.lat || null,
      lng: claim.lng || null,
      vin: claim.vin || '',
      vehicleYear: claim.vehicle_year || null,
      vehicleMake: claim.vehicle_make || '',
      vehicleModel: claim.vehicle_model || '',
      status: claim.status || '',
      appointmentStart: claim.appointment_start || null
    };
    const jsonString = JSON.stringify(payload);
    e.dataTransfer.setData('application/json', jsonString);
    e.dataTransfer.setData('text/plain', jsonString);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => { setDraggingClaimId(null); };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(rows.map(r => r.id)));
  };

  const handleBulkAssign = async () => {
    if (!bulkAppraiser) return;
    setBulkLoading(true);
    try {
      const { error } = await supabaseCD.from("claims").update({ assigned_to: bulkAppraiser }).in("id", Array.from(selectedIds));
      if (error) throw error;
      setBulkAction(null);
      setBulkAppraiser("");
      setSelectedIds(new Set());
      load();
    } catch (err: any) {
      alert(`Error assigning claims: ${err.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkComplete = async () => {
    setBulkLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const { error } = await supabaseCD.from("claims").update({
        status: "COMPLETED",
        completion_date: `${year}-${month}-${day}T00:00:00Z`,
        completed_month: `${year}-${month}`,
        payout_status: "unpaid",
      }).in("id", Array.from(selectedIds));
      if (error) throw error;
      setBulkAction(null);
      setSelectedIds(new Set());
      load();
    } catch (err: any) {
      alert(`Error completing claims: ${err.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    initializeAuth();
    loadProfiles();
    getCurrentFirmId().then(setFirmId);
    (async () => {
      const { data } = await supabaseCD.from("profiles").select("user_id, full_name").eq("role", "appraiser").order("full_name");
      if (data) setAppraisers(data);
    })();
  }, []);

  // Sync calendar view with route changes
  useEffect(() => { setShowCalendar(isCalendarRoute); }, [isCalendarRoute]);

  useEffect(() => {
    if (authzInitialized) {
      load();
      const authz = getSupabaseAuthz();
      if (authz?.isInitialized) {
        const ch = supabaseCD
          .channel("claims-list")
          .on("postgres_changes", { event: "*", schema: "public", table: "claims" }, () => load())
          .subscribe();
        return () => { supabaseCD.removeChannel(ch); };
      }
    }
  }, [showArchived, authzInitialized]);

  // Compute tab counts client-side from allClaims
  useEffect(() => {
    const active = allClaims.filter(c => c.status !== "COMPLETED" && c.status !== "CANCELED");
    setTabCounts({
      all_active: active.length,
      needs_scheduling: active.filter(c => !c.appointment_start).length,
      in_progress: allClaims.filter(c => ["SCHEDULED", "IN_PROGRESS", "WRITING"].includes(c.status)).length,
      completed: allClaims.filter(c => c.status === "COMPLETED").length,
    });
    applyFilters(allClaims, activeTab, selectedStatus, searchQuery);
    setSelectedIds(new Set());
  }, [allClaims, activeTab, selectedStatus, searchQuery, applyFilters]);

  if (loading) {
    return <div className="claims__loading">Loading claims...</div>;
  }

  if (error) {
    return (
      <div className="claims__error">
        <div className="claims__error-box">
          <h3>Unable to load claims</h3>
          <p>{error}</p>
          <button className="btn btn--danger btn--sm" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statusCounts = activeTab !== "completed"
    ? allClaims.reduce((acc, claim) => {
        const status = claim.status || "UNASSIGNED";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {};

  const unassignedCount = allClaims.filter((r) => !r.assigned_to).length;

  const groupClaimsByFirm = () => {
    const groups: Record<string, Claim[]> = {};
    rows.forEach(claim => {
      const firmName = claim.firm || "No Firm";
      if (!groups[firmName]) groups[firmName] = [];
      groups[firmName].push(claim);
    });
    return groups;
  };

  const firmGroups = groupClaimsByFirm();
  const getPendingCountForFirm = (claims: Claim[]) =>
    claims.filter(c => c.status !== "COMPLETED" && c.status !== "CANCELED").length;

  const authz = getSupabaseAuthz();
  const userInfo = authz?.getCurrentUser();
  const isAdmin = userInfo?.role === "admin" || userInfo?.role === "dispatch";

  const STATUS_FILTERS: { key: ClaimStatus; label: string; count: number }[] = [
    { key: "ALL", label: "All Active", count: allClaims.length },
    { key: "UNASSIGNED", label: "Unassigned", count: unassignedCount },
    { key: "SCHEDULED", label: "Scheduled", count: statusCounts.SCHEDULED || 0 },
    { key: "IN_PROGRESS", label: "In Progress", count: statusCounts.IN_PROGRESS || 0 },
    { key: "WRITING", label: "Writing", count: statusCounts.WRITING || 0 },
    { key: "COMPLETED", label: "Completed", count: statusCounts.COMPLETED || 0 },
    { key: "CANCELED", label: "Canceled", count: statusCounts.CANCELED || 0 },
  ];

  const pageTitle = showCalendar
    ? "Monthly Scheduling Calendar"
    : showArchived
    ? "Archived Claims"
    : "Active Claims";

  return (
    <div>
      <NavBar role={role || "admin"} />
      <PageHeader
        label="Cipher Dispatch"
        title={pageTitle}
        sub={`${allClaims.length} claims loaded`}
      />

      <div className="claims">
        {/* Pipeline tabs */}
        {!showArchived && !showCalendar && (
          <div className="claims__tab-bar">
            {PIPELINE_TABS.map((t) => (
              <button
                key={t.key}
                className={`claims__tab${activeTab === t.key ? " claims__tab--active" : ""}`}
                onClick={() => {
                  setActiveTab(t.key);
                  setSelectedStatus("ALL");
                }}
              >
                {t.label}
                <span className="claims__tab-badge">{tabCounts[t.key]}</span>
              </button>
            ))}
          </div>
        )}

        {/* Status filter pills (hidden on completed tab) */}
        {!showArchived && !showCalendar && activeTab !== "completed" && (
          <div className="claims__status-bar">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                className={`claims__status-pill${selectedStatus === f.key ? " claims__status-pill--active" : ""}`}
                onClick={() => setSelectedStatus(f.key)}
              >
                <span className="claims__status-num">{f.count}</span>
                <span className="claims__status-label">{f.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="claims__toolbar">
          <div className="claims__toolbar-left">
            <input
              type="text"
              className="claims__search"
              placeholder="Search claim #, customer, firm, VIN, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="claims__toolbar-right">
            {!showCalendar && !showArchived && activeTab !== "completed" && rows.length > 0 && (
              <button className="btn btn--ghost btn--sm" onClick={toggleSelectAll}>
                {selectedIds.size === rows.length ? "Deselect All" : "Select All"}
              </button>
            )}
            <button
              className={`btn btn--sm ${showCalendar ? "btn--primary" : "btn--ghost"}`}
              onClick={() => {
                setShowCalendar(!showCalendar);
                if (showArchived) setShowArchived(false);
                setSelectedStatus("ALL");
              }}
            >
              {showCalendar ? "List View" : "Calendar View"}
            </button>
            <Link to="/admin/claims/new" className="btn btn--primary btn--sm">
              + New Claim
            </Link>
          </div>
        </div>

        {/* Content area */}
        {showCalendar && !showArchived ? (
          isMobile ? (
            <MobileAgendaView claims={allClaims} onClaimUpdate={load} />
          ) : (
            <MonthlyCalendar claims={allClaims} onClaimUpdate={load} />
          )
        ) : rows.length === 0 ? (
          <div className="claims__empty">No claims found matching your filters.</div>
        ) : activeTab === "completed" ? (
          <div className="claims__completed-wrap">
            <table className="claims__completed-table">
              <thead>
                <tr>
                  <th>Claim #</th>
                  <th>Customer</th>
                  <th>Firm</th>
                  <th>Type</th>
                  <th className="claims__completed-th--right">File Total</th>
                  <th>Created</th>
                  <th>Completed</th>
                  <th className="claims__completed-th--right">Cycle</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="claims__completed-row">
                    <td>
                      <Link to={`/claim/${r.id}`} className="claims__completed-link">
                        #{r.claim_number}
                      </Link>
                    </td>
                    <td className="claims__completed-name">{r.customer_name}</td>
                    <td className="claims__completed-firm">{r.firm || "---"}</td>
                    <td className="claims__completed-type">
                      {(r.claim_type || "auto").replace(/_/g, " ")}
                    </td>
                    <td className="claims__completed-amount">
                      {r.file_total != null ? `$${Number(r.file_total).toFixed(2)}` : "---"}
                    </td>
                    <td className="claims__completed-date">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "---"}
                    </td>
                    <td className="claims__completed-date">
                      {r.completed_at ? new Date(r.completed_at).toLocaleDateString() : "---"}
                    </td>
                    <td className="claims__cycle-time">
                      {calcCycleTime(r.created_at, r.completed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isMobile ? (
          <MobileClaimsList claims={rows} showCreateButton={true} createButtonPath="/admin/claims/new" />
        ) : (
          <div>
            {Object.entries(firmGroups).map(([firmName, claims]) => {
              const pendingCount = getPendingCountForFirm(claims);
              const firmColor = getFirmColor(firmName);

              return (
                <div key={firmName} className="claims__firm-group">
                  <div className="claims__firm-header" style={{ borderBottomColor: firmColor }}>
                    <span className="claims__firm-dot" style={{ background: firmColor }} />
                    <span>{firmName}</span>
                    {pendingCount > 0 && (
                      <span className="claims__firm-pending">{pendingCount} pending</span>
                    )}
                    <span className="claims__firm-total">({claims.length} total)</span>
                  </div>

                  <div className="claims__grid">
                    {claims.map((r) => (
                      <Link
                        key={r.id}
                        to={`/claim/${r.id}`}
                        className={`claims__card${draggingClaimId === r.id ? " claims__card--dragging" : ""}${selectedIds.has(r.id) ? " claims__card--selected" : ""}`}
                        style={{ borderLeftColor: firmColor }}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, r)}
                        onDragEnd={handleDragEnd}
                      >
                        <div
                          className="claims__card-select"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelect(r.id); }}
                        >
                          <div className={`claims__checkbox${selectedIds.has(r.id) ? " claims__checkbox--checked" : ""}`} />
                        </div>
                        <div className="claims__card-header">
                          <div className="claims__card-number">#{r.claim_number}</div>
                          <div className="claims__card-badges">
                            <span className={`claims__badge ${getStatusBadgeClass(r.status)}`}>
                              {r.status || "UNASSIGNED"}
                            </span>
                            {r.firm && (
                              <span className="claims__badge" style={{ background: firmColor }}>
                                {r.firm}
                              </span>
                            )}
                            {r.pipeline_stage && r.pipeline_stage !== "received" && (
                              <span className="claims__badge claims__badge--note">
                                {r.pipeline_stage.replace(/_/g, " ")}
                              </span>
                            )}
                            {r.notes && (
                              <span className="claims__badge claims__badge--note" title={r.notes.substring(0, 100)}>
                                Note
                              </span>
                            )}
                            {(r.at_risk_unassigned || r.at_risk_inspection || r.at_risk_appraisal) && (
                              <span className="claims__badge claims__badge--at-risk">
                                AT RISK
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="claims__card-section">
                          <div className="claims__card-section-label">Customer</div>
                          <div className="claims__card-section-value">{r.customer_name}</div>
                        </div>

                        <div className="claims__card-section">
                          <div className="claims__card-section-label">Appointment</div>
                          {r.appointment_start ? (
                            <div className="claims__card-section-value">
                              {new Date(r.appointment_start).toLocaleDateString("en-US", {
                                weekday: "short", month: "short", day: "numeric",
                                year: "numeric", hour: "numeric", minute: "2-digit",
                                timeZone: getTimezoneForState(r.state),
                              })}
                            </div>
                          ) : (
                            <div className="claims__card-section-empty">No appointment scheduled</div>
                          )}
                        </div>

                        <div className="claims__card-section">
                          <div className="claims__card-section-label">Vehicle</div>
                          {r.vehicle_year || r.vehicle_make || r.vehicle_model ? (
                            <div className="claims__card-section-value">
                              {r.vehicle_year && `${r.vehicle_year} `}
                              {r.vehicle_make && `${r.vehicle_make} `}
                              {r.vehicle_model}
                            </div>
                          ) : (
                            <div className="claims__card-section-empty">No vehicle info</div>
                          )}
                        </div>

                        <div className="claims__card-section">
                          <div className="claims__card-section-label">Assigned</div>
                          <div className="claims__card-section-value">
                            {r.assigned_to ? (profileMap[r.assigned_to] || "Unknown User") : "Unassigned"}
                          </div>
                        </div>

                        {isAdmin && r.status !== "COMPLETED" && r.status !== "CANCELED" && (
                          confirmingCompleteId === r.id ? (
                            <div className="claims__quick-complete" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                              <button
                                className="btn btn--primary btn--sm"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleQuickComplete(r.id); }}
                              >
                                Confirm
                              </button>
                              <button
                                className="btn btn--ghost btn--sm"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmingCompleteId(null); }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="claims__complete-btn"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmingCompleteId(r.id); }}
                            >
                              Mark Complete
                            </button>
                          )
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="claims__bulk-bar">
          <span className="claims__bulk-count">{selectedIds.size} selected</span>
          <button className="btn btn--primary btn--sm" onClick={() => setBulkAction("assign")}>
            Assign To
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setBulkAction("complete")}>
            Mark Complete
          </button>
          <button className="btn btn--danger btn--sm" onClick={() => setSelectedIds(new Set())}>
            Clear
          </button>
        </div>
      )}

      {/* Bulk Assign modal */}
      {bulkAction === "assign" && (
        <div className="claims__modal-overlay" onClick={() => setBulkAction(null)}>
          <div className="claims__modal" onClick={(e) => e.stopPropagation()}>
            <div className="claims__modal-header">
              <div>
                <div className="claims__modal-eyebrow">Bulk Action</div>
                <div className="claims__modal-title">Assign {selectedIds.size} Claims</div>
              </div>
              <button className="claims__modal-close" onClick={() => setBulkAction(null)}>&#x2715;</button>
            </div>
            <div className="claims__modal-body">
              <label className="claims__modal-label">Select Appraiser</label>
              <select className="claims__modal-select" value={bulkAppraiser} onChange={(e) => setBulkAppraiser(e.target.value)}>
                <option value="">-- Select Appraiser --</option>
                {appraisers.map(a => (
                  <option key={a.user_id} value={a.user_id}>{a.full_name}</option>
                ))}
              </select>
            </div>
            <div className="claims__modal-footer">
              <button className="btn btn--ghost" onClick={() => setBulkAction(null)}>Cancel</button>
              <button className="btn btn--primary" disabled={!bulkAppraiser || bulkLoading} onClick={handleBulkAssign}>
                {bulkLoading ? "Assigning..." : "Assign All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Complete modal */}
      {bulkAction === "complete" && (
        <div className="claims__modal-overlay" onClick={() => setBulkAction(null)}>
          <div className="claims__modal" onClick={(e) => e.stopPropagation()}>
            <div className="claims__modal-header">
              <div>
                <div className="claims__modal-eyebrow">Bulk Action</div>
                <div className="claims__modal-title">Complete {selectedIds.size} Claims</div>
              </div>
              <button className="claims__modal-close" onClick={() => setBulkAction(null)}>&#x2715;</button>
            </div>
            <div className="claims__modal-body">
              <p className="claims__modal-warn">
                This will mark {selectedIds.size} claim{selectedIds.size > 1 ? "s" : ""} as COMPLETED with today's date. This action cannot be undone.
              </p>
            </div>
            <div className="claims__modal-footer">
              <button className="btn btn--ghost" onClick={() => setBulkAction(null)}>Cancel</button>
              <button className="btn btn--primary" disabled={bulkLoading} onClick={handleBulkComplete}>
                {bulkLoading ? "Completing..." : "Complete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
