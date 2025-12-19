import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link, useSearchParams } from "react-router-dom";
import {
  initializeSupabaseAuthz,
  getSupabaseAuthz,
} from "../../lib/supabaseAuthz";
import { getFirmColor } from "../../constants/firmColors";
import { downloadClaimsCSV } from "../../utils/csvExport";
import MonthlyCalendar from "../../components/claims/MonthlyCalendar";
import PayoutForecast from "../../components/admin/PayoutForecast";
import JSZip from "jszip";

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
  firm_name?: string;
  notes?: string;
  created_at?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  lat?: number;
  lng?: number;
  pay_amount?: number | null;
  file_total?: number | null;
  profiles?: {
    full_name?: string;
  } | null;
};

type ClaimStatus = "UNASSIGNED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ALL";

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
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ClaimStatus>("ALL");
  const [draggingClaimId, setDraggingClaimId] = useState<string | null>(null);

  const initializeAuth = async () => {
    try {
      console.log("Initializing authorization for Claims component...");
      await initializeSupabaseAuthz(supabase);
      setAuthzInitialized(true);
      console.log("Authorization initialized successfully");
    } catch (err: any) {
      console.error("Authorization initialization failed:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const load = async () => {
    if (!authzInitialized) {
      console.log("Authorization not ready, skipping load");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const authz = getSupabaseAuthz();
      if (!authz || !authz.isInitialized) {
        throw new Error("Authorization not properly initialized");
      }

      const userInfo = authz.getCurrentUser();
      console.log(
        `Loading claims for ${userInfo?.role}: ${userInfo?.fullName}`
      );

      // Create base query with profile join to get appraiser name
      let query = supabase
        .from("claims")
        .select(
          "id,claim_number,customer_name,status,vin,vehicle_year,vehicle_make,vehicle_model,assigned_to,appointment_start,appointment_end,firm_name,notes,created_at,address_line1,city,state,postal_code,lat,lng,pay_amount,file_total,profiles:assigned_to(full_name)"
        )
        .order("created_at", { ascending: false });

      // Apply role-based scoping
      query = authz.scopedClaimsQuery(query);

      // Apply archived filtering - only show CANCELED claims when archived view is active
      if (showArchived) {
        // Show only canceled claims in "archived" view
        query = query.eq("status", "CANCELED");
      } else {
        // Show all active claims (COMPLETED is in active view but can be filtered separately)
        query = query.or("status.is.null,status.in.(SCHEDULED,IN_PROGRESS,COMPLETED)");
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error("Error loading claims:", queryError);

        // Use centralized error handling
        const errorResponse = authz.handleAuthError(queryError);
        if (errorResponse.shouldRedirect) {
          // Handle redirect in React context
          setError(`${errorResponse.message} Redirecting to login...`);
          setTimeout(() => {
            window.location.href = "/CipherDispatch/";
          }, 2000);
          return;
        }

        throw new Error(errorResponse.message);
      }

      console.log(`Loaded ${data?.length || 0} claims for ${userInfo?.role}`);
      const claims = (data as Claim[]) || [];
      setAllClaims(claims);
      applyFilters(claims);
    } catch (err: any) {
      console.error("Error in load function:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (claims: Claim[]) => {
    let filtered = [...claims];

    // Apply status filter
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
      // Fetch photos for this claim
      const { data: photos, error } = await supabase
        .from("claim_photos")
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: false });

      if (error) {
        alert(`Error fetching photos: ${error.message}`);
        return;
      }

      if (!photos || photos.length === 0) {
        alert("No photos to download for this claim");
        return;
      }

      const zip = new JSZip();
      const photoFolder = zip.folder("photos");

      // Fetch all photos and add to zip
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const photoUrl = supabase.storage
          .from("claim-photos")
          .getPublicUrl(photo.storage_path).data.publicUrl;

        // Fetch photo as blob
        const response = await fetch(photoUrl);
        const blob = await response.blob();

        // Add to zip with sequential naming
        const filename = `photo-${i + 1}.jpg`;
        photoFolder?.file(filename, blob);
      }

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Create download link and trigger download
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

  // Drag-and-drop handlers for cross-window dragging
  const handleDragStart = (e: React.DragEvent, claim: Claim) => {
    setDraggingClaimId(claim.id);

    // Construct payload for cross-window drop
    const payload = {
      id: claim.id,
      claimNumber: claim.claim_number,
      firmName: claim.firm_name || '',
      customerName: claim.customer_name,
      addressLine1: claim.address_line1 || '',
      city: claim.city || '',
      state: claim.state || '',
      zip: claim.postal_code || '',
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

    // Set data in multiple formats for cross-window compatibility
    e.dataTransfer.setData('application/json', jsonString);
    e.dataTransfer.setData('text/plain', jsonString);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggingClaimId(null);
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (authzInitialized) {
      load();

      // Set up real-time subscription with proper scoping
      const authz = getSupabaseAuthz();
      if (authz?.isInitialized) {
        const ch = supabase
          .channel("claims-list")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "claims" },
            () => {
              console.log("Real-time update received, reloading claims...");
              load();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(ch);
        };
      }
    }
  }, [showArchived, authzInitialized]);

  // Re-apply filters when filter state changes
  useEffect(() => {
    if (allClaims.length > 0) {
      applyFilters(allClaims);
    }
  }, [selectedStatus, allClaims]);

  // Show loading state
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
          padding: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#e2e8f0", fontSize: "18px" }}>
          Loading claims...
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
          padding: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: "#ef4444",
            fontSize: "18px",
            textAlign: "center",
            background: "#2d3748",
            padding: "24px",
            borderRadius: "8px",
            border: "2px solid #ef4444",
          }}
        >
          <h3>Unable to load claims</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "6px",
              cursor: "pointer",
              marginTop: "12px",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate status counts from ALL claims (not filtered)
  const statusCounts = allClaims.reduce((acc, claim) => {
    const status = claim.status || "UNASSIGNED";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unassignedCount = allClaims.filter((r) => !r.assigned_to).length;

  // Group claims by firm
  const groupClaimsByFirm = () => {
    const groups: Record<string, Claim[]> = {};

    rows.forEach(claim => {
      const firmName = claim.firm_name || "No Firm";
      if (!groups[firmName]) {
        groups[firmName] = [];
      }
      groups[firmName].push(claim);
    });

    return groups;
  };

  const firmGroups = groupClaimsByFirm();

  // Calculate pending claims per firm (exclude COMPLETED and CANCELED)
  const getPendingCountForFirm = (claims: Claim[]) => {
    return claims.filter(c => c.status !== "COMPLETED" && c.status !== "CANCELED").length;
  };

  // Check if current user is admin
  const authz = getSupabaseAuthz();
  const userInfo = authz?.getCurrentUser();
  const isAdmin = userInfo?.role === "admin";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
        padding: 16,
      }}
    >
      {/* Status Summary Pills */}
      {!showArchived && !showCalendar && (
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => setSelectedStatus("ALL")}
            style={{
              padding: "12px 20px",
              background: selectedStatus === "ALL" ? "#667eea" : "#374151",
              color: "white",
              border: selectedStatus === "ALL" ? "2px solid #818cf8" : "2px solid transparent",
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition: "all 0.2s",
              minWidth: "120px",
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: 4 }}>
              {allClaims.length}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>All Active</div>
          </button>
          <button
            onClick={() => setSelectedStatus("UNASSIGNED")}
            style={{
              padding: "12px 20px",
              background: selectedStatus === "UNASSIGNED" ? "#9E9E9E" : "#374151",
              color: "white",
              border: selectedStatus === "UNASSIGNED" ? "2px solid #bdbdbd" : "2px solid transparent",
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition: "all 0.2s",
              minWidth: "120px",
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: 4 }}>
              {unassignedCount}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>Unassigned</div>
          </button>
          <button
            onClick={() => setSelectedStatus("SCHEDULED")}
            style={{
              padding: "12px 20px",
              background: selectedStatus === "SCHEDULED" ? "#2196F3" : "#374151",
              color: "white",
              border: selectedStatus === "SCHEDULED" ? "2px solid #64b5f6" : "2px solid transparent",
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition: "all 0.2s",
              minWidth: "120px",
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: 4 }}>
              {statusCounts.SCHEDULED || 0}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>Scheduled</div>
          </button>
          <button
            onClick={() => setSelectedStatus("IN_PROGRESS")}
            style={{
              padding: "12px 20px",
              background: selectedStatus === "IN_PROGRESS" ? "#FF9800" : "#374151",
              color: "white",
              border: selectedStatus === "IN_PROGRESS" ? "2px solid #ffb74d" : "2px solid transparent",
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition: "all 0.2s",
              minWidth: "120px",
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: 4 }}>
              {statusCounts.IN_PROGRESS || 0}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>In Progress</div>
          </button>
          <button
            onClick={() => setSelectedStatus("COMPLETED")}
            style={{
              padding: "12px 20px",
              background: selectedStatus === "COMPLETED" ? "#4CAF50" : "#374151",
              color: "white",
              border: selectedStatus === "COMPLETED" ? "2px solid #81c784" : "2px solid transparent",
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition: "all 0.2s",
              minWidth: "120px",
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: 4 }}>
              {statusCounts.COMPLETED || 0}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>Completed</div>
          </button>
          <button
            onClick={() => setSelectedStatus("CANCELED")}
            style={{
              padding: "12px 20px",
              background: selectedStatus === "CANCELED" ? "#ef4444" : "#374151",
              color: "white",
              border: selectedStatus === "CANCELED" ? "2px solid #f87171" : "2px solid transparent",
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition: "all 0.2s",
              minWidth: "120px",
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: 4 }}>
              {statusCounts.CANCELED || 0}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>Canceled</div>
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Link
            to="/"
            style={{
              padding: "8px 16px",
              background: "#4a5568",
              color: "white",
              textDecoration: "none",
              borderRadius: 4,
              fontWeight: "bold",
            }}
          >
            ← Home
          </Link>
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: "20px" }}>
            {showCalendar ? "Monthly Scheduling Calendar" : showArchived ? "Archived Claims" : "Active Claims"}
          </h3>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setShowCalendar(!showCalendar);
              if (showArchived) setShowArchived(false);
              setSelectedStatus("ALL");
            }}
            style={{
              padding: "8px 16px",
              background: showCalendar ? "#667eea" : "#4a5568",
              color: "white",
              border: "none",
              borderRadius: 4,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {showCalendar ? "📋 List View" : "📅 Calendar View"}
          </button>
          <button
            onClick={() => {
              setShowArchived(!showArchived);
              if (showCalendar) setShowCalendar(false);
              setSelectedStatus("ALL");
            }}
            style={{
              padding: "8px 16px",
              background: showArchived ? "#4a5568" : "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: 4,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {showArchived ? "← View Active Claims" : "📦 View Archived"}
          </button>
          {showArchived && (
            <button
              onClick={() => downloadClaimsCSV(rows)}
              style={{
                padding: "8px 16px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: 4,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              📥 Download CSV
            </button>
          )}
          <Link
            to="/admin/claims/new"
            style={{
              padding: "8px 16px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              textDecoration: "none",
              borderRadius: 4,
              fontWeight: "bold",
            }}
          >
            + New Claim
          </Link>
        </div>
      </div>

      {/* Payout Forecast - Admin Only */}
      {isAdmin && !showArchived && (
        <div style={{ marginBottom: 24 }}>
          <PayoutForecast claims={allClaims} />
        </div>
      )}

      {/* Calendar View */}
      {showCalendar && !showArchived ? (
        <MonthlyCalendar claims={rows} onClaimUpdate={load} />
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#a0aec0" }}>
          No claims found matching your filters.
        </div>
      ) : (
        /* List View - Grouped by Firm */
        <div>
          {Object.entries(firmGroups).map(([firmName, claims]) => {
            const pendingCount = getPendingCountForFirm(claims);

            return (
              <div key={firmName} style={{ marginBottom: 32 }}>
                {/* Firm Header */}
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#e2e8f0",
                    marginBottom: 16,
                    paddingBottom: 8,
                    borderBottom: `3px solid ${getFirmColor(firmName)}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: getFirmColor(firmName),
                      }}
                    />
                    <span>{firmName}</span>
                  </div>
                  {pendingCount > 0 && (
                    <span
                      style={{
                        fontSize: "14px",
                        opacity: 0.7,
                        fontWeight: "normal",
                        background: "#374151",
                        padding: "4px 12px",
                        borderRadius: 12,
                      }}
                    >
                      {pendingCount} pending
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: "14px",
                      opacity: 0.7,
                      fontWeight: "normal",
                    }}
                  >
                    ({claims.length} total)
                  </span>
                </div>

                {/* Claims Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: 16,
                  }}
                >
                  {claims.map((r) => (
          <Link
            key={r.id}
            to={`/claim/${r.id}`}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, r)}
            onDragEnd={handleDragEnd}
            style={{
              border: "1px solid #4a5568",
              borderLeft: `4px solid ${getFirmColor(r.firm_name)}`,
              borderRadius: 8,
              padding: 16,
              background: "#2d3748",
              boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
              textDecoration: "none",
              color: "#e2e8f0",
              transition: "transform 0.2s, box-shadow 0.2s, opacity 0.2s",
              cursor: draggingClaimId === r.id ? "grabbing" : "pointer",
              opacity: draggingClaimId === r.id ? 0.5 : 1,
            }}
            onMouseOver={(e) => {
              if (draggingClaimId !== r.id) {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.7)";
              }
            }}
            onMouseOut={(e) => {
              if (draggingClaimId !== r.id) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.5)";
              }
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  marginBottom: 8,
                  color: "#e2e8f0",
                }}
              >
                #{r.claim_number}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: "bold",
                    background:
                      r.status === "COMPLETED"
                        ? "#4CAF50"
                        : r.status === "IN_PROGRESS"
                        ? "#FF9800"
                        : r.status === "SCHEDULED"
                        ? "#2196F3"
                        : r.status === "CANCELED"
                        ? "#ef4444"
                        : "#9E9E9E",
                    color: "white",
                  }}
                >
                  {r.status}
                </div>
                {r.firm_name && (
                  <div
                    style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: "bold",
                      background: getFirmColor(r.firm_name),
                      color: "white",
                    }}
                  >
                    {r.firm_name}
                  </div>
                )}
                {r.notes && (
                  <div
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: "bold",
                      background: "rgba(102, 126, 234, 0.2)",
                      color: "#667eea",
                      border: "1px solid #667eea",
                    }}
                    title={r.notes.substring(0, 100) + (r.notes.length > 100 ? "..." : "")}
                  >
                    📝 Note
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                fontSize: 16,
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom: "1px solid #4a5568",
              }}
            >
              <div style={{ color: "#e2e8f0", marginBottom: 4 }}>
                <strong>Customer:</strong> {r.customer_name}
              </div>
            </div>

            <div style={{ fontSize: 15, marginBottom: 12 }}>
              <div
                style={{
                  color: "#e2e8f0",
                  fontWeight: "bold",
                  marginBottom: 6,
                }}
              >
                � Appointment
              </div>
              {r.appointment_start ? (
                <div style={{ color: "#cbd5e0", fontSize: 14 }}>
                  <strong>Start:</strong>{" "}
                  {new Date(r.appointment_start).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              ) : (
                <div
                  style={{
                    color: "#718096",
                    fontSize: 12,
                    fontStyle: "italic",
                  }}
                >
                  No appointment scheduled
                </div>
              )}
            </div>

            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <div
                style={{
                  color: "#e2e8f0",
                  fontWeight: "bold",
                  marginBottom: 6,
                }}
              >
                � Vehicle Info
              </div>
              {r.vin && (
                <div
                  style={{ color: "#a0aec0", fontSize: 12, marginBottom: 2 }}
                >
                  <strong>VIN:</strong> {r.vin.substring(0, 10)}...
                </div>
              )}
              {r.vehicle_year || r.vehicle_make || r.vehicle_model ? (
                <div style={{ color: "#a0aec0", fontSize: 12 }}>
                  {r.vehicle_year && `${r.vehicle_year} `}
                  {r.vehicle_make && `${r.vehicle_make} `}
                  {r.vehicle_model && r.vehicle_model}
                </div>
              ) : (
                <div
                  style={{
                    color: "#718096",
                    fontSize: 12,
                    fontStyle: "italic",
                  }}
                >
                  No vehicle info
                </div>
              )}
            </div>

            <div
              style={{
                fontSize: 15,
                paddingTop: 12,
                borderTop: "1px solid #4a5568",
              }}
            >
              <div style={{ color: "#e2e8f0", marginBottom: isAdmin ? 12 : 0 }}>
                <strong>👤 Assigned:</strong>{" "}
                {r.profiles?.full_name || (r.assigned_to ? "Unknown User" : "Unassigned")}
              </div>

              {/* Admin-only: Download Photos Button */}
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    downloadClaimPhotos(r.id, r.claim_number);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: "600",
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, #d97706 0%, #b45309 100%)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                  }}
                >
                  📦 Download All Photos (ZIP)
                </button>
              )}
            </div>
          </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
