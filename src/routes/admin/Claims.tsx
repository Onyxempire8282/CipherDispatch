import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import {
  initializeSupabaseAuthz,
  getSupabaseAuthz,
} from "../../lib/supabaseAuthz";
import { getFirmColor } from "../../constants/firmColors";
import { downloadClaimsCSV } from "../../utils/csvExport";
import { getPhotoUrlWithFallback } from "../../utils/uploadManager";
import MonthlyCalendar from "../../components/claims/MonthlyCalendar";
import MobileAgendaView from "../../components/claims/MobileAgendaView";
import MobileClaimsList from "../../components/claims/MobileClaimsList";
import { NavBar } from "../../components/NavBar";
import { useRole } from "../../hooks/useRole";
import PageHeader from "../../components/ui/PageHeader";
import { useIsMobile } from "../../hooks/useIsMobile";
import JSZip from "jszip";
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
  const [showCalendar, setShowCalendar] = useState(
    searchParams.get("view") === "calendar" || routeLocation.pathname === "/calendar"
  );
  const [activeTab, setActiveTab] = useState<PipelineTab>("all_active");
  const [tabCounts, setTabCounts] = useState<Record<PipelineTab, number>>({
    all_active: 0, needs_scheduling: 0, in_progress: 0, completed: 0,
  });
  const [selectedStatus, setSelectedStatus] = useState<ClaimStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [draggingClaimId, setDraggingClaimId] = useState<string | null>(null);

  const isMobile = useIsMobile();
  const { role } = useRole();

  const initializeAuth = async () => {
    try {
      await initializeSupabaseAuthz(supabase);
      setAuthzInitialized(true);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadTabCounts = useCallback(async () => {
    const authz = getSupabaseAuthz();
    if (!authz?.isInitialized) return;

    const baseQuery = () => {
      let q = supabase.from("claims_v").select("id", { count: "exact", head: true });
      q = authz.scopedClaimsQuery(q);
      q = q.gte("created_at", "2025-12-01T00:00:00.000Z");
      q = q.is("archived_at", null);
      return q;
    };

    const [allActive, needsSched, inProg, completed] = await Promise.all([
      baseQuery().not("status", "in", '("COMPLETED","CANCELED")'),
      baseQuery()
        .not("status", "in", '("COMPLETED","CANCELED")')
        .or("assigned_to.is.null,appointment_start.is.null"),
      baseQuery().in("status", ["SCHEDULED", "IN_PROGRESS", "WRITING"]),
      baseQuery().eq("status", "COMPLETED"),
    ]);

    setTabCounts({
      all_active: allActive.count ?? 0,
      needs_scheduling: needsSched.count ?? 0,
      in_progress: inProg.count ?? 0,
      completed: completed.count ?? 0,
    });
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

      let query = supabase
        .from("claims_v")
        .select("*")
        .order("created_at", { ascending: false });

      query = authz.scopedClaimsQuery(query);
      query = query.gte("created_at", "2025-12-01T00:00:00.000Z");
      query = query.is("archived_at", null);

      // Server-side filter by active tab
      switch (activeTab) {
        case "all_active":
          query = query.not("status", "in", '("COMPLETED","CANCELED")');
          break;
        case "needs_scheduling":
          query = query.not("status", "in", '("COMPLETED","CANCELED")');
          query = query.or("assigned_to.is.null,appointment_start.is.null");
          break;
        case "in_progress":
          query = query.in("status", ["SCHEDULED", "IN_PROGRESS", "WRITING"]);
          break;
        case "completed":
          query = query.eq("status", "COMPLETED");
          break;
      }

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
      applyFilters(claims);
      loadTabCounts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authzInitialized, activeTab, loadTabCounts]);

  const applyFilters = (claims: Claim[]) => {
    let filtered = [...claims];
    if (selectedStatus !== "ALL" && activeTab !== "completed") {
      if (selectedStatus === "UNASSIGNED") {
        filtered = filtered.filter(claim => !claim.assigned_to);
      } else {
        filtered = filtered.filter(claim => claim.status === selectedStatus);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(claim =>
        (claim.claim_number || "").toLowerCase().includes(q) ||
        (claim.customer_name || "").toLowerCase().includes(q) ||
        (claim.firm || "").toLowerCase().includes(q) ||
        (claim.vin || "").toLowerCase().includes(q) ||
        (claim.city || "").toLowerCase().includes(q)
      );
    }
    setRows(filtered);
  };

  const downloadClaimPhotos = async (claimId: string, claimNumber: string) => {
    try {
      const { data: photos, error } = await supabase
        .from("claim_photos")
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: false });

      if (error) { alert(`Error fetching photos: ${error.message}`); return; }
      if (!photos || photos.length === 0) { alert("No photos to download for this claim"); return; }

      const zip = new JSZip();
      const photoFolder = zip.folder("photos");

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const photoUrl = getPhotoUrlWithFallback(photo.storage_path);
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        photoFolder?.file(`photo-${i + 1}.jpg`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `claim_${claimNumber}_photos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(`Error creating zip file: ${error.message}`);
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

  useEffect(() => { initializeAuth(); }, []);

  useEffect(() => {
    if (authzInitialized) {
      load();
      const authz = getSupabaseAuthz();
      if (authz?.isInitialized) {
        const ch = supabase
          .channel("claims-list")
          .on("postgres_changes", { event: "*", schema: "public", table: "claims" }, () => load())
          .subscribe();
        return () => { supabase.removeChannel(ch); };
      }
    }
  }, [showArchived, authzInitialized, activeTab]);

  useEffect(() => {
    if (allClaims.length > 0) applyFilters(allClaims);
  }, [selectedStatus, searchQuery, allClaims]);

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
            <Link to="/" className="btn btn--ghost btn--sm">Home</Link>
            <input
              type="text"
              className="claims__search"
              placeholder="Search claim #, customer, firm, VIN, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="claims__toolbar-right">
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
            <button
              className={`btn btn--sm ${showArchived ? "btn--ghost" : "btn--steel"}`}
              onClick={() => {
                setShowArchived(!showArchived);
                if (showCalendar) setShowCalendar(false);
                setSelectedStatus("ALL");
              }}
            >
              {showArchived ? "View Active" : "View Archived"}
            </button>
            {showArchived && (
              <button className="btn btn--steel btn--sm" onClick={() => downloadClaimsCSV(rows)}>
                Download CSV
              </button>
            )}
            <Link to="/admin/claims/new" className="btn btn--primary btn--sm">
              + New Claim
            </Link>
          </div>
        </div>

        {/* Content area */}
        {showCalendar && !showArchived ? (
          isMobile ? (
            <MobileAgendaView claims={rows} onClaimUpdate={load} />
          ) : (
            <MonthlyCalendar claims={rows} onClaimUpdate={load} />
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
                        className={`claims__card${draggingClaimId === r.id ? " claims__card--dragging" : ""}`}
                        style={{ borderLeftColor: firmColor }}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, r)}
                        onDragEnd={handleDragEnd}
                      >
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
                            {r.profiles?.full_name || (r.assigned_to ? "Unknown User" : "Unassigned")}
                          </div>
                        </div>

                        {isAdmin && (
                          <button
                            className="claims__download-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              downloadClaimPhotos(r.id, r.claim_number);
                            }}
                          >
                            Download Photos (ZIP)
                          </button>
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
    </div>
  );
}
