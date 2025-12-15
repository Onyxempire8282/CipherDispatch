import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";
import { initializeSupabaseAuthz, getSupabaseAuthz } from "../../lib/supabaseAuthz";

type Claim = {
  id: string;
  claim_number: string;
  customer_name: string;
  status: string;
  appointment_start?: string;
  vin?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
};

export default function MyClaims() {
  const [rows, setRows] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authzInitialized, setAuthzInitialized] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const initializeAuth = async () => {
    try {
      console.log('Initializing authorization for MyClaims component...');
      await initializeSupabaseAuthz(supabase);
      setAuthzInitialized(true);
      console.log('Authorization initialized successfully');
    } catch (err: any) {
      console.error('Authorization initialization failed:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const load = async () => {
    if (!authzInitialized) {
      console.log('Authorization not ready, skipping load');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const authz = getSupabaseAuthz();
      if (!authz || !authz.isInitialized) {
        throw new Error('Authorization not properly initialized');
      }

      const userInfo = authz.getCurrentUser();
      console.log(`Loading my claims for ${userInfo?.role}: ${userInfo?.fullName}`);

      // Create base query
      let query = supabase
        .from("claims")
        .select(
          "id,claim_number,customer_name,status,appointment_start,vin,vehicle_year,vehicle_make,vehicle_model"
        );

      // Apply role-based scoping BEFORE filtering by status
      query = authz.scopedClaimsQuery(query);

      // Then apply status filtering
      if (!showCompleted) {
        // Show active claims only
        query = query.or("status.is.null,status.in.(SCHEDULED,IN_PROGRESS)");
      } else {
        // Show completed claims
        query = query.eq("status", "COMPLETED");
      }

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

      console.log(`Loaded ${data?.length || 0} my claims for ${userInfo?.role}`);
      setRows(data || []);
      
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
          .channel("my-claims")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "claims" },
            () => {
              console.log('Real-time update received, reloading my claims...');
              load();
            }
          )
          .subscribe();
          
        return () => {
          supabase.removeChannel(ch);
        };
      }
    }
  }, [showCompleted, authzInitialized]);

  // Show loading state
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#e2e8f0', fontSize: '18px' }}>
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ 
          color: '#ef4444', 
          fontSize: '18px', 
          textAlign: 'center',
          background: '#2d3748',
          padding: '24px',
          borderRadius: '8px',
          border: '2px solid #ef4444'
        }}>
          <h3>Unable to load your claims</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '12px'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [showCompleted]);

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
            {showCompleted ? "My Completed Claims" : "My Active Claims"}
          </h3>
        </div>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          style={{
            padding: "8px 16px",
            background: showCompleted ? "#4a5568" : "#10b981",
            color: "white",
            border: "none",
            borderRadius: 4,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {showCompleted ? "← View Active Claims" : "✅ View Completed"}
        </button>
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
                📅 Appointment
              </div>
              {r.appointment_start ? (
                <div style={{ color: "#a0aec0", fontSize: 12 }}>
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

            <div style={{ fontSize: 13 }}>
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
          </Link>
        ))}
        {rows.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "#a0aec0" }}>
            No claims assigned to you yet.
          </div>
        )}
      </div>
    </div>
  );
}
