import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link, useSearchParams } from "react-router-dom";
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
  address_line1?: string;
  city?: string;
  state?: string;
  zip?: string | null;
  lat?: number;
  lng?: number;
  pay_amount?: number | null;
  file_total?: number | null;
  profiles?: {
    full_name?: string;
  } | null;
};

type ClaimStatus = "UNASSIGNED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ALL";

function getStatusBadgeClass(status?: string): string {
  switch (status) {
    case "SCHEDULED": return "claims__badge--scheduled";
    case "IN_PROGRESS": return "claims__badge--progress";
    case "COMPLETED": return "claims__badge--completed";
    case "CANCELED": return "claims__badge--canceled";
    default: return "claims__badge--status";
  }
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
  const [showCalendar, setShowCalendar] = useState(
    searchParams.get("view") === "calendar"
  );
  const [selectedStatus, setSelectedStatus] = useState<ClaimStatus>("ALL");
  const [draggingClaimId, setDraggingClaimId] = useState<string | null>(null);

  const isMobile = useIsMobile();

  const initializeAuth = async () => {
    try {
      await initializeSupabaseAuthz(supabase);
      setAuthzInitialized(true);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const load = async () => {
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
        .select(
          "id,claim_number,customer_name,status,vin,vehicle_year,vehicle_make,vehicle_model,assigned_to,appointment_start,appointment_end,firm,notes,created_at,address_line1,city,state,zip,lat,lng,pay_amount,file_total,full_name"
        )
        .order("created_at", { ascending: false });

      query = authz.scopedClaimsQuery(query);
      query = query.gte('created_at', '2025-12-01T00:00:00.000Z');
      query = query.or("status.is.null,status.in.(SCHEDULED,IN_PROGRESS,COMPLETED)");

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (claims: Claim[]) => {
    let filtered = [...claims];
    if (selectedStatus !== "ALL") {
      if (selectedStatus === "UNASSIGNED") {
        filtered = filtered.filter(claim => !claim.assigned_to);
      } else {
        filtered = filtered.filter(claim => claim.status === selectedStatus);
      }
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
  }, [showArchived, authzInitialized]);

  useEffect(() => {
    if (allClaims.length > 0) applyFilters(allClaims);
  }, [selectedStatus, allClaims]);

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

  const statusCounts = allClaims.reduce((acc, claim) => {
    const status = claim.status || "UNASSIGNED";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
  const isAdmin = userInfo?.role === "admin";

  const STATUS_FILTERS: { key: ClaimStatus; label: string; count: number }[] = [
    { key: "ALL", label: "All Active", count: allClaims.length },
    { key: "UNASSIGNED", label: "Unassigned", count: unassignedCount },
    { key: "SCHEDULED", label: "Scheduled", count: statusCounts.SCHEDULED || 0 },
    { key: "IN_PROGRESS", label: "In Progress", count: statusCounts.IN_PROGRESS || 0 },
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
      <NavBar role="admin" />
      <PageHeader
        label="Cipher Dispatch"
        title={pageTitle}
        sub={`${allClaims.length} claims loaded`}
      />

      <div className="claims">
        {/* Status filter pills */}
        {!showArchived && !showCalendar && (
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
