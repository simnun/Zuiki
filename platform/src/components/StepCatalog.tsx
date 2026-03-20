"use client";

import { useCallback } from "react";
import { useStore } from "@/lib/store";
import { fD, fmtTime } from "@/lib/utils";
import { SCMAP } from "@/lib/constants";
import CatalogItemCard from "./CatalogItem";

export default function StepCatalog() {
  const { state, dispatch } = useStore();
  const { items, unk, cfg, procPhase, procTimes, rwTotal, rwDone, eI } = state;

  const dc = items.filter(i => i.st === "done").length;
  const ec = items.filter(i => i.st === "err").length;
  const lc = items.filter(i => i.st === "load").length;
  const doubts = items.filter(i => i.doubt && !i.doubtResolved).length;
  const ur = unk.filter(u => !u.dn);
  const completed = dc + ec;
  const total = items.length;
  const remaining = total - completed;
  const avgTime = procTimes.length ? procTimes.reduce((a, b) => a + b, 0) / procTimes.length : 0;
  const etaStr = remaining > 0 && avgTime > 0 ? fmtTime(remaining * avgTime) : "";

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("ov");
    // procF will be wired in part 2
    window.dispatchEvent(new CustomEvent("catalog:addFiles", { detail: e.dataTransfer.files }));
  }, []);

  const handleFileSelect = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => {
      if (input.files) {
        window.dispatchEvent(new CustomEvent("catalog:addFiles", { detail: input.files }));
      }
    };
    input.click();
  }, []);

  const handleRetryOne = useCallback((idx: number) => {
    window.dispatchEvent(new CustomEvent("catalog:retryOne", { detail: idx }));
  }, []);

  const handleRetryErrors = useCallback(() => {
    window.dispatchEvent(new CustomEvent("catalog:retryErrors"));
  }, []);

  const handleSuggestCorr = useCallback((idx: number) => {
    window.dispatchEvent(new CustomEvent("catalog:suggestCorr", { detail: idx }));
  }, []);

  const handleRegenLong = useCallback((idx: number) => {
    window.dispatchEvent(new CustomEvent("catalog:regenLong", { detail: idx }));
  }, []);

  const handleOpenWizard = useCallback(() => {
    window.dispatchEvent(new CustomEvent("catalog:openWizard"));
  }, []);

  const handleResolveSuffix = useCallback((idx: number) => {
    window.dispatchEvent(new CustomEvent("catalog:resolveSuffix", { detail: idx }));
  }, []);

  const brandLabel = cfg.br === "zuiki" ? "Zuiki" : "Loveskin";
  const shootLabel = cfg.shootType === "mannequin"
    ? `Manichino ${cfg.mannequin?.taglia || ""}`
    : [...cfg.selMods, cfg.noModel ? "Still life" : ""].filter(Boolean).join(", ") || "—";

  // ─── Analyzing phase (progress only) ───
  if (procPhase === "analyzing") {
    return (
      <div className="animate-fadeUp">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700 }}>Catalogo Prodotti</h2>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>{brandLabel} — {cfg.st} {cfg.an} — Donna — {shootLabel} — {fD(cfg.ds)}</p>
          </div>
          <button className="btn btn-s" onClick={() => dispatch({ type: "SET_STEP", payload: 0 })}>← Setup</button>
        </div>
        {/* Unknown suffixes */}
        {ur.length > 0 && <SuffixBanner ur={ur} unk={unk} onResolve={handleResolveSuffix} dispatch={dispatch} />}
        <div style={{ maxWidth: 500, margin: "60px auto", textAlign: "center" }}>
          <div className="spinner" style={{ width: 40, height: 40, margin: "0 auto 20px" }} />
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Analisi in corso...</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
            {completed} di {total} prodotti analizzati{etaStr ? ` — ~${etaStr} rimanenti` : ""}
          </p>
          <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", borderRadius: 4, transition: "width .3s", width: `${total ? (completed / total * 100) : 0}%`, background: "var(--ok)" }} />
          </div>
          <p style={{ fontSize: 11, color: "var(--muted)" }}>
            {lc > 0 ? `${lc} in elaborazione · ` : ""}{dc} completat{dc !== 1 ? "i" : "o"}
            {doubts > 0 && <span style={{ color: "var(--warn)" }}> · {doubts} dubbi</span>}
            {ec > 0 && <span style={{ color: "var(--err)" }}> · {ec} errori</span>}
          </p>
        </div>
      </div>
    );
  }

  // ─── Reworking phase ───
  if (procPhase === "reworking") {
    return (
      <div className="animate-fadeUp">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700 }}>Catalogo Prodotti</h2>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>{brandLabel} — {cfg.st} {cfg.an}</p>
          </div>
        </div>
        <div style={{ maxWidth: 500, margin: "60px auto", textAlign: "center" }}>
          <div className="spinner" style={{ width: 40, height: 40, margin: "0 auto 20px" }} />
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Rielaborazione dubbi...</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>{rwDone} di {rwTotal} prodotti rielaborati</p>
          <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 4, transition: "width .3s", width: `${rwTotal ? (rwDone / rwTotal * 100) : 0}%`, background: "var(--accent2)" }} />
          </div>
        </div>
      </div>
    );
  }

  // ─── Normal catalog view ───
  return (
    <div className="animate-fadeUp">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>Catalogo Prodotti</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>{brandLabel} — {cfg.st} {cfg.an} — Donna — {shootLabel} — {fD(cfg.ds)}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-s" onClick={() => dispatch({ type: "SET_STEP", payload: 0 })}>← Setup</button>
          <button className="btn btn-g" disabled={!dc} onClick={() => dispatch({ type: "SET_STEP", payload: 2 })}>
            Correlazioni &amp; Export →
          </button>
        </div>
      </div>

      {/* Error banner */}
      {ec > 0 && (
        <div className="alert-d" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--err)" }}>❌ {ec} articol{ec > 1 ? "i" : "o"} con errore</span>
            <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>Espandi per vedere il dettaglio</span>
          </div>
          <button className="btn btn-p" style={{ padding: "8px 18px", fontSize: 12 }} onClick={handleRetryErrors}>🔄 Rilancia tutti ({ec})</button>
        </div>
      )}

      {/* Doubt banner */}
      {doubts > 0 && (
        <div className="alert" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="doubt-badge">⚠ DUBBIO LOGO/IMMAGINE</span>
            <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>{doubts} articol{doubts > 1 ? "i" : "o"} con stampe/loghi da identificare</span>
          </div>
          <button className="btn btn-w" style={{ padding: "8px 18px", fontSize: 12 }} onClick={handleOpenWizard}>🔍 Risolvi Dubbi ({doubts})</button>
        </div>
      )}

      {/* Unknown suffixes */}
      {ur.length > 0 && <SuffixBanner ur={ur} unk={unk} onResolve={handleResolveSuffix} dispatch={dispatch} />}

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ marginBottom: 16, padding: "14px 18px", background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{lc > 0 ? "Analisi in corso..." : "Analisi completata"}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{completed}/{total}{etaStr ? ` — ~${etaStr} rimanenti` : ""}</span>
            </div>
            <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, transition: "width .3s", width: `${total ? (completed / total * 100) : 0}%`, background: ec > 0 && dc > 0 ? `linear-gradient(90deg, var(--ok) ${Math.round(dc / completed * 100)}%, var(--err) 100%)` : "var(--ok)" }} />
            </div>
          </div>
          {lc > 0 && <div className="spinner" style={{ width: 18, height: 18, margin: 0, flexShrink: 0 }} />}
        </div>
      )}

      {/* Drop zone */}
      <div
        className="drop"
        style={{ padding: items.length ? 18 : 48 }}
        onClick={handleFileSelect}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ov"); }}
        onDragLeave={(e) => e.currentTarget.classList.remove("ov")}
        onDrop={handleDrop}
      >
        {!items.length && <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>}
        <p style={{ fontSize: items.length ? 13 : 15, fontWeight: items.length ? 400 : 600, color: items.length ? "var(--muted)" : "var(--text)" }}>
          Trascina le foto dei prodotti
        </p>
      </div>

      {/* Items list */}
      {items.map((it, idx) => (
        <CatalogItemCard
          key={it.id}
          it={it}
          idx={idx}
          onRetryOne={handleRetryOne}
          onSuggestCorr={handleSuggestCorr}
          onRegenLong={handleRegenLong}
        />
      ))}
    </div>
  );
}

// ─── Suffix Banner sub-component ───
function SuffixBanner({ ur, unk, onResolve, dispatch }: { ur: any[]; unk: any[]; onResolve: (idx: number) => void; dispatch: any }) {
  return (
    <div className="alert">
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--warn)", marginBottom: 12 }}>⚠ Suffissi non riconosciuti:</p>
      {ur.map((u) => {
        const idx = unk.indexOf(u);
        return (
          <div key={u.sf} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <span className="sbdg">{u.sf}</span>
            <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 80 }}>da {u.sku}</span>
            <input
              className="inp"
              placeholder="Es: Bermuda, Tuta..."
              style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
              defaultValue={u.vl}
              onBlur={(e) => {
                const newUnk = [...unk];
                newUnk[idx] = { ...newUnk[idx], vl: e.target.value };
                dispatch({ type: "SET_UNK", payload: newUnk });
              }}
            />
            <button className="btn btn-p" style={{ padding: "8px 16px", fontSize: 12 }} onClick={() => onResolve(idx)}>Conferma</button>
          </div>
        );
      })}
    </div>
  );
}
