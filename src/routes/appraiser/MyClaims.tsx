import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";

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
  const [showCompleted, setShowCompleted] = useState(false);

  const load = async () => {
    const query = supabase
      .from("claims")
      .select(
        "id,claim_number,customer_name,status,appointment_start,vin,vehicle_year,vehicle_make,vehicle_model"
      );

    if (!showCompleted) {
      // Show active claims only
      query.or("status.is.null,status.in.(SCHEDULED,IN_PROGRESS)");
    } else {
      // Show completed claims
      query.eq("status", "COMPLETED");
    }

    query.order("appointment_start");

    const { data } = await query;
    setRows(data || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("my-claims")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "claims" },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [showCompleted]);

  return (
    <div style={{ padding: 16 }}>
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
              background: "#6c757d",
              color: "white",
              textDecoration: "none",
              borderRadius: 4,
              fontWeight: "bold",
            }}
          >
            ← Home
          </Link>
          <h3 style={{ margin: 0 }}>
            {showCompleted ? "My Completed Claims" : "My Active Claims"}
          </h3>
        </div>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          style={{
            padding: "8px 16px",
            background: showCompleted ? "#6c757d" : "#4CAF50",
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
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
              background: "white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              textDecoration: "none",
              color: "inherit",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "pointer",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.15)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  marginBottom: 8,
                  color: "#333",
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
                borderBottom: "1px solid #eee",
              }}
            >
              <div style={{ color: "#666", marginBottom: 4 }}>
                <strong>Customer:</strong> {r.customer_name}
              </div>
            </div>

            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <div
                style={{ color: "#333", fontWeight: "bold", marginBottom: 6 }}
              >
                📅 Appointment
              </div>
              {r.appointment_start ? (
                <div style={{ color: "#666", fontSize: 12 }}>
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
                  style={{ color: "#999", fontSize: 12, fontStyle: "italic" }}
                >
                  No appointment scheduled
                </div>
              )}
            </div>

            <div style={{ fontSize: 13 }}>
              <div
                style={{ color: "#333", fontWeight: "bold", marginBottom: 6 }}
              >
                🚗 Vehicle
              </div>
              {r.vehicle_year || r.vehicle_make || r.vehicle_model ? (
                <div style={{ color: "#666", fontSize: 12 }}>
                  {r.vehicle_year && `${r.vehicle_year} `}
                  {r.vehicle_make && `${r.vehicle_make} `}
                  {r.vehicle_model && r.vehicle_model}
                </div>
              ) : (
                <div
                  style={{ color: "#999", fontSize: 12, fontStyle: "italic" }}
                >
                  No vehicle info
                </div>
              )}
            </div>
          </Link>
        ))}
        {rows.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "#999" }}>
            No claims assigned to you yet.
          </div>
        )}
      </div>
    </div>
  );
}
