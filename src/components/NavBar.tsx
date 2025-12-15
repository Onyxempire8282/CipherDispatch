import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export const NavBar: React.FC<{ role: 'admin' | 'appraiser' }> = ({ role }) => {
  const nav = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav("/login");
  };

  return (
    <nav
      style={{
        background: "rgba(45, 55, 72, 0.95)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <Link
          to="/"
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: "#e2e8f0",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>⚡</span>
          <span>Claim Cipher</span>
        </Link>

        <div style={{ display: "flex", gap: 16 }}>
          {role === "admin" ? (
            <>
              <Link
                to="/admin/claims"
                style={{
                  color: "#e2e8f0",
                  textDecoration: "none",
                  padding: "6px 12px",
                  borderRadius: 4,
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                📋 Claims
              </Link>
              <Link
                to="/admin/claims/new"
                style={{
                  color: "#e2e8f0",
                  textDecoration: "none",
                  padding: "6px 12px",
                  borderRadius: 4,
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                ➕ New Claim
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/my-claims"
                style={{
                  color: "#e2e8f0",
                  textDecoration: "none",
                  padding: "6px 12px",
                  borderRadius: 4,
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                📋 My Claims
              </Link>
            </>
          )}
        </div>
      </div>

      <button
        onClick={handleLogout}
        style={{
          background: "#ef4444",
          color: "white",
          padding: "8px 16px",
          border: "none",
          borderRadius: 6,
          fontWeight: "bold",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#dc2626")}
        onMouseOut={(e) => (e.currentTarget.style.background = "#ef4444")}
      >
        Logout
      </button>
    </nav>
  );
};
