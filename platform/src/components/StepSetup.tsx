"use client";

import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useStore } from "@/lib/store";
import { TS_SIZES, TL_SIZES, BRA_SIZES, SHOE_SIZES } from "@/lib/constants";
import { fD, resizeImg } from "@/lib/utils";
import type { ExcelInfo } from "@/lib/catalog-types";

export default function StepSetup() {
  const { state, dispatch } = useStore();
  const { cfg, mod, facePh, nM, tmpFaces, tmpNm, tmpAl, tmpTs, tmpTi, tmpTr, tmpNs, excelWb, excelRows, excelMap, excelFileName } = state;
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Load models from database API on mount (single source of truth)
  useEffect(() => {
    if (modelsLoaded) return;
    fetch('/api/models')
      .then(r => r.ok ? r.json() : [])
      .then((dbModels: any[]) => {
        if (!Array.isArray(dbModels)) return;
        const newMod = dbModels.map(m => ({
          nome: m.name,
          altezza: m.heightCm?.toString() || '',
          tagliaSopra: m.sizeTop || '',
          tagliaSotto: m.sizeBottom || '',
          tagliaReggiseno: m.sizeBra || '',
          numeroScarpe: m.sizeShoe || '',
          dbId: m.id,
        }));
        const newFacePh: Record<string, string[]> = {};
        for (const m of dbModels) {
          if (m.facePhotos?.length) {
            newFacePh[m.name] = m.facePhotos.map((p: any) => p.photoUrl);
          }
        }
        dispatch({ type: "SET_STATE", payload: { mod: newMod, facePh: newFacePh } });
        setModelsLoaded(true);
      })
      .catch(() => setModelsLoaded(true));
  }, [modelsLoaded, dispatch]);

  const needsModel = cfg.shootType === "model" || cfg.shootType === "mixed";
  const rdyMann = cfg.shootType === "mannequin" && cfg.mannequin?.taglia;
  const rdy = cfg.br && cfg.st && cfg.an && cfg.ds && cfg.shootType &&
    (cfg.shootType === "still" || cfg.shootType === "model_no_size" || rdyMann || (cfg.selMods.length > 0));

  const toggleMod = (nome: string) => {
    const selMods = cfg.selMods.includes(nome)
      ? cfg.selMods.filter(n => n !== nome)
      : [...cfg.selMods, nome];
    dispatch({ type: "SET_CFG", payload: { selMods } });
  };

  const removeMod = async (nome: string) => {
    // Find DB id if available and delete from API
    const modelToRemove = mod.find(x => x.nome === nome);
    if (modelToRemove?.dbId) {
      try {
        await fetch(`/api/models/${modelToRemove.dbId}`, { method: 'DELETE' });
      } catch { /* ignore API errors */ }
    }

    const newMod = mod.filter(x => x.nome !== nome);
    const newFacePh = { ...facePh };
    delete newFacePh[nome];
    dispatch({
      type: "SET_STATE",
      payload: { mod: newMod, facePh: newFacePh },
    });
    dispatch({ type: "SET_CFG", payload: { selMods: cfg.selMods.filter(n => n !== nome) } });
  };

  const addFacePhoto = (modelName: string) => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/*";
    i.multiple = true;
    i.onchange = async () => {
      const files = Array.from(i.files || []);
      const newFacePh = { ...facePh };
      if (!newFacePh[modelName]) newFacePh[modelName] = [];
      for (const f of files) {
        const d = await resizeImg(f);
        newFacePh[modelName] = [...newFacePh[modelName], d];
      }
      dispatch({ type: "SET_STATE", payload: { facePh: newFacePh } });
    };
    i.click();
  };

  const removeFace = (modelName: string, idx: number) => {
    const newFacePh = { ...facePh };
    if (newFacePh[modelName]) {
      newFacePh[modelName] = newFacePh[modelName].filter((_: string, i: number) => i !== idx);
      if (!newFacePh[modelName].length) delete newFacePh[modelName];
      dispatch({ type: "SET_STATE", payload: { facePh: newFacePh } });
    }
  };

  const addTmpFace = () => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/*";
    i.multiple = true;
    i.onchange = async () => {
      const newFaces = [...tmpFaces];
      for (const f of Array.from(i.files || [])) {
        const d = await resizeImg(f);
        newFaces.push(d);
      }
      dispatch({ type: "SET_STATE", payload: { tmpFaces: newFaces } });
    };
    i.click();
  };

  const removeTmpFace = (idx: number) => {
    dispatch({ type: "SET_STATE", payload: { tmpFaces: tmpFaces.filter((_: string, i: number) => i !== idx) } });
  };

  const saveNewModella = async () => {
    if (!tmpNm || !tmpAl || !tmpTs || !tmpTi) {
      alert("Compila tutti i campi: nome, altezza, taglia sopra e taglia sotto");
      return;
    }

    // Save to database API
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tmpNm, heightCm: parseInt(tmpAl), sizeTop: tmpTs, sizeBottom: tmpTi, sizeBra: tmpTr || null, sizeShoe: tmpNs || null }),
      });
      if (res.ok) {
        const savedModel = await res.json();
        // Upload face photos if any
        if (tmpFaces.length) {
          for (const dataUrl of tmpFaces) {
            try {
              const blob = await (await fetch(dataUrl)).blob();
              const formData = new FormData();
              formData.append('photos', new File([blob], 'face.jpg', { type: 'image/jpeg' }));
              await fetch(`/api/models/${savedModel.id}/photos`, { method: 'POST', body: formData });
            } catch { /* ignore individual photo upload errors */ }
          }
        }
      }
    } catch { /* ignore API errors, state updated below */ }

    // Update local state
    const newMod = [...mod.filter(x => x.nome !== tmpNm), { nome: tmpNm, altezza: tmpAl, tagliaSopra: tmpTs, tagliaSotto: tmpTi, tagliaReggiseno: tmpTr, numeroScarpe: tmpNs }];
    const newFacePh = { ...facePh };
    if (tmpFaces.length) {
      newFacePh[tmpNm] = [...tmpFaces];
    }
    const selMods = cfg.selMods.includes(tmpNm) ? cfg.selMods : [...cfg.selMods, tmpNm];
    dispatch({
      type: "SET_STATE",
      payload: { mod: newMod, facePh: newFacePh, tmpFaces: [], tmpNm: "", tmpAl: "", tmpTs: "", tmpTi: "", tmpTr: "", tmpNs: "", nM: false },
    });
    dispatch({ type: "SET_CFG", payload: { selMods } });
  };

  const parseExcel = (file: File) => {
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellStyles: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        const newMap: Record<string, ExcelInfo> = {};
        for (let i = 2; i < json.length; i++) {
          const row = json[i];
          const sku = (row[0] || "").toString().trim().toUpperCase();
          if (sku) newMap[sku] = {
            row: i, codice: sku, colori: (row[2] || "").toString(),
            anno: (row[16] || "").toString(), stagione: (row[17] || "").toString(),
            tipoArticolo: (row[19] || "").toString(), brand: (row[20] || "").toString(),
            caratteristica: (row[21] || "").toString(), composizione: (row[27] || "").toString(),
          };
        }
        dispatch({
          type: "SET_STATE",
          payload: { excelWb: wb, excelRows: json, excelMap: newMap, excelFileName: file.name },
        });
      } catch (err: any) {
        alert("Errore lettura Excel: " + err.message);
      }
    };
    r.readAsArrayBuffer(file);
  };

  const handleExcelUpload = () => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = ".xlsx,.xls";
    i.onchange = () => { if (i.files?.[0]) parseExcel(i.files[0]); };
    i.click();
  };

  return (
    <div className="animate-fadeUpSlow">
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Configurazione Shooting</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 32 }}>Imposta i parametri prima di caricare le foto</p>

      <div className="grid2">
        <div className="field">
          <label>Brand</label>
          <div style={{ display: "flex", gap: 10 }}>
            <button className={`brand-btn ${cfg.br === "zuiki" ? "active" : ""}`} onClick={() => dispatch({ type: "SET_CFG", payload: { br: "zuiki" } })}>Zuiki</button>
            <button className={`brand-btn ${cfg.br === "loveskin" ? "active" : ""}`} onClick={() => dispatch({ type: "SET_CFG", payload: { br: "loveskin" } })}>Loveskin</button>
          </div>
        </div>
        <div className="field">
          <label>Data Shooting</label>
          <input
            className="inp"
            placeholder="gg/mm/aaaa"
            maxLength={10}
            value={fD(cfg.ds)}
            onChange={(e) => {
              const r = e.target.value.replace(/\D/g, "").slice(0, 8);
              dispatch({ type: "SET_CFG", payload: { ds: r } });
            }}
          />
        </div>
        <div className="field">
          <label>Stagione</label>
          <div style={{ display: "flex", gap: 10 }}>
            <button className={`brand-btn ${cfg.st === "Primavera/Estate" ? "active" : ""}`} onClick={() => dispatch({ type: "SET_CFG", payload: { st: "Primavera/Estate" } })}>Primavera/Estate</button>
            <button className={`brand-btn ${cfg.st === "Autunno/Inverno" ? "active" : ""}`} onClick={() => dispatch({ type: "SET_CFG", payload: { st: "Autunno/Inverno" } })}>Autunno/Inverno</button>
          </div>
        </div>
        <div className="field">
          <label>Anno (es: 26)</label>
          <input
            className="inp"
            placeholder="26"
            maxLength={2}
            value={cfg.an}
            onChange={(e) => dispatch({ type: "SET_CFG", payload: { an: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) } })}
          />
        </div>
      </div>

      {/* Shooting Type */}
      <div style={{ marginTop: 16 }}>
        <div className="field">
          <label>Tipo Shooting</label>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { key: "model", label: "Con Modella" },
              { key: "model_no_size", label: "Modella NO TAGLIE" },
              { key: "mannequin", label: "Con Manichino" },
              { key: "still", label: "Still Life" },
              { key: "mixed", label: "Misto" },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`brand-btn ${cfg.shootType === key ? "active" : ""}`}
                onClick={() => {
                  const updates: any = { shootType: key };
                  if (key === "mannequin" || key === "still") {
                    updates.noModel = true;
                    updates.selMods = [];
                  }
                  if (key === "model_no_size") {
                    updates.noModel = true;
                    updates.selMods = [];
                  }
                  if (key === "model" || key === "mixed") {
                    if (!mod.length) dispatch({ type: "SET_STATE", payload: { nM: true } });
                  }
                  dispatch({ type: "SET_CFG", payload: updates });
                  if (key !== "mannequin") dispatch({ type: "SET_STATE", payload: { nMann: false } });
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Models section */}
      {needsModel && (
        <div style={{ marginTop: 16, padding: 20, background: "var(--subtle)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600 }}>
              Modelle{cfg.selMods.length ? ` (${cfg.selMods.length} selezionat${cfg.selMods.length > 1 ? "e" : "a"})` : ""}
            </h3>
            {!nM && mod.length > 0 && (
              <button className="btn btn-s" style={{ padding: "5px 14px", fontSize: 11 }}
                onClick={() => dispatch({ type: "SET_STATE", payload: { nM: true, tmpFaces: [], tmpNm: "", tmpAl: "", tmpTs: "", tmpTi: "", tmpTr: "", tmpNs: "" } })}>
                + Nuova modella
              </button>
            )}
          </div>
          {mod.length > 0 && !nM && <p style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8 }}>Clicca per selezionare/deselezionare le modelle di questo shooting</p>}
          {!mod.length && !nM && <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Nessuna modella salvata. Aggiungine una per iniziare.</p>}

          {/* Model buttons */}
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {mod.map(ml => {
              const fp = facePh[ml.nome] || [];
              const isSel = cfg.selMods.includes(ml.nome);
              return (
                <div key={ml.nome} style={{ display: "flex", alignItems: "center", margin: "0 8px 8px 0" }}>
                  <button className={`mb ${isSel && !nM ? "act" : ""}`} onClick={() => toggleMod(ml.nome)}>
                    {fp.length > 0 && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fp[0]} className="face-thumb-sm" style={{ marginRight: 6 }} alt="" />
                    )}
                    {ml.nome} <span style={{ fontSize: 10, opacity: .7, marginLeft: 6 }}>{ml.altezza}cm · {ml.tagliaSopra}/{ml.tagliaSotto}{ml.tagliaReggiseno ? ` · Reg.${ml.tagliaReggiseno}` : ''}{ml.numeroScarpe ? ` · Sc.${ml.numeroScarpe}` : ''}</span>
                  </button>
                  <button className="md" onClick={() => removeMod(ml.nome)}>✕</button>
                </div>
              );
            })}
          </div>

          {/* Selected models info */}
          {!nM && cfg.selMods.map(nm => {
            const ml = mod.find(x => x.nome === nm);
            if (!ml) return null;
            const fp = facePh[nm] || [];
            return (
              <div key={nm} style={{ marginTop: 10, padding: 12, background: "var(--card)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>{ml.nome}</strong>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{ml.altezza}cm · {ml.tagliaSopra}/{ml.tagliaSotto}{ml.tagliaReggiseno ? ` · Reg.${ml.tagliaReggiseno}` : ''}{ml.numeroScarpe ? ` · Sc.${ml.numeroScarpe}` : ''}</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {fp.map((f: string, fi: number) => (
                    <div key={fi} style={{ position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f} className="face-thumb" style={{ width: 36, height: 36 }} alt="" />
                      <button onClick={() => removeFace(nm, fi)} style={{ position: "absolute", top: -3, right: -3, width: 14, height: 14, borderRadius: "50%", background: "var(--err)", color: "#fff", border: "none", fontSize: 8, cursor: "pointer", lineHeight: "14px", padding: 0 }}>✕</button>
                    </div>
                  ))}
                  <div className="face-add" style={{ width: 36, height: 36, fontSize: 14 }} onClick={() => addFacePhoto(nm)}>+</div>
                  {!fp.length && <span style={{ fontSize: 10, color: "var(--warn)" }}>⚠ Nessuna foto volto</span>}
                </div>
              </div>
            );
          })}

          {/* New model form */}
          {nM && (
            <>
              <div className="grid2" style={{ marginTop: 10 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Nome Modella</label>
                  <input className="inp" placeholder="Es: Valentina" value={tmpNm}
                    onChange={(e) => dispatch({ type: "SET_STATE", payload: { tmpNm: e.target.value } })} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Altezza (cm)</label>
                  <input className="inp" placeholder="173" value={tmpAl}
                    onChange={(e) => dispatch({ type: "SET_STATE", payload: { tmpAl: e.target.value.replace(/[^0-9]/g, "") } })} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Taglia parte superiore</label>
                  <select className="inp" value={tmpTs} onChange={(e) => dispatch({ type: "SET_STATE", payload: { tmpTs: e.target.value } })}>
                    <option value="">Seleziona...</option>
                    {TL_SIZES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Taglia parte inferiore</label>
                  <select className="inp" value={tmpTi} onChange={(e) => dispatch({ type: "SET_STATE", payload: { tmpTi: e.target.value } })}>
                    <option value="">Seleziona...</option>
                    {TS_SIZES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Taglia reggiseno</label>
                  <select className="inp" value={tmpTr} onChange={(e) => dispatch({ type: "SET_STATE", payload: { tmpTr: e.target.value } })}>
                    <option value="">Seleziona...</option>
                    {BRA_SIZES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Numero scarpe</label>
                  <select className="inp" value={tmpNs} onChange={(e) => dispatch({ type: "SET_STATE", payload: { tmpNs: e.target.value } })}>
                    <option value="">Seleziona...</option>
                    {SHOE_SIZES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--muted)", marginBottom: 8 }}>Foto Volto (per riconoscimento)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {tmpFaces.map((f, fi) => (
                    <div key={fi} style={{ position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f} className="face-thumb" alt="" />
                      <button onClick={() => removeTmpFace(fi)} style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "var(--err)", color: "#fff", border: "none", fontSize: 10, cursor: "pointer", lineHeight: "16px", padding: 0 }}>✕</button>
                    </div>
                  ))}
                  <div className="face-add" onClick={addTmpFace}>+</div>
                </div>
                <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>Carica 1+ foto del volto per identificare la modella nelle foto dei capi</p>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button className="btn btn-p" style={{ padding: "8px 18px", fontSize: 12 }} onClick={saveNewModella}>💾 Salva modella</button>
                <button className="btn btn-s" style={{ padding: "8px 18px", fontSize: 12 }}
                  onClick={() => dispatch({ type: "SET_STATE", payload: { nM: false, tmpFaces: [], tmpNm: "", tmpAl: "", tmpTs: "", tmpTi: "", tmpTr: "", tmpNs: "" } })}>
                  Annulla
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Mannequin config */}
      {cfg.shootType === "mannequin" && (
        <div style={{ marginTop: 16, padding: 20, background: "var(--subtle)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Misure Manichino</h3>
          <div className="grid2" style={{ gap: 14 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Taglia</label>
              <select className="inp" value={cfg.mannequin?.taglia || ""}
                onChange={(e) => dispatch({ type: "SET_CFG", payload: { mannequin: { ...cfg.mannequin, taglia: e.target.value } } })}>
                <option value="">Seleziona...</option>
                {TS_SIZES.map(t => <option key={t}>{t}</option>)}
                {TL_SIZES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Petto (cm)</label>
              <input className="inp" type="number" placeholder="88" value={cfg.mannequin?.petto || ""}
                onChange={(e) => dispatch({ type: "SET_CFG", payload: { mannequin: { ...cfg.mannequin, petto: e.target.value } } })} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Vita (cm)</label>
              <input className="inp" type="number" placeholder="68" value={cfg.mannequin?.vita || ""}
                onChange={(e) => dispatch({ type: "SET_CFG", payload: { mannequin: { ...cfg.mannequin, vita: e.target.value } } })} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Fianchi (cm)</label>
              <input className="inp" type="number" placeholder="96" value={cfg.mannequin?.fianchi || ""}
                onChange={(e) => dispatch({ type: "SET_CFG", payload: { mannequin: { ...cfg.mannequin, fianchi: e.target.value } } })} />
            </div>
          </div>
        </div>
      )}

      {/* Excel upload */}
      <div style={{ marginTop: 20, padding: 20, background: "var(--subtle)", borderRadius: 12, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600 }}>File Excel Dati Tecnici</h3>
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Carica il file Excel con i dati tecnici degli articoli (colonne A, C, Q, R, T, U, V, AB)</p>
          </div>
        </div>
        {excelWb ? (
          <div style={{ padding: "12px 16px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>📊</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{excelFileName}</p>
                <p style={{ fontSize: 11, color: "var(--muted)" }}>{excelRows.length - 2} articoli trovati · {Object.keys(excelMap).length} codici mappati</p>
              </div>
            </div>
            <button className="btn btn-d" style={{ padding: "5px 12px", fontSize: 11 }}
              onClick={() => dispatch({ type: "SET_STATE", payload: { excelWb: null, excelRows: [], excelMap: {}, excelFileName: "" } })}>
              ✕ Rimuovi
            </button>
          </div>
        ) : (
          <div className="drop" style={{ padding: 24, margin: 0 }} onClick={handleExcelUpload}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ov"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("ov")}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("ov"); if (e.dataTransfer.files[0]) parseExcel(e.dataTransfer.files[0]); }}>
            <p style={{ fontSize: 14, fontWeight: 500 }}>📊 Trascina o clicca per caricare il file Excel</p>
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Formati accettati: .xlsx, .xls</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28, gap: 10 }}>
        <button className="btn btn-s" onClick={() => dispatch({ type: "SET_STEP", payload: -1 })}>⚙ API Key</button>
        <button className="btn btn-p" disabled={!rdy}
          onClick={async () => {
            dispatch({ type: "SET_CFG", payload: { noModel: cfg.shootType === "still" || cfg.shootType === "mixed" } });
            // Create session in DB
            try {
              const ds = cfg.ds;
              const shootingDate = ds.length === 8
                ? `${ds.slice(4, 8)}-${ds.slice(2, 4)}-${ds.slice(0, 2)}`
                : new Date().toISOString().slice(0, 10);
              const modelDbIds = mod.filter(m => cfg.selMods.includes(m.nome) && m.dbId).map(m => m.dbId);
              const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  brand: cfg.br,
                  season: cfg.st,
                  year: cfg.an,
                  shootingDate,
                  shootType: cfg.shootType,
                  modelIds: modelDbIds.length ? modelDbIds : undefined,
                  mannequin: cfg.shootType === 'mannequin' && cfg.mannequin?.taglia ? {
                    size: cfg.mannequin.taglia,
                    bustCm: cfg.mannequin.petto ? parseInt(cfg.mannequin.petto) : undefined,
                    waistCm: cfg.mannequin.vita ? parseInt(cfg.mannequin.vita) : undefined,
                    hipsCm: cfg.mannequin.fianchi ? parseInt(cfg.mannequin.fianchi) : undefined,
                  } : undefined,
                }),
              });
              if (res.ok) {
                const sess = await res.json();
                dispatch({ type: "SET_STATE", payload: { sessionId: sess.id } });
              }
            } catch { /* session creation failure is non-blocking */ }
            dispatch({ type: "SET_STEP", payload: 1 });
          }}>
          Inizia Catalogazione →
        </button>
      </div>
    </div>
  );
}
