"use client";

import { useState } from "react";
import JSZip from "jszip";
import { useStore } from "@/lib/store";
import { toB, mT } from "@/lib/utils";
import { SCMAP } from "@/lib/constants";

interface StillLifeItem {
  sku: string;
  color: string;
  sourcePreview: string;
  sourceFile: File;
  generated: string | null;
  loading: boolean;
  error: string | null;
}

export default function StepStillLife() {
  const { state, dispatch } = useStore();
  const { items, cfg } = state;
  const done = items.filter(i => i.st === "done");

  const [phase, setPhase] = useState<"intro" | "generating" | "preview">("intro");
  const [slItems, setSlItems] = useState<StillLifeItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [zipProgress, setZipProgress] = useState<number | null>(null);

  const buildItems = (): StillLifeItem[] => {
    return done.map(it => ({
      sku: it.sku,
      color: it.cl || it.ai?.colore_madre || "Colore",
      sourcePreview: it.ap?.[0] || "",
      sourceFile: it.af?.[0],
      generated: null,
      loading: false,
      error: null,
    })).filter(it => it.sourceFile);
  };

  const generateStillLife = async (sourceFile: File): Promise<string> => {
    const b64 = await toB(sourceFile);
    const mediaType = mT(sourceFile);

    const response = await fetch("/api/ai/image-gen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: b64,
        mimeType: mediaType,
        prompt: `Genera un'immagine still life piatto (flat lay) di questo capo di abbigliamento.

ISTRUZIONI PRECISE:
- Il capo deve essere disteso in piano come se fosse appoggiato su una superficie bianca, visto dall'alto
- Lo sfondo deve essere BIANCO PURO
- Il capo deve essere ben centrato nell'immagine
- Nessuna modella, nessun manichino, solo il capo disteso piatto
- Mantieni i colori e i dettagli originali del capo il più fedelmente possibile
- L'immagine deve essere nitida e professionale, come una foto per e-commerce
- Formato: quadrato, alta risoluzione

Genera SOLO l'immagine, senza testo.`,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(err.error || `Errore API: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    if (!data.imageBase64) throw new Error("Nessuna immagine generata");

    return `data:${data.mimeType || "image/png"};base64,${data.imageBase64}`;
  };

  const startGeneration = async () => {
    const list = buildItems();
    setSlItems(list);
    setPhase("generating");
    setProgress(0);

    const updated = [...list];
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], loading: true };
      setSlItems([...updated]);
      setProgress(Math.round(((i) / updated.length) * 100));

      try {
        const dataUrl = await generateStillLife(updated[i].sourceFile);
        updated[i] = { ...updated[i], generated: dataUrl, loading: false };
      } catch (err: any) {
        console.error("Still life error:", err);
        updated[i] = { ...updated[i], error: err.message || "Errore generazione", loading: false };
      }
      setSlItems([...updated]);
    }

    setProgress(100);
    setPhase("preview");
  };

  const downloadZip = async () => {
    const generated = slItems.filter(it => it.generated);
    if (!generated.length) return;
    setZipProgress(0);

    const zip = new JSZip();
    for (let i = 0; i < generated.length; i++) {
      const it = generated[i];
      const colorName = it.color.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9àèéìòùÀÈÉÌÒÙ_]/g, "");
      const fileName = `${it.sku}_${colorName}_SL_1.png`;

      const b64 = it.generated!.split(",")[1];
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
      zip.file(fileName, bytes);

      setZipProgress(Math.round(((i + 1) / generated.length) * 100));
    }

    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = `stilllife_${cfg.br}_${SCMAP[cfg.st] || ""}${cfg.an}_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    setTimeout(() => setZipProgress(null), 1500);
  };

  const generatedCount = slItems.filter(it => it.generated).length;
  const errorCount = slItems.filter(it => it.error).length;

  return (
    <div className="animate-fadeUp">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>Still Life Piatto</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Genera immagini flat lay su sfondo bianco per l{"'"}e-commerce</p>
        </div>
        <button className="btn btn-s" onClick={() => dispatch({ type: "SET_STEP", payload: 2 })}>← Export</button>
      </div>

      {phase === "intro" && (
        <div>
          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Come funziona?</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20, lineHeight: 1.6 }}>
              L{"'"}AI (Google Gemini) analizza la foto principale di ogni prodotto e genera
              un{"'"}immagine flat lay: il capo disteso in piano su sfondo bianco, come una foto
              professionale per e-commerce. L{"'"}elaborazione richiede circa 10-20 secondi per prodotto.
            </p>
            <div style={{ display: "flex", gap: 24, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 200, height: 200, borderRadius: 12, border: "2px solid var(--border)", overflow: "hidden", background: "var(--subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {done[0]?.ap?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={done[0].ap[0]} alt="Foto originale" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 40 }}>📸</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Foto originale (con modella)</p>
              </div>
              <div style={{ fontSize: 32, color: "var(--accent2)" }}>→</div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: 200, height: 200, borderRadius: 12, border: "2px dashed var(--accent2)",
                  overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                  background: "#fff",
                }}>
                  <span style={{ fontSize: 40 }}>👕</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--accent2)", fontWeight: 600, marginTop: 8 }}>Still Life (sfondo bianco)</p>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24, textAlign: "center" }}>
            <p style={{ fontSize: 14, marginBottom: 16 }}>
              <strong>{done.length}</strong> prodotti pronti per la generazione still life
            </p>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
              Ogni immagine costa circa $0.04 (Gemini 2.5 Flash Image).
            </p>
            <button className="btn btn-p" style={{ padding: "14px 40px", fontSize: 15, borderRadius: 12 }}
              onClick={startGeneration} disabled={!done.length}>
              Genera Still Life ({done.length} prodotti)
            </button>
          </div>
        </div>
      )}

      {phase === "generating" && (
        <div className="card" style={{ padding: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div className="spinner" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Generazione in corso...</h3>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              {generatedCount + errorCount}/{slItems.length} completati • {progress}%
            </p>
          </div>
          <div style={{ height: 8, background: "var(--subtle)", borderRadius: 4, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent2)", borderRadius: 4, transition: "width 0.3s" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
            {slItems.map(it => (
              <div key={it.sku} style={{ textAlign: "center", padding: 8, borderRadius: 8, border: "1px solid var(--border)", background: "var(--subtle)" }}>
                {it.loading ? (
                  <div style={{ width: 80, height: 80, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="spinner" style={{ width: 24, height: 24 }} />
                  </div>
                ) : it.generated ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.generated} alt={it.sku} style={{ width: 80, height: 80, objectFit: "contain", margin: "0 auto", borderRadius: 6 }} />
                ) : it.error ? (
                  <div title={it.error} style={{ width: 80, height: 80, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--err)", fontSize: 9, padding: 4, textAlign: "center" }}>{it.error.slice(0, 60)}</div>
                ) : (
                  <div style={{ width: 80, height: 80, margin: "0 auto", background: "var(--border)", borderRadius: 6 }} />
                )}
                <p style={{ fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.sku}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "preview" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <p style={{ fontSize: 14 }}>
              <strong style={{ color: "var(--ok)" }}>{generatedCount}</strong> still life generati
              {errorCount > 0 && <> • <strong style={{ color: "var(--err)" }}>{errorCount}</strong> errori</>}
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {zipProgress !== null && (
                <div style={{ width: 120 }}>
                  <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${zipProgress}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                </div>
              )}
              <button className="btn btn-g" disabled={!generatedCount || zipProgress !== null}
                style={{ padding: "12px 32px", fontSize: 14, borderRadius: 10 }}
                onClick={downloadZip}>
                {zipProgress !== null ? `Creazione ZIP... ${zipProgress}%` : `Scarica (${generatedCount} immagini)`}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {slItems.map(it => (
              <div key={it.sku} className="card" style={{ padding: 12, textAlign: "center" }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.sourcePreview} alt="Originale" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                    <p style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>Originale</p>
                  </div>
                  <div>
                    {it.generated ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.generated} alt="Still Life"
                        style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 6, border: "2px solid var(--accent2)", background: "#fff" }} />
                    ) : (
                      <div title={it.error || "Errore"} style={{
                        width: 80, height: 80, borderRadius: 6, border: "2px solid var(--err)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, color: "var(--err)", background: "#fff5f5", padding: 4, textAlign: "center",
                      }}>{(it.error || "Errore").slice(0, 50)}</div>
                    )}
                    <p style={{ fontSize: 9, color: it.generated ? "var(--accent2)" : "var(--err)", fontWeight: 600, marginTop: 2 }}>
                      {it.generated ? "Still Life" : "Fallito"}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{it.sku}</p>
                <p style={{ fontSize: 10, color: "var(--muted)" }}>
                  {it.color} • {it.sku}_{it.color.replace(/\s+/g, "_")}_SL_1.png
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
