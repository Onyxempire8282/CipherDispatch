import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";

type Profile = { user_id: string; role: "admin" | "appraiser" };

export default function App() {
  console.log("GITHUB PAGES BASENAME ACTIVE");
  const nav = useNavigate();
  const [p, setP] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      console.log("App: Checking authentication...");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("App: User from auth:", user);
      if (!user) {
        console.log("App: No user found, redirecting to login");
        return nav("/login");
      }
      console.log("App: Fetching profile for user_id:", user.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, role")
        .eq("user_id", user.id)
        .single();
      console.log("App: Profile data:", data, "Error:", error);
      if (!data) {
        console.log("App: No profile found, redirecting to login");
        return nav("/login");
      }
      console.log("App: Profile loaded successfully:", data);
      setP(data as Profile);
    })();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav("/login");
  };

  if (!p) return null;
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
        padding: 32,
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
            background: "#2d3748",
            border: "1px solid #4a5568",
            padding: 20,
            borderRadius: 12,
            boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
          }}
        >
          <h2 style={{ margin: 0, color: "#e2e8f0" }}>
            Welcome, {p.role === "admin" ? "Admin" : "Appraiser"}
          </h2>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 20px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontWeight: "bold",
              cursor: "pointer",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#dc2626")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#ef4444")}
          >
            Logout
          </button>
        </div>

        {p.role === "admin" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <Link
              to="/admin/claims"
              style={{
                background: "#2d3748",
                border: "1px solid #4a5568",
                padding: 24,
                borderRadius: 12,
                textDecoration: "none",
                color: "#e2e8f0",
                boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
                transition: "transform 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <h3 style={{ margin: 0, marginBottom: 8, color: "#e2e8f0" }}>
                View All Claims
              </h3>
              <p style={{ margin: 0, color: "#a0aec0" }}>
                View and manage all active claims in the system
              </p>
            </Link>

            <Link
              to="/admin/claims/new"
              style={{
                background: "#2d3748",
                border: "1px solid #4a5568",
                padding: 24,
                borderRadius: 12,
                textDecoration: "none",
                color: "#e2e8f0",
                boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
                transition: "transform 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>➕</div>
              <h3 style={{ margin: 0, marginBottom: 8, color: "#e2e8f0" }}>
                Create New Claim
              </h3>
              <p style={{ margin: 0, color: "#a0aec0" }}>
                Start a new insurance claim with customer and vehicle details
              </p>
            </Link>

            <Link
              to="/admin/claims?archived=true"
              style={{
                background: "#2d3748",
                border: "1px solid #4a5568",
                padding: 24,
                borderRadius: 12,
                textDecoration: "none",
                color: "#e2e8f0",
                boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
                transition: "transform 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
              <h3 style={{ margin: 0, marginBottom: 8, color: "#e2e8f0" }}>
                Archived Claims
              </h3>
              <p style={{ margin: 0, color: "#a0aec0" }}>
                View completed and archived claims for record keeping
              </p>
            </Link>

            <Link
              to="/admin/vendors"
              style={{
                background: "#2d3748",
                border: "1px solid #4a5568",
                padding: 24,
                borderRadius: 12,
                textDecoration: "none",
                color: "#e2e8f0",
                boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
                transition: "transform 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
              <h3 style={{ margin: 0, marginBottom: 8, color: "#e2e8f0" }}>
                Manage Vendors
              </h3>
              <p style={{ margin: 0, color: "#a0aec0" }}>
                Add and edit vendors that provide payouts
              </p>
            </Link>

            <Link
              to="/admin/payouts"
              style={{
                background: "#2d3748",
                border: "1px solid #4a5568",
                padding: 24,
                borderRadius: 12,
                textDecoration: "none",
                color: "#e2e8f0",
                boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
                transition: "transform 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
              <h3 style={{ margin: 0, marginBottom: 8, color: "#e2e8f0" }}>
                Payout Dashboard
              </h3>
              <p style={{ margin: 0, color: "#a0aec0" }}>
                View upcoming vendor payouts and revenue projections
              </p>
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <Link
              to="/my-claims"
              style={{
                background: "#2d3748",
                border: "1px solid #4a5568",
                padding: 24,
                borderRadius: 12,
                textDecoration: "none",
                color: "#e2e8f0",
                boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
                transition: "transform 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <h3 style={{ margin: 0, marginBottom: 8, color: "#e2e8f0" }}>
                My Claims
              </h3>
              <p style={{ margin: 0, color: "#a0aec0" }}>
                View claims assigned to you and manage appraisals
              </p>
            </Link>

            <Link
              to="/my-claims?view=calendar"
              style={{
                background: "#2d3748",
                border: "1px solid #4a5568",
                padding: 24,
                borderRadius: 12,
                textDecoration: "none",
                color: "#e2e8f0",
                boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
                transition: "transform 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <h3 style={{ margin: 0, marginBottom: 8, color: "#e2e8f0" }}>
                Calendar View
              </h3>
              <p style={{ margin: 0, color: "#a0aec0" }}>
                View and schedule your claims on a monthly calendar
              </p>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
