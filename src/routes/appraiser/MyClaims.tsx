import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link, useSearchParams } from "react-router-dom";
import {
  initializeSupabaseAuthz,
  getSupabaseAuthz,
} from "../../lib/supabaseAuthz";
import MonthlyCalendar from "../../components/claims/MonthlyCalendar";
import MobileAgendaView from "../../components/claims/MobileAgendaView";
import MobileClaimsList from "../../components/claims/MobileClaimsList";
import { useIsMobile } from "../../hooks/useIsMobile";

type Claim = {
  id: string;
  claim_number: string;
  customer_name: string;
  status: string;
  appointment_start?: string;
  appointment_end?: string;
  vin?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  firm?: string;
  pay_amount?: number | null;
  file_total?: number | null;
  profiles?: { full_name?: string } | null;
};

type ClaimStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | null;

export default function MyClaims() {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authzInitialized, setAuthzInitialized] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ClaimStatus | "ALL">("ALL");
  const [draggingClaimId, setDraggingClaimId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(searchParams.get("view") === "calendar");
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile breakpoint detection: <=600px shows MobileAgendaView instead of MonthlyCalendar
  const isMobile = useIsMobile();

  const initializeAuth = async () => {
    try {
      console.log("Initializing authorization for MyClaims component...");
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
        `Loading my claims for ${userInfo?.role}: ${userInfo?.fullName}`
      );

      // Create base query - load ALL claims
      let query = supabase
        .from("claims")
        .select(
          "id,claim_number,customer_name,status,appointment_start,appointment_end,vin,vehicle_year,vehicle_make,vehicle_model,address_line1,city,state,postal_code,firm,pay_amount,file_total,profiles:assigned_to(full_name)"
        );

      // Apply role-based scoping
      query = authz.scopedClaimsQuery(query);

      // Filter to only show claims created on or after Dec 1, 2025
      query = query.gte('created_at', '2025-12-01');

      query = query.order("appointment_start");

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error("Error loading my claims:", queryError);

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

      console.log(
        `Loaded ${data?.length || 0} my claims for ${userInfo?.role}`
      );

      setAllClaims(data || []);
      applyFilters(data || []);
    } catch (err: any) {
      console.error("Error in load function:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (claims: Claim[]) => {
    let filteredData = [...claims];

    // Apply status filter
    if (selectedStatus !== "ALL") {
      filteredData = filteredData.filter(claim => claim.status === selectedStatus);
    }

    // Apply completed/active filter
    if (!showCompleted) {
      // Show active claims only
      filteredData = filteredData.filter(claim =>
        claim.status === null || claim.status === "SCHEDULED" || claim.status === "IN_PROGRESS"
      );
    } else {
      // Show completed claims only (CANCELED is separate via status filter)
      filteredData = filteredData.filter(claim =>
        claim.status === "COMPLETED"
      );
    }

    // Filter for today's claims if showTodayOnly is true
    if (showTodayOnly && !showCompleted) {
      const today = new Date().toISOString().split('T')[0];
      filteredData = filteredData.filter(claim => {
        if (!claim.appointment_start) return false;
        const claimDate = new Date(claim.appointment_start).toISOString().split('T')[0];
        return claimDate === today;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredData = filteredData.filter(claim =>
        claim.claim_number?.toLowerCase().includes(query) ||
        claim.customer_name?.toLowerCase().includes(query) ||
        claim.firm?.toLowerCase().includes(query)
      );
    }

    setRows(filteredData);
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
          .channel("my-claims")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "claims" },
            () => {
              console.log("Real-time update received, reloading my claims...");
              load();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(ch);
        };
      }
    }
  }, [authzInitialized]);

  // Re-apply filters when filter states change
  useEffect(() => {
    if (allClaims.length > 0) {
      applyFilters(allClaims);
    }
  }, [showCompleted, showTodayOnly, selectedStatus, searchQuery, allClaims]);

  // Drag-and-drop handlers for cross-window dragging
  const handleDragStart = (e: React.DragEvent, claim: Claim) => {
    setDraggingClaimId(claim.id);

    // Construct payload for cross-window drop
    const payload = {
      id: claim.id,
      claimNumber: claim.claim_number,
      firmName: '',
      customerName: claim.customer_name,
      addressLine1: claim.address_line1 || '',
      city: claim.city || '',
      state: claim.state || '',
      zip: claim.postal_code || '',
      lat: null,
      lng: null,
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

  // Calculate status counts
  const getStatusCounts = () => {
    const counts = {
      unassigned: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0,
      canceled: 0,
    };

    allClaims.forEach(claim => {
      if (claim.status === null) {
        counts.unassigned++;
      } else if (claim.status === "SCHEDULED") {
        counts.assigned++;
      } else if (claim.status === "IN_PROGRESS") {
        counts.inProgress++;
      } else if (claim.status === "COMPLETED") {
        counts.completed++;
      } else if (claim.status === "CANCELED") {
        counts.canceled++;
      }
    });

    return counts;
  };

  // Categorize claim by appointment date
  const getDateCategory = (appointmentDate: string | undefined): string => {
    if (!appointmentDate) return "No Appointment";

    const now = new Date();
    const appointment = new Date(appointmentDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const apptDate = new Date(appointment.getFullYear(), appointment.getMonth(), appointment.getDate());

    if (apptDate < today) return "Overdue";
    if (apptDate.getTime() === today.getTime()) return "Today";
    if (apptDate.getTime() === tomorrow.getTime()) return "Tomorrow";
    if (apptDate < weekEnd) return "This Week";
    return "Later";
  };

  // Group claims by date category
  const groupClaimsByDate = () => {
    const categories = {
      "Overdue": [] as Claim[],
      "Today": [] as Claim[],
      "Tomorrow": [] as Claim[],
      "This Week": [] as Claim[],
      "Later": [] as Claim[],
      "No Appointment": [] as Claim[],
    };

    rows.forEach(claim => {
      const category = getDateCategory(claim.appointment_start);
      categories[category as keyof typeof categories].push(claim);
    });

    return categories;
  };

  const statusCounts = getStatusCounts();
  const groupedClaims = groupClaimsByDate();

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
          Loading your claims...
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
          <h3>Unable to load your claims</h3>
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

  const renderClaimCard = (r: Claim) => (
    <Link
      key={r.id}
      to={`/claim/${r.id}`}
      draggable={true}
      onDragStart={(e) => handleDragStart(e, r)}
      onDragEnd={handleDragEnd}
      style={{
        border: "1px solid #4a5568",
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
                : "#9E9E9E",
            color: "white",
          }}
        >
          {r.status || "ASSIGNED"}
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
          📍 Address
        </div>
        {r.address_line1 ? (
          <div style={{ color: "#cbd5e0", fontSize: 14 }}>
            {r.address_line1}, {r.city}, {r.state} {r.postal_code}
          </div>
        ) : (
          <div
            style={{
              color: "#718096",
              fontSize: 12,
              fontStyle: "italic",
            }}
          >
            No address on file
          </div>
        )}
      </div>

      <div style={{ fontSize: 15, marginBottom: 12 }}>
        <div
          style={{
            color: "#e2e8f0",
            fontWeight: "bold",
            marginBottom: 6,
          }}
        >
          📅 Appointment
        </div>
        {r.appointment_start ? (
          <div style={{ color: "#cbd5e0", fontSize: 14 }}>
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

      <div style={{ fontSize: 15 }}>
        <div
          style={{
            color: "#e2e8f0",
            fontWeight: "bold",
            marginBottom: 6,
          }}
        >
          🚗 Vehicle
        </div>
        {r.vehicle_year || r.vehicle_make || r.vehicle_model ? (
          <div style={{ color: "#cbd5e0", fontSize: 14 }}>
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
    </Link>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
        padding: 16,
      }}
    >
      {/* Header with Home button and title */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            to="/"
            style={{
              padding: "8px 16px",
              background: "#4a5568",
              color: "white",
              textDecoration: "none",
              borderRadius: 4,
              fontWeight: "bold",
              fontSize: "15px",
            }}
          >
            ← Home
          </Link>
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: "22px", fontWeight: "bold" }}>
            My Claims
          </h3>
          {!showCalendar && (
            <input
              type="text"
              placeholder="🔍 Search by claim #, customer, or firm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 16px",
                background: "#1a202c",
                border: "2px solid #4a5568",
                borderRadius: "6px",
                color: "#e2e8f0",
                fontSize: "14px",
                width: "300px",
                marginLeft: "16px",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#4a5568"}
            />
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            style={{
              padding: "8px 16px",
              background: showCalendar ? "#667eea" : "#4a5568",
              color: "white",
              border: "none",
              borderRadius: 4,
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            {showCalendar ? "📋 List View" : "📅 Calendar View"}
          </button>
          {!showCompleted && !showCalendar && (
            <button
              onClick={() => setShowTodayOnly(!showTodayOnly)}
              style={{
                padding: "8px 16px",
                background: showTodayOnly ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#4a5568",
                color: "white",
                border: showTodayOnly ? "2px solid #818cf8" : "2px solid transparent",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "15px",
                transition: "all 0.2s",
                boxShadow: showTodayOnly ? "0 2px 8px rgba(102, 126, 234, 0.4)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!showTodayOnly) {
                  e.currentTarget.style.background = "#5a6c7d";
                }
              }}
              onMouseLeave={(e) => {
                if (!showTodayOnly) {
                  e.currentTarget.style.background = "#4a5568";
                }
              }}
            >
              {showTodayOnly ? "✓ Today's Claims Only" : "📅 Filter to Today"}
            </button>
          )}
          {!showCalendar && (
            <button
              onClick={() => {
                setShowCompleted(!showCompleted);
                if (!showCompleted) {
                  setShowTodayOnly(false);
                  setSelectedStatus("ALL");
                }
              }}
              style={{
                padding: "8px 16px",
                background: showCompleted ? "#4a5568" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: 4,
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              {showCompleted ? "← View Active Claims" : "✅ View Completed"}
            </button>
          )}
        </div>
      </div>

      {/* Calendar View: Mobile shows MobileAgendaView, Desktop shows MonthlyCalendar */}
      {/* List View: Mobile shows MobileClaimsList, Desktop shows full list with filters */}
      {showCalendar ? (
        isMobile ? (
          <MobileAgendaView claims={allClaims} onClaimUpdate={load} />
        ) : (
          <MonthlyCalendar claims={allClaims} onClaimUpdate={load} />
        )
      ) : isMobile ? (
        /* Mobile list view - vertical cards with filter bar */
        <MobileClaimsList claims={rows} />
      ) : (
        <>
          {/* Desktop List View - Status Summary Pills */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
        <button
          onClick={() => {
            setSelectedStatus("ALL");
            setShowCompleted(false);
          }}
          style={{
            padding: "12px 20px",
            background: selectedStatus === "ALL" && !showCompleted ? "#667eea" : "#374151",
            color: "white",
            border: selectedStatus === "ALL" && !showCompleted ? "2px solid #818cf8" : "2px solid transparent",
            borderRadius: 8,
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "14px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: "18px", marginBottom: 4 }}>
            {statusCounts.unassigned + statusCounts.assigned + statusCounts.inProgress}
          </div>
          <div style={{ fontSize: "12px", opacity: 0.9 }}>All Active</div>
        </button>
        <button
          onClick={() => {
            setSelectedStatus("SCHEDULED");
            setShowCompleted(false);
          }}
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
          }}
        >
          <div style={{ fontSize: "18px", marginBottom: 4 }}>
            {statusCounts.assigned}
          </div>
          <div style={{ fontSize: "12px", opacity: 0.9 }}>Assigned</div>
        </button>
        <button
          onClick={() => {
            setSelectedStatus("IN_PROGRESS");
            setShowCompleted(false);
          }}
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
          }}
        >
          <div style={{ fontSize: "18px", marginBottom: 4 }}>
            {statusCounts.inProgress}
          </div>
          <div style={{ fontSize: "12px", opacity: 0.9 }}>In Progress</div>
        </button>
        <button
          onClick={() => {
            setSelectedStatus("COMPLETED");
            setShowCompleted(true);
          }}
          style={{
            padding: "12px 20px",
            background: selectedStatus === "COMPLETED" && showCompleted ? "#4CAF50" : "#374151",
            color: "white",
            border: selectedStatus === "COMPLETED" && showCompleted ? "2px solid #81c784" : "2px solid transparent",
            borderRadius: 8,
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "14px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: "18px", marginBottom: 4 }}>
            {statusCounts.completed}
          </div>
          <div style={{ fontSize: "12px", opacity: 0.9 }}>Completed</div>
        </button>
        <button
          onClick={() => {
            setSelectedStatus("CANCELED");
            setShowCompleted(true);
          }}
          style={{
            padding: "12px 20px",
            background: selectedStatus === "CANCELED" && showCompleted ? "#EF4444" : "#374151",
            color: "white",
            border: selectedStatus === "CANCELED" && showCompleted ? "2px solid #f87171" : "2px solid transparent",
            borderRadius: 8,
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "14px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: "18px", marginBottom: 4 }}>
            {statusCounts.canceled}
          </div>
          <div style={{ fontSize: "12px", opacity: 0.9 }}>Canceled</div>
        </button>
      </div>

      {/* Grouped Claims Display */}
      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#a0aec0" }}>
          No claims found matching your filters.
        </div>
      ) : (
        <>
          {Object.entries(groupedClaims).map(([category, claims]) => {
            if (claims.length === 0) return null;

            return (
              <div key={category} style={{ marginBottom: 32 }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#e2e8f0",
                    marginBottom: 16,
                    paddingBottom: 8,
                    borderBottom: "2px solid #4a5568",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>
                    {category === "Overdue" && "🔴"}
                    {category === "Today" && "📅"}
                    {category === "Tomorrow" && "🌅"}
                    {category === "This Week" && "📆"}
                    {category === "Later" && "🗓️"}
                    {category === "No Appointment" && "⏳"}
                  </span>
                  <span>{category}</span>
                  <span style={{ fontSize: "14px", opacity: 0.7, fontWeight: "normal" }}>
                    ({claims.length})
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: 16,
                  }}
                >
                  {claims.map(renderClaimCard)}
                </div>
              </div>
            );
          })}
        </>
      )}
        </>
      )}
    </div>
  );
}
