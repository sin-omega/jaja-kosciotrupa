"use client";

import { useState } from "react";
import { supabaseAnon } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email.trim() || !password) {
      setError("Podaj email i hasło.");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setLoading(false);
      setError("Nieprawidłowy email lub hasło.");
      return;
    }

    // Hard redirect — forces full page reload so middleware picks up the new session cookie
    window.location.href = "/admin/review";
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "16px 0",
    border: "none",
    borderBottom: "1px solid #222",
    background: "transparent",
    color: "#f0f0f0",
    fontSize: "max(16px, 1rem)",
    outline: "none",
    transition: "border-bottom-color 150ms ease",
  };

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100dvh",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(1.5rem, 5vw, 2rem)",
            fontWeight: 300,
            letterSpacing: "-0.01em",
            marginBottom: "40px",
            textAlign: "center",
          }}
        >
          Panel admina
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}
          style={inputStyle}
          autoComplete="email"
          autoCapitalize="none"
        />

        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}
          style={{ ...inputStyle, marginTop: "16px" }}
          autoComplete="current-password"
        />

        <p className="error-text" aria-live="polite" style={{ marginTop: "8px" }}>
          {error}
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            background: "none",
            border: "1px solid #333",
            color: "#f0f0f0",
            padding: "14px 32px",
            borderRadius: "4px",
            fontSize: "0.95rem",
            letterSpacing: "0.05em",
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: "24px",
            opacity: loading ? 0.6 : 1,
            transition: "border-color 150ms ease, background 150ms ease",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#666";
              (e.currentTarget as HTMLButtonElement).style.background = "#111";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#333";
            (e.currentTarget as HTMLButtonElement).style.background = "none";
          }}
        >
          {loading ? "Logowanie…" : "Zaloguj"}
        </button>
      </div>
    </main>
  );
}