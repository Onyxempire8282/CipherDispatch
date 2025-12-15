import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link, useSearchParams } from "react-router-dom";
import {
  initializeSupabaseAuthz,
  getSupabaseAuthz,
} from "../../lib/supabaseAuthz";
import { getFirmColor } from "../../constants/firmColors";
import { downloadClaimsCSV } from "../../utils/csvExport";

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
  profiles?: {
    full_name?: string;
  } | null;
};

export default function AdminClaims() {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authzInitialized, setAuthzInitialized] = useState(false);
  const [showArchived, setShowArchived] = useState(
    searchParams.get("archived") === "true"
  );

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
          "id,claim_number,customer_name,status,vin,vehicle_year,vehicle_make,vehicle_model,assigned_to,appointment_start,appointment_end,firm_name,notes,created_at,profiles:assigned_to(full_name)"
        )
        .order("created_at", { ascending: false });

      // Apply role-based scoping BEFORE filtering by status
      query = authz.scopedClaimsQuery(query);

      // Then apply status filtering
      if (!showArchived) {
        // Show all claims except completed/canceled ones (active claims)
        query = query.or("status.is.null,status.in.(SCHEDULED,IN_PROGRESS)");
      } else {
        // Show completed and canceled claims as "archived"
        query = query.or("status.eq.COMPLETED,status.eq.CANCELED");
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
      setRows((data as Claim[]) || []);
    } catch (err: any) {
      console.error("Error in load function:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  // Calculate status counts
  const statusCounts = rows.reduce((acc, claim) => {
    const status = claim.status || "UNASSIGNED";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unassignedCount = rows.filter((r) => !r.assigned_to).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
        padding: 16,
      }}
    >
      {/* Status Summary Cards */}
      {!showArchived && (
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 24,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background: "#2d3748",
              border: "1px solid #4a5568",
              borderLeft: "4px solid #2196F3",
              borderRadius: 8,
              padding: "16px 24px",
              minWidth: 150,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#2196F3" }}>
              {statusCounts.SCHEDULED || 0}
            </div>
            <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 4 }}>
              📅 Scheduled
            </div>
          </div>
          <div
            style={{
              background: "#2d3748",
              border: "1px solid #4a5568",
              borderLeft: "4px solid #FF9800",
              borderRadius: 8,
              padding: "16px 24px",
              minWidth: 150,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#FF9800" }}>
              {statusCounts.IN_PROGRESS || 0}
            </div>
            <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 4 }}>
              🔧 In Progress
            </div>
          </div>
          <div
            style={{
              background: "#2d3748",
              border: "1px solid #4a5568",
              borderLeft: "4px solid #9E9E9E",
              borderRadius: 8,
              padding: "16px 24px",
              minWidth: 150,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#9E9E9E" }}>
              {unassignedCount}
            </div>
            <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 4 }}>
              👤 Unassigned
            </div>
          </div>
          <div
            style={{
              background: "#2d3748",
              border: "1px solid #4a5568",
              borderLeft: "4px solid #4CAF50",
              borderRadius: 8,
              padding: "16px 24px",
              minWidth: 150,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#4CAF50" }}>
              {statusCounts.COMPLETED || 0}
            </div>
            <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 4 }}>
              ✅ Completed
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
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
            }}
          >
            ← Home
          </Link>
          <h3 style={{ margin: 0, color: "#e2e8f0" }}>
            {showArchived ? "Archived Claims" : "Active Claims"}
          </h3>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowArchived(!showArchived)}
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {rows.map((r) => (
          <Link
            key={r.id}
            to={`/claim/${r.id}`}
            style={{
              border: "1px solid #4a5568",
              borderLeft: `4px solid ${getFirmColor(r.firm_name)}`,
              borderRadius: 8,
              padding: 16,
              background: "#2d3748",
              boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
              textDecoration: "none",
              color: "#e2e8f0",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "pointer",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.7)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.5)";
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 18,
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
                fontSize: 14,
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom: "1px solid #4a5568",
              }}
            >
              <div style={{ color: "#a0aec0", marginBottom: 4 }}>
                <strong>Customer:</strong> {r.customer_name}
              </div>
            </div>

            <div style={{ fontSize: 13, marginBottom: 12 }}>
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
                <div style={{ color: "#a0aec0", fontSize: 12 }}>
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
                fontSize: 13,
                paddingTop: 12,
                borderTop: "1px solid #4a5568",
              }}
            >
              <div style={{ color: "#a0aec0" }}>
                <strong>👤 Assigned:</strong>{" "}
                {r.profiles?.full_name || (r.assigned_to ? "Unknown User" : "Unassigned")}
              </div>
            </div>
          </Link>
        ))}
        {rows.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "#a0aec0" }}>
            No claims yet. Create your first claim!
          </div>
        )}
      </div>
    </div>
  );
}
