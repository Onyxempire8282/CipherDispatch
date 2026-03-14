import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { supabaseCD } from "../../lib/supabaseCD";
import { Link, useSearchParams } from "react-router-dom";
import {
  initializeSupabaseAuthz,
  getSupabaseAuthz,
} from "../../lib/supabaseAuthz";
import MonthlyCalendar from "../../components/claims/MonthlyCalendar";
import MobileAgendaView from "../../components/claims/MobileAgendaView";
import MobileClaimsList from "../../components/claims/MobileClaimsList";
import { useIsMobile } from "../../hooks/useIsMobile";
import { NavBar } from "../../components/NavBar";
import PageHeader from "../../components/ui/PageHeader";
import { getTimezoneForState } from "../../utils/stateTimezone";
import "./my-claims.css";

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
  zip?: string | null;
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
      await initializeSupabaseAuthz(supabase, supabaseCD);
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
      let query = supabaseCD
        .from("claims_v")
        .select("*");

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
        claim.status === null ||
        claim.status === "SCHEDULED" ||
        claim.status === "IN_PROGRESS" ||
        claim.status === "WRITING"
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
        const ch = supabaseCD
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
          supabaseCD.removeChannel(ch);
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
      zip: claim.zip || '',
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

  // Personal performance stats
  const activeClaims = allClaims.filter(c =>
    c.status === null || c.status === "SCHEDULED" || c.status === "IN_PROGRESS" || c.status === "WRITING"
  );
  const completedClaims = allClaims.filter(c => c.status === "COMPLETED");
  const todayClaims = activeClaims.filter(c => {
    if (!c.appointment_start) return false;
    return new Date(c.appointment_start).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
  });

  const getBadgeClass = (status: string | null) => {
    switch (status) {
      case "COMPLETED": return "my-claims__card-badge my-claims__card-badge--completed";
      case "IN_PROGRESS": return "my-claims__card-badge my-claims__card-badge--progress";
      case "SCHEDULED": return "my-claims__card-badge my-claims__card-badge--scheduled";
      default: return "my-claims__card-badge my-claims__card-badge--unassigned";
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="my-claims__loading">
        Loading your claims...
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="my-claims__error">
        <div className="my-claims__error-box">
          <h3>Unable to load your claims</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="my-claims__retry-btn"
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
      className={`my-claims__card${draggingClaimId === r.id ? " my-claims__card--dragging" : ""}`}
    >
      <div className="my-claims__card-header">
        <div className="my-claims__card-number">
          #{r.claim_number}
        </div>
        <div className={getBadgeClass(r.status)}>
          {r.status || "ASSIGNED"}
        </div>
      </div>

      <div className="my-claims__card-customer">
        <div className="my-claims__card-customer-text">
          <strong>Customer:</strong> {r.customer_name}
        </div>
      </div>

      <div className="my-claims__card-section">
        <div className="my-claims__card-section-title">
          Address
        </div>
        {r.address_line1 ? (
          <div className="my-claims__card-detail">
            {r.address_line1}, {r.city}, {r.state} {r.zip}
          </div>
        ) : (
          <div className="my-claims__card-empty">
            No address on file
          </div>
        )}
      </div>

      <div className="my-claims__card-section">
        <div className="my-claims__card-section-title">
          Appointment
        </div>
        {r.appointment_start ? (
          <div className="my-claims__card-detail">
            {new Date(r.appointment_start).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZone: getTimezoneForState(r.state),
            })}
          </div>
        ) : (
          <div className="my-claims__card-empty">
            No appointment scheduled
          </div>
        )}
      </div>

      <div className="my-claims__card-section">
        <div className="my-claims__card-section-title">
          Vehicle
        </div>
        {r.vehicle_year || r.vehicle_make || r.vehicle_model ? (
          <div className="my-claims__card-detail">
            {r.vehicle_year && `${r.vehicle_year} `}
            {r.vehicle_make && `${r.vehicle_make} `}
            {r.vehicle_model && r.vehicle_model}
          </div>
        ) : (
          <div className="my-claims__card-empty">
            No vehicle info
          </div>
        )}
      </div>
    </Link>
  );

  return (
    <div className="my-claims">
      <NavBar role="appraiser" />
      <PageHeader label="Appraiser" title="My Claims" />

      {/* Personal stats strip */}
      <div className="my-claims__stats">
        <div className="my-claims__stat">
          <div className="my-claims__stat-num my-claims__stat-num--amber">{todayClaims.length}</div>
          <div className="my-claims__stat-label">TODAY</div>
        </div>
        <div className="my-claims__stat">
          <div className="my-claims__stat-num">{activeClaims.length}</div>
          <div className="my-claims__stat-label">OPEN</div>
        </div>
        <div className="my-claims__stat">
          <div className="my-claims__stat-num my-claims__stat-num--green">{completedClaims.length}</div>
          <div className="my-claims__stat-label">COMPLETED</div>
        </div>
        <div className="my-claims__stat">
          <div className="my-claims__stat-num">{allClaims.length}</div>
          <div className="my-claims__stat-label">TOTAL</div>
        </div>
      </div>

      {/* Header with view toggles */}
      <div className="my-claims__toolbar">
        <div className="my-claims__toolbar-left">
          {!showCalendar && (
            <input
              type="text"
              placeholder="Search by claim #, customer, or firm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="my-claims__search"
            />
          )}
        </div>
        <div className="my-claims__toolbar-right">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`my-claims__toggle-btn${showCalendar ? " my-claims__toggle-btn--active" : ""}`}
          >
            {showCalendar ? "List View" : "Calendar View"}
          </button>
          {!showCompleted && !showCalendar && (
            <button
              onClick={() => setShowTodayOnly(!showTodayOnly)}
              className={`my-claims__toggle-btn${showTodayOnly ? " my-claims__toggle-btn--active" : ""}`}
            >
              {showTodayOnly ? "Today's Claims Only" : "Filter to Today"}
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
              className={`my-claims__toggle-btn${!showCompleted ? " my-claims__toggle-btn--completed" : ""}`}
            >
              {showCompleted ? "View Active Claims" : "View Completed"}
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
          <div className="my-claims__status-bar">
            <button
              onClick={() => {
                setSelectedStatus("ALL");
                setShowCompleted(false);
              }}
              className={`my-claims__status-pill${selectedStatus === "ALL" && !showCompleted ? " my-claims__status-pill--active" : ""}`}
            >
              <div className="my-claims__status-num">
                {statusCounts.unassigned + statusCounts.assigned + statusCounts.inProgress}
              </div>
              <div className="my-claims__status-label">All Active</div>
            </button>
            <button
              onClick={() => {
                setSelectedStatus("SCHEDULED");
                setShowCompleted(false);
              }}
              className={`my-claims__status-pill${selectedStatus === "SCHEDULED" ? " my-claims__status-pill--scheduled" : ""}`}
            >
              <div className="my-claims__status-num">
                {statusCounts.assigned}
              </div>
              <div className="my-claims__status-label">Assigned</div>
            </button>
            <button
              onClick={() => {
                setSelectedStatus("IN_PROGRESS");
                setShowCompleted(false);
              }}
              className={`my-claims__status-pill${selectedStatus === "IN_PROGRESS" ? " my-claims__status-pill--progress" : ""}`}
            >
              <div className="my-claims__status-num">
                {statusCounts.inProgress}
              </div>
              <div className="my-claims__status-label">In Progress</div>
            </button>
            <button
              onClick={() => {
                setSelectedStatus("COMPLETED");
                setShowCompleted(true);
              }}
              className={`my-claims__status-pill${selectedStatus === "COMPLETED" && showCompleted ? " my-claims__status-pill--completed" : ""}`}
            >
              <div className="my-claims__status-num">
                {statusCounts.completed}
              </div>
              <div className="my-claims__status-label">Completed</div>
            </button>
            <button
              onClick={() => {
                setSelectedStatus("CANCELED");
                setShowCompleted(true);
              }}
              className={`my-claims__status-pill${selectedStatus === "CANCELED" && showCompleted ? " my-claims__status-pill--canceled" : ""}`}
            >
              <div className="my-claims__status-num">
                {statusCounts.canceled}
              </div>
              <div className="my-claims__status-label">Canceled</div>
            </button>
          </div>

          {/* Grouped Claims Display */}
          {rows.length === 0 ? (
            <div className="my-claims__empty">
              No claims found matching your filters.
            </div>
          ) : (
            <>
              {Object.entries(groupedClaims).map(([category, claims]) => {
                if (claims.length === 0) return null;

                return (
                  <div key={category} className="my-claims__group">
                    <div className="my-claims__group-header">
                      <span>
                        {category === "Overdue" && "\uD83D\uDD34"}
                        {category === "Today" && "\uD83D\uDCC5"}
                        {category === "Tomorrow" && "\uD83C\uDF05"}
                        {category === "This Week" && "\uD83D\uDCC6"}
                        {category === "Later" && "\uD83D\uDDD3\uFE0F"}
                        {category === "No Appointment" && "\u23F3"}
                      </span>
                      <span>{category}</span>
                      <span className="my-claims__group-count">
                        ({claims.length})
                      </span>
                    </div>
                    <div className="my-claims__grid">
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
