"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";

export default function StepApiKey() {
  const { state, dispatch } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const v = inputRef.current?.value?.trim();
    if (v) {
      setSaving(true);
      await fetch("/api/company/apikey", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: v }),
      });
      dispatch({ type: "SET_STATE", payload: { ak: v } });
      dispatch({ type: "SET_STEP", payload: 0 });
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "60px auto" }} className="animate-fadeUpSlow">
      <div style={{ background: "var(--card)", borderRadius: 16, padding: 32, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 16 }}>🔑</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>Configurazione API</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", marginBottom: 24 }}>Inserisci la tua API key Anthropic</p>
        <div className="field">
          <label>API KEY</label>
          <input ref={inputRef} className="inp" type="password" placeholder="sk-ant-..." defaultValue={state.ak} />
        </div>
        <button className="btn btn-p" style={{ width: "100%", padding: 14, fontSize: 15 }} onClick={save} disabled={saving}>
          {saving ? "Salvataggio..." : "Salva e Continua"}
        </button>
        <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 12 }}>Salvata nel database della tua azienda</p>
      </div>
    </div>
  );
}
