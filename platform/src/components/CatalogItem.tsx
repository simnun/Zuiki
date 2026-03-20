"use client";

import { useStore } from "@/lib/store";
import { friendlyErr, fmtComp, mDs } from "@/lib/utils";
import { LSC } from "@/lib/constants";
import { openLB } from "./Lightbox";

interface CatalogItemProps {
  it: any;
  idx: number;
  onRetryOne: (idx: number) => void;
  onSuggestCorr: (idx: number) => void;
  onRegenLong: (idx: number) => void;
}

export default function CatalogItemCard({ it, idx, onRetryOne, onSuggestCorr, onRegenLong }: CatalogItemProps) {
  const { state, dispatch } = useStore();
  const { eI, cfg, mod } = state;
  const np = it.ap?.length || 1;
  const allP = it.ap || [it.pv];
  const expanded = eI === idx && it.st === "done";
  const exD = it.excelInfo;

  const thumbs = allP.slice(0, 3).map((p: string, pi: number) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={pi}
      src={p}
      className="thumb thumb-zoom"
      style={{ width: pi ? 36 : 72, height: pi ? 46 : 90, borderRadius: pi ? 6 : 10 }}
      alt=""
      onClick={(e) => { e.stopPropagation(); openLB(allP, pi); }}
    />
  ));

  let statusEl = null;
  if (it.st === "wait") statusEl = <span style={{ fontSize: 11, color: "var(--warn)", fontWeight: 600 }}>⏳ In attesa</span>;
  else if (it.st === "load") statusEl = <span style={{ fontSize: 11, color: "var(--muted)" }} className="animate-pulse-custom">Analisi AI ({np} foto)...</span>;
  else if (it.st === "err") statusEl = <span style={{ fontSize: 11, color: "var(--err)", fontWeight: 600 }}>❌ Errore</span>;
  else if (it.st === "done" && it.doubt && !it.doubtResolved) statusEl = <span className="doubt-badge">⚠ DUBBIO LOGO</span>;
  else if (it.st === "done") statusEl = <span style={{ fontSize: 11, color: "var(--ok)", fontWeight: 600 }}>✓</span>;

  const showModCol = it.recMod || it.modelUnknown;

  return (
    <div className={`card ${it.st === "wait" ? "card-w" : it.st === "err" ? "card-e" : ""}`}>
      <div style={{ display: "flex", gap: 16, padding: 16, alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {thumbs}
          {np > 3 && (
            <div
              style={{ width: 36, height: 46, borderRadius: 6, background: "var(--subtle)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "var(--muted)", cursor: "pointer" }}
              onClick={() => openLB(allP, 3)}
            >+{np - 3}</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span className="sku" style={{ fontSize: 14 }}>{it.sku}</span>
              {it.tp && <span className="tag-t">{it.tp}</span>}
              {np > 1 && <span style={{ fontSize: 10, color: "var(--muted)" }}>📷 {np}</span>}
              {statusEl}
              {it.doubtResolved && it.ai?.licenza && <span className="mem-badge">🏷 {it.ai.licenza}</span>}
              {it.reworking && <span style={{ fontSize: 11, color: "var(--muted)" }} className="animate-pulse-custom">Rielaborazione...</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {it.st === "done" && !it.reworking && (
                <button className="btn btn-s" style={{ padding: "5px 12px", fontSize: 11, background: "#fff8ee", color: "#8a5e00", borderColor: "#f0d8a8" }}
                  onClick={() => dispatch({ type: "SET_ITEM", idx, payload: { corrOpen: !it.corrOpen } })}>
                  💡 Suggerisci correzioni
                </button>
              )}
              {it.st === "done" && (
                <button className="btn btn-s" style={{ padding: "5px 12px", fontSize: 11 }}
                  onClick={() => dispatch({ type: "SET_STATE", payload: { eI: eI === idx ? null : idx } })}>
                  {eI === idx ? "Chiudi" : "Mostra"}
                </button>
              )}
              <button className="btn btn-d" style={{ padding: "5px 12px", fontSize: 11 }}
                onClick={() => dispatch({ type: "REMOVE_ITEM", idx })}>✕</button>
            </div>
          </div>

          {/* Done metadata */}
          {it.st === "done" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: showModCol ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8, fontSize: 12 }}>
                <div><span style={{ color: "var(--muted)" }}>Nome: </span><strong>{it.nm}</strong></div>
                <div><span style={{ color: "var(--muted)" }}>Comp: </span>{fmtComp(it.cp) || "—"}</div>
                {it.recMod && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "var(--muted)" }}>Modella: </span><strong>{it.recMod}</strong>
                    <select className="inp" style={{ display: "inline", width: "auto", padding: "2px 6px", fontSize: 10, borderRadius: 6, cursor: "pointer", background: "var(--subtle)", borderColor: "var(--border)" }}
                      onChange={(e) => {
                        if (e.target.value) {
                          const newDs = mDs(it.ai, it.cp, it.tp, e.target.value, cfg, mod);
                          dispatch({ type: "SET_ITEM", idx, payload: { recMod: e.target.value, ds: newDs } });
                        }
                      }}>
                      <option value="">✎ Cambia</option>
                      {mod.filter(ml => ml.nome !== it.recMod).map(ml => <option key={ml.nome} value={ml.nome}>{ml.nome}</option>)}
                    </select>
                  </div>
                )}
                {it.modelUnknown && !it.recMod && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "var(--muted)" }}>Modella: </span>
                    <strong style={{ color: "var(--err)", fontSize: 12, letterSpacing: "0.3px" }}>NON RICONOSCIUTA</strong>
                    <select className="inp" style={{ display: "inline", width: "auto", padding: "2px 8px", fontSize: 11, borderRadius: 6, cursor: "pointer", borderColor: "var(--err)", background: "#fff5f5" }}
                      onChange={(e) => {
                        if (e.target.value) {
                          const newDs = mDs(it.ai, it.cp, it.tp, e.target.value, cfg, mod);
                          dispatch({ type: "SET_ITEM", idx, payload: { recMod: e.target.value, modelUnknown: false, ds: newDs } });
                        }
                      }}>
                      <option value="">Seleziona modella...</option>
                      {mod.map(ml => <option key={ml.nome} value={ml.nome}>{ml.nome}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {exD && (
                <div style={{ marginTop: 6, padding: "8px 12px", background: "#f8f6f0", border: "1px solid var(--border)", borderRadius: 8, display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 11 }}>
                  <span style={{ color: "var(--muted)" }}>📊 Excel:</span>
                  {exD.anno && <span><b>Anno:</b> {exD.anno}</span>}
                  {exD.stagione && <span><b>Stag:</b> {exD.stagione}</span>}
                  {exD.tipoArticolo && <span><b>Tipo:</b> {exD.tipoArticolo}</span>}
                  {exD.brand && <span><b>Brand:</b> {exD.brand}</span>}
                  {exD.caratteristica && <span><b>Caratt:</b> {exD.caratteristica}</span>}
                  {exD.colori && <span><b>Colori:</b> {exD.colori}</span>}
                  {exD.composizione && <span><b>Comp:</b> {exD.composizione}</span>}
                </div>
              )}
            </>
          )}

          {/* Loading shimmer */}
          {it.st === "load" && (
            <div style={{ display: "flex", gap: 10 }}>
              <div className="shim" style={{ width: 80 }} />
              <div className="shim" style={{ width: 100 }} />
              <div className="shim" style={{ width: 70 }} />
            </div>
          )}

          {/* Error detail */}
          {it.st === "err" && (
            <div className="err-box">
              <p style={{ fontWeight: 600, marginBottom: 6 }}>{friendlyErr(it.er)}</p>
              <details style={{ marginTop: 6 }}>
                <summary style={{ fontSize: 10, color: "var(--muted)", cursor: "pointer" }}>Dettaglio tecnico</summary>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, wordBreak: "break-all", marginTop: 4, color: "var(--muted)" }}>{it.er || "Errore sconosciuto"}</p>
              </details>
              <button className="btn btn-p" style={{ padding: "6px 14px", fontSize: 11, marginTop: 8 }} onClick={() => onRetryOne(idx)}>🔄 Riprova</button>
            </div>
          )}

          {/* Doubt indicator */}
          {it.st === "done" && it.doubt && !it.doubtResolved && (
            <div style={{ padding: "8px 12px", background: "#fffbf0", border: "1px solid #f0d8a8", borderRadius: 8, marginTop: 6, fontSize: 12, color: "#8a5e00", display: "flex", alignItems: "center", gap: 6 }}>
              <span>🔍</span> <em>{it.doubtDesc}</em>
            </div>
          )}

          {/* Correction suggestion */}
          {it.corrOpen && (
            <div style={{ padding: "8px 12px", background: "#fff8ee", border: "1px solid #f0d8a8", borderRadius: 8, marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 14 }}>💡</span>
              <input className="inp" style={{ flex: 1, fontSize: 13, borderColor: "#f0d8a8", padding: "8px 12px" }}
                placeholder="Es: vede pois invece che applicazioni perle o strass"
                value={it.corrHint || ""}
                onChange={(e) => dispatch({ type: "SET_ITEM", idx, payload: { corrHint: e.target.value } })}
                onKeyDown={(e) => { if (e.key === "Enter") onSuggestCorr(idx); }}
              />
              <button className="btn btn-p" style={{ padding: "6px 14px", fontSize: 11, whiteSpace: "nowrap" }} onClick={() => onSuggestCorr(idx)}>Rielabora</button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded edit panel */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          {np > 1 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--muted)", marginBottom: 8 }}>Tutte le foto ({np})</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {allP.map((p: string, pi: number) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={pi} src={p} className="thumb thumb-zoom" style={{ width: 64, height: 80, borderRadius: 8 }} alt="" onClick={() => openLB(allP, pi)} />
                ))}
              </div>
            </div>
          )}
          <div className="grid2">
            <div className="field">
              <label>Nome Prodotto</label>
              <input className="inp" defaultValue={it.nm} onBlur={(e) => dispatch({ type: "SET_ITEM", idx, payload: { nm: e.target.value } })} />
            </div>
            <div className="field">
              <label>Composizione</label>
              <input className="inp" placeholder="es: 100% cotone" defaultValue={it.cp}
                onBlur={(e) => {
                  const newDs = it.ds.replace(/Composizione:[\s\S]*$/, `Composizione:\u00A0${fmtComp(e.target.value)}`);
                  dispatch({ type: "SET_ITEM", idx, payload: { cp: e.target.value, ds: newDs } });
                }} />
            </div>
          </div>
          <div className="field">
            <label>Descrizione Breve</label>
            <textarea className="inp" rows={5} style={{ fontSize: 13 }} defaultValue={it.ds}
              onBlur={(e) => dispatch({ type: "SET_ITEM", idx, payload: { ds: e.target.value } })} />
          </div>
          <div className="field">
            <label>Descrizione Lunga (SEO)</label>
            <textarea className="inp" rows={8} style={{ fontSize: 13 }} defaultValue={it.dl}
              onBlur={(e) => dispatch({ type: "SET_ITEM", idx, payload: { dl: e.target.value } })} />
            <button className="btn btn-s" style={{ padding: "5px 14px", fontSize: 11, marginTop: 6 }} onClick={() => onRegenLong(idx)}>🔄 Rigenera desc. lunga</button>
          </div>
          <div className="field">
            <label>Tag SEO</label>
            <textarea className="inp" rows={2} style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }} defaultValue={it.tg}
              onBlur={(e) => dispatch({ type: "SET_ITEM", idx, payload: { tg: e.target.value } })} />
          </div>
          <div className="grid3">
            <div className="field">
              <label>Meta Titolo</label>
              <input className="inp" style={{ fontSize: 12 }} defaultValue={it.metaTitle || ""}
                onBlur={(e) => dispatch({ type: "SET_ITEM", idx, payload: { metaTitle: e.target.value } })} />
            </div>
            <div className="field">
              <label>Meta Descrizione</label>
              <input className="inp" style={{ fontSize: 12 }} defaultValue={it.metaDesc || ""}
                onBlur={(e) => dispatch({ type: "SET_ITEM", idx, payload: { metaDesc: e.target.value } })} />
            </div>
            <div className="field">
              <label>Meta Keywords</label>
              <input className="inp" style={{ fontSize: 12 }} defaultValue={it.metaKeys || ""}
                onBlur={(e) => dispatch({ type: "SET_ITEM", idx, payload: { metaKeys: e.target.value } })} />
            </div>
          </div>
          <div className="field">
            <label>Default Alt Image</label>
            <textarea className="inp" rows={2} style={{ fontSize: 12 }} defaultValue={it.altImg || ""}
              placeholder="Descrizione accessibile dell'immagine principale"
              onBlur={(e) => dispatch({ type: "SET_ITEM", idx, payload: { altImg: e.target.value } })} />
          </div>
          {cfg.br === "loveskin" && (
            <div className="field">
              <label>Categoria Loveskin</label>
              <select className="inp" onChange={(e) => {
                const tags = (LSC[e.target.value] || []).join("; ");
                dispatch({ type: "SET_ITEM", idx, payload: { tg: tags } });
              }}>
                <option>Seleziona...</option>
                {Object.keys(LSC).map(k => <option key={k}>{k}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
