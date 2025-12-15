import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link, useSearchParams } from "react-router-dom";
import {
  initializeSupabaseAuthz,
  getSupabaseAuthz,
} from "../../lib/supabaseAuthz";

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
          "id,claim_number,customer_name,status,vin,vehicle_year,vehicle_make,vehicle_model,assigned_to,appointment_start,appointment_end,profiles:assigned_to(full_name)"
        )
        .order("created_at", { ascending: false });

      // Apply role-based scoping BEFORE filtering by status
      query = authz.scopedClaimsQuery(query);

      // Then apply status filtering
      if (!showArchived) {
        // Show all claims except completed ones (active claims)
        query = query.or("status.is.null,status.in.(SCHEDULED,IN_PROGRESS)");
      } else {
        // Show completed claims as "archived"
        query = query.eq("status", "COMPLETED");
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
        padding: 16,
      }}
    >
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
                {r.status}
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
