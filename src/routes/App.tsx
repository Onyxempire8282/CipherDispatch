import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";

type Profile = { user_id: string; role: "admin" | "appraiser" };

export default function App() {
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
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
            background: "white",
            padding: 20,
            borderRadius: 12,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h2 style={{ margin: 0, color: "#333" }}>
            Welcome, {p.role === "admin" ? "Admin" : "Appraiser"}
          </h2>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 20px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>

        {p.role === "admin" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <Link
              to="/admin/claims"
              style={{
                background: "white",
                padding: 24,
                borderRadius: 12,
                textDecoration: "none",
                color: "#333",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
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
              <h3 style={{ margin: 0, marginBottom: 8 }}>View All Claims</h3>
              <p style={{ margin: 0, color: "#666" }}>
                View and manage all active claims in the system
              </p>
            </Link>

            <Link
              to="/admin/claims/new"
              style={{
                background: "white",
                padding: 24,
                borderRadius: 12,
                textDecoration: "none",
                color: "#333",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
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
              <h3 style={{ margin: 0, marginBottom: 8 }}>Create New Claim</h3>
              <p style={{ margin: 0, color: "#666" }}>
                Start a new insurance claim with customer and vehicle details
              </p>
            </Link>

            <Link
              to="/admin/claims?archived=true"
              style={{
                background: "white",
                padding: 24,
                borderRadius: 12,
                textDecoration: "none",
                color: "#333",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
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
              <h3 style={{ margin: 0, marginBottom: 8 }}>Archived Claims</h3>
              <p style={{ margin: 0, color: "#666" }}>
                View completed and archived claims for record keeping
              </p>
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <Link
              to="/my-claims"
              style={{
                background: "white",
                padding: 24,
                borderRadius: 12,
                textDecoration: "none",
                color: "#333",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
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
              <h3 style={{ margin: 0, marginBottom: 8 }}>My Claims</h3>
              <p style={{ margin: 0, color: "#666" }}>
                View claims assigned to you and manage appraisals
              </p>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
