"use client";

import { useRef } from "react";
import { useStore } from "@/lib/store";
// Legacy component — authentication now handled via NextAuth /login page
export default function StepLogin() {
  const { state, dispatch } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const doLogin = () => {
    // Redirect to NextAuth login
    window.location.href = '/login';
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto" }} className="animate-fadeUpSlow">
      <div style={{ background: "var(--card)", borderRadius: 16, padding: 32, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 16 }}>🔐</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>Accesso</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", marginBottom: 24 }}>Inserisci la password per accedere</p>
        {state.pwErr && (
          <p style={{ fontSize: 12, color: "var(--err)", textAlign: "center", marginBottom: 12, fontWeight: 600 }}>Password errata</p>
        )}
        <div className="field">
          <label>PASSWORD</label>
          <input
            ref={inputRef}
            className="inp"
            type="password"
            placeholder="••••••••"
            onKeyDown={(e) => { if (e.key === "Enter") doLogin(); }}
          />
        </div>
        <button className="btn btn-p" style={{ width: "100%", padding: 14, fontSize: 15 }} onClick={doLogin}>
          Accedi
        </button>
      </div>
    </div>
  );
}
