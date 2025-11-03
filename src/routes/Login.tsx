import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const nav = useNavigate();

  const signIn = async () => {
    console.log("Attempting login with:", email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error("Login error:", error);
      return alert(error.message);
    }
    console.log("Login successful:", data);
    nav("/");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "white",
          padding: 40,
          borderRadius: 12,
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: 32,
            textAlign: "center",
            color: "#333",
          }}
        >
          Auto Appraisal Login
        </h2>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "bold",
                color: "#555",
              }}
            >
              Email
            </label>
            <input
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                fontSize: 16,
                border: "1px solid #ddd",
                borderRadius: 6,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "bold",
                color: "#555",
              }}
            >
              Password
            </label>
            <input
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                fontSize: 16,
                border: "1px solid #ddd",
                borderRadius: 6,
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={signIn}
            style={{
              width: "100%",
              padding: 14,
              fontSize: 16,
              fontWeight: "bold",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              marginTop: 8,
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#5568d3")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#667eea")}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
