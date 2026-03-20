"use client";

import { useStore } from "@/lib/store";

const STEPS = ["Setup", "Catalogo", "Export"];

export default function Header() {
  const { state } = useStore();
  const { step } = state;

  return (
    <header style={{ padding: "16px 32px", borderBottom: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div className="logo" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700 }}>Z</div>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.3px" }}>Catalogo AI</span>
      </div>
      {step >= 0 && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {STEPS.map((s, i) => (
            <span key={s}>
              <span
                className="step"
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  ...(i === step
                    ? { background: "var(--accent)", color: "#fff" }
                    : i < step
                    ? { color: "var(--accent2)" }
                    : { color: "var(--muted)" }),
                }}
              >
                {s}
              </span>
              {i < 2 && <span style={{ width: 20, height: 1, background: "var(--border)", display: "inline-block" }} />}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
