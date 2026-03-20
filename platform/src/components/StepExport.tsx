"use client";

import { useStore } from "@/lib/store";
import { esc, wrapHtml, fmtComp, convertToPng, toB, mT, runPool } from "@/lib/utils";
import { SCMAP, SHOT_ORDER } from "@/lib/constants";
import { genMetaTitle, genMetaKeys, classifyPhotosPrompt } from "@/lib/ai-prompts";
import type { CatalogItem } from "@/lib/catalog-types";

declare const XLSX: any;
declare const JSZip: any;

interface StepExportProps {
  onFindCorrelations: () => void;
}

export default function StepExport({ onFindCorrelations }: StepExportProps) {
  const { state, dispatch, cAI, getExcelInfo } = useStore();
  const { items, corr, cL, cD, cfg, excelWb, excelRows, excelMap, excelFileName } = state;
  const done = items.filter(i => i.st === "done");

  const corrMap: Record<string, string> = {};
  corr.forEach(cr => cr.skus.forEach((s: string) => {
    const o = cr.skus.filter((x: string) => x !== s).join("; ");
    corrMap[s] = corrMap[s] ? corrMap[s] + "; " + o : o;
  }));

  const expCSV = () => {
    if (!done.length) return;
    let csv = "\uFEFF" + "SKU;Nome Prodotto;Tipo Articolo;Colore;Composizione;Descrizione Breve;Descrizione Lunga;Tag SEO;Prodotti Correlati\n";
    done.forEach(i => {
      csv += [esc(i.sku), esc(i.nm), esc(i.tp), esc(i.cl), esc(i.cp), esc(i.ds), esc(i.dl), esc(i.tg), esc(corrMap[i.sku] || "")].join(";") + "\n";
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `catalogo_${cfg.br}_${SCMAP[cfg.st] || ""}${cfg.an}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportExcel = () => {
    if (!done.length || !excelWb) return;
    const srcWs = excelWb.Sheets[excelWb.SheetNames[0]];
    const ref = XLSX.utils.decode_range(srcWs["!ref"]);
    const maxCol = ref.e.c;

    const processedRows = new Set<number>();
    for (const it of done) { const ex = getExcelInfo(it.sku); if (ex) processedRows.add(ex.row); }

    for (const it of done) {
      const ex = getExcelInfo(it.sku);
      if (!ex) continue;
      const ri = ex.row;
      const setCell = (r: number, c: number, v: string) => {
        const addr = XLSX.utils.encode_cell({ r, c });
        const orig = srcWs[addr];
        if (orig) { orig.v = v; orig.t = "s"; delete orig.w; }
        else { srcWs[addr] = { v, t: "s" }; }
      };
      setCell(ri, 3, it.nm || "");
      setCell(ri, 4, wrapHtml(it.ds));
      setCell(ri, 5, wrapHtml(it.dl));
      setCell(ri, 8, it.metaTitle || genMetaTitle(it, cfg));
      setCell(ri, 9, it.metaDesc || "");
      setCell(ri, 10, it.metaKeys || genMetaKeys(it, cfg));
      setCell(ri, 12, it.tg || "");
      setCell(ri, 13, it.altImg || "");
      setCell(ri, 14, corrMap[it.sku] || "");
      // G default 1, H default 0
      const gAddr = XLSX.utils.encode_cell({ r: ri, c: 6 });
      const hAddr = XLSX.utils.encode_cell({ r: ri, c: 7 });
      if (!srcWs[gAddr] || srcWs[gAddr].v === "" || srcWs[gAddr].v == null) {
        if (srcWs[gAddr]) { srcWs[gAddr].v = 1; srcWs[gAddr].t = "n"; delete srcWs[gAddr].w; }
        else srcWs[gAddr] = { v: 1, t: "n" };
      }
      if (!srcWs[hAddr] || srcWs[hAddr].v === "" || srcWs[hAddr].v == null) {
        if (srcWs[hAddr]) { srcWs[hAddr].v = 0; srcWs[hAddr].t = "n"; delete srcWs[hAddr].w; }
        else srcWs[hAddr] = { v: 0, t: "n" };
      }
    }

    const keepRows = [0, 1, ...Array.from(processedRows).sort((a, b) => a - b)];
    const newWs: any = {};
    for (let ni = 0; ni < keepRows.length; ni++) {
      const oi = keepRows[ni];
      for (let c = 0; c <= maxCol; c++) {
        const srcAddr = XLSX.utils.encode_cell({ r: oi, c });
        const dstAddr = XLSX.utils.encode_cell({ r: ni, c });
        if (srcWs[srcAddr]) newWs[dstAddr] = JSON.parse(JSON.stringify(srcWs[srcAddr]));
      }
    }
    newWs["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: keepRows.length - 1, c: maxCol } });
    if (srcWs["!cols"]) newWs["!cols"] = JSON.parse(JSON.stringify(srcWs["!cols"]));
    if (srcWs["!rows"]) {
      newWs["!rows"] = [];
      for (let ni = 0; ni < keepRows.length; ni++) {
        if (srcWs["!rows"][keepRows[ni]]) newWs["!rows"][ni] = JSON.parse(JSON.stringify(srcWs["!rows"][keepRows[ni]]));
      }
    }
    if (srcWs["!merges"]) {
      const rowMap: Record<number, number> = {};
      keepRows.forEach((oi, ni) => rowMap[oi] = ni);
      newWs["!merges"] = [];
      for (const m of srcWs["!merges"]) {
        if (rowMap[m.s.r] != null && rowMap[m.e.r] != null) {
          newWs["!merges"].push({ s: { r: rowMap[m.s.r], c: m.s.c }, e: { r: rowMap[m.e.r], c: m.e.c } });
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, newWs, excelWb.SheetNames[0]);
    for (let i = 1; i < excelWb.SheetNames.length; i++) {
      XLSX.utils.book_append_sheet(wb, excelWb.Sheets[excelWb.SheetNames[i]], excelWb.SheetNames[i]);
    }
    const fname = excelFileName.replace(/\.[^.]+$/, "") + "_compilato.xlsx";
    XLSX.writeFile(wb, fname);
  };

  const downloadPhotos = async () => {
    if (!done.length) return;
    const zip = new JSZip();

    for (const it of done) {
      // Classify photos
      const ex = getExcelInfo(it.sku);
      const colori = (ex?.colori || it.cl || "").split(";").map((c: string) => c.trim()).filter(Boolean);
      const firstColor = colori[0] || it.cl || "Colore";

      let classified;
      try {
        const c: any[] = [];
        for (const f of it.af) c.push({ type: "image", source: { type: "base64", media_type: mT(f), data: await toB(f) } });
        c.push({ type: "text", text: classifyPhotosPrompt(it, colori, firstColor) });
        const raw = await cAI(c);
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        classified = parsed.map((x: any, i: number) => ({
          color: (x.color || firstColor).trim(), shot: x.shot || "other", file: it.af[i], origIdx: i,
        }));
        const usedPerColor: Record<string, boolean> = {};
        for (const ph of classified) {
          if (ph.shot === "other") continue;
          const key = ph.color + "||" + ph.shot;
          if (usedPerColor[key]) ph.shot = "other";
          else usedPerColor[key] = true;
        }
      } catch {
        classified = it.af.map((f: File, i: number) => ({ color: firstColor, shot: i === 0 ? "front_34" : "other", file: f, origIdx: i }));
      }

      const colorGroups: Record<string, any[]> = {};
      for (const ph of classified) {
        if (!colorGroups[ph.color]) colorGroups[ph.color] = [];
        colorGroups[ph.color].push(ph);
      }
      for (const col of Object.keys(colorGroups)) {
        colorGroups[col].sort((a: any, b: any) => (SHOT_ORDER[a.shot] ?? 5) - (SHOT_ORDER[b.shot] ?? 5));
      }

      const firstColorKey = Object.keys(colorGroups)[0];
      const firstPhoto = firstColorKey && colorGroups[firstColorKey][0];
      if (firstPhoto) {
        try { const blob = await convertToPng(firstPhoto.file); zip.file(`${it.sku}_1.png`, blob); } catch (e) { console.error("PNG convert error:", e); }
      }

      for (const [color, photos] of Object.entries(colorGroups)) {
        const colorName = color.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9àèéìòùÀÈÉÌÒÙ_]/g, "");
        for (let ci = 0; ci < (photos as any[]).length; ci++) {
          try { const blob = await convertToPng((photos as any[])[ci].file); zip.file(`${it.sku}_${colorName}_${ci + 1}.png`, blob); } catch (e) { console.error("PNG convert error:", e); }
        }
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = `foto_${cfg.br}_${SCMAP[cfg.st] || ""}${cfg.an}_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
  };

  // Correlation section
  let corrSection;
  if (cL) {
    corrSection = (
      <div style={{ textAlign: "center", padding: 30 }}>
        <div className="spinner" />
        <p style={{ fontSize: 13, color: "var(--muted)" }} className="animate-pulse-custom">Analisi correlazioni in corso...</p>
      </div>
    );
  } else if (corr.length) {
    corrSection = corr.map((cr, i) => (
      <div key={i} className="cc">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{cr.outfit_name || "Outfit"}</div>
        <div style={{ marginBottom: 6 }}>{(cr.skus || []).map((s: string) => <span key={s} className="cs">{s}</span>)}</div>
        <p style={{ fontSize: 12, color: "var(--muted)" }}>{cr.motivo || ""}</p>
      </div>
    ));
  } else if (cD && !corr.length) {
    corrSection = <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 20 }}>Nessun match visivo trovato.</p>;
  }

  // Table rows
  const tableRows = done.map(i => {
    const cr = corr.filter((c: any) => (c.skus || []).includes(i.sku)).flatMap((c: any) => (c.skus || []).filter((s: string) => s !== i.sku));
    const exi = getExcelInfo(i.sku);
    const cols = (exi?.colori || "").split(";").map((c: string) => c.trim()).filter(Boolean).join(", ");
    return (
      <tr key={i.sku}>
        <td className="sku">{i.sku}</td>
        <td>{i.nm}</td>
        <td>{i.tp}</td>
        <td style={{ fontSize: 11 }}>{cols || "—"}</td>
        <td style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={i.metaTitle || ""}>{i.metaTitle || "—"}</td>
        <td>{i.ap?.length || 1}</td>
        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{cr.join("; ") || "—"}</td>
      </tr>
    );
  });

  return (
    <div className="animate-fadeUp">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>Correlazioni &amp; Export</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>{done.length} prodotti pronti</p>
        </div>
        <button className="btn btn-s" onClick={() => dispatch({ type: "SET_STEP", payload: 1 })}>← Catalogo</button>
      </div>

      {/* Correlations */}
      <div style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Prodotti Correlati</h3>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Confronto visivo per outfit dallo stesso scatto</p>
          </div>
          <button className="btn btn-p" disabled={done.length < 2 || cL} onClick={onFindCorrelations}>
            {cL ? "Analisi..." : cD ? "Ricalcola" : "Trova Correlazioni"}
          </button>
        </div>
        {corrSection}
      </div>

      {/* Preview table */}
      <div style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 600 }}>Anteprima</div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                {["SKU", "Nome", "Tipo", "Colori", "Meta Titolo", "Foto", "Correlati"].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>{tableRows}</tbody>
          </table>
        </div>
      </div>

      {/* Export buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
        {excelWb ? (
          <button className="btn btn-g" disabled={!done.length} style={{ padding: "14px 40px", fontSize: 15, borderRadius: 12 }} onClick={exportExcel}>
            📊 Scarica Excel ({done.length} prodotti)
          </button>
        ) : (
          <button className="btn btn-g" disabled={!done.length} style={{ padding: "14px 40px", fontSize: 15, borderRadius: 12 }} onClick={expCSV}>
            ⬇ Scarica CSV ({done.length} prodotti)
          </button>
        )}
        <button className="btn btn-p" disabled={!done.length} style={{ padding: "14px 40px", fontSize: 15, borderRadius: 12 }}
          onClick={async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.textContent = "Preparazione ZIP...";
            try {
              await downloadPhotos();
            } catch (err: any) {
              alert("Errore: " + err.message);
            }
            btn.disabled = false;
            btn.textContent = "📸 Scarica Foto Rinominate";
          }}>
          📸 Scarica Foto Rinominate
        </button>
      </div>
    </div>
  );
}
