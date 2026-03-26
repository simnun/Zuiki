"use client";

import { SFX, SHOT_ORDER, SCMAP, COL } from "./constants";
import type { CatalogItem, ExcelInfo, SessionConfig, ModellaInfo } from "./catalog-types";
import { pSKU, gSuf, mNm, mDs, mTags, mTagsLoveskin, toB, mT, runPool, compressForAI } from "./utils";
import { mPr, mPrLong, genMetaTitle, genMetaDescPrompt, genMetaKeys, genAltImgPrompt, classifyPhotosPrompt, classifyPhotosStrictPrompt } from "./ai-prompts";

type CaiFunc = (content: any, retries?: number) => Promise<string>;
type DispatchFunc = (action: any) => void;
type GetExcelInfoFunc = (sku: string) => ExcelInfo | null;

interface ProcessorDeps {
  cAI: CaiFunc;
  dispatch: DispatchFunc;
  getExcelInfo: GetExcelInfoFunc;
  getState: () => any;
}

export function createProcessor(deps: ProcessorDeps) {
  const { cAI, dispatch, getExcelInfo, getState } = deps;

  async function aImgs(files: File[], tipo: string, exInfo: ExcelInfo | null) {
    const state = getState();
    const { cfg, mod, facePh } = state;
    const c: any[] = [];
    const modelNames: string[] = [];

    for (const ml of mod.filter((x: ModellaInfo) => cfg.selMods.includes(x.nome))) {
      const fp = facePh[ml.nome] || [];
      if (fp.length) {
        modelNames.push(ml.nome);
        c.push({ type: "text", text: `[FOTO RIFERIMENTO VOLTO: ${ml.nome}]` });
        for (const fd of fp) {
          const b64 = fd.split(",")[1] || fd;
          c.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } });
        }
      }
    }
    if (modelNames.length) c.push({ type: "text", text: "--- FINE FOTO RIFERIMENTO VOLTI. Le foto seguenti sono del PRODOTTO da catalogare ---" });

    for (const f of files) {
      const { base64, mimeType } = await compressForAI(f);
      c.push({ type: "image", source: { type: "base64", media_type: mimeType, data: base64 } });
    }
    c.push({ type: "text", text: mPr(cfg.br, tipo, files.length, modelNames, exInfo) });

    const raw = await cAI(c);
    try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
    catch { throw new Error(`Risposta AI non valida (JSON parse): ${raw.slice(0, 150)}...`); }
  }

  // Validate classified colors against allowed list
  function validateClassifiedColors(classified: any[], allowedColors: string[], fallbackColor: string) {
    const allowedLower = allowedColors.map(c => c.toLowerCase().trim());
    for (const ph of classified) {
      const colorLower = (ph.color || "").toLowerCase().trim();
      const exactIdx = allowedLower.indexOf(colorLower);
      if (exactIdx >= 0) {
        ph.color = allowedColors[exactIdx];
        continue;
      }
      // Fuzzy match
      let bestMatch: string | null = null;
      for (let i = 0; i < allowedColors.length; i++) {
        if (colorLower.includes(allowedLower[i]) || allowedLower[i].includes(colorLower)) {
          bestMatch = allowedColors[i];
          break;
        }
      }
      ph.color = bestMatch || fallbackColor;
    }
    return classified;
  }

  async function classifyPhotos(it: CatalogItem) {
    const ex = getExcelInfo(it.sku);
    const colori = (ex?.colori || "").split(";").map(c => c.trim()).filter(Boolean);
    const fallbackColor = colori[0] || it.cl || "Colore";
    const allowedColors = colori.length > 0 ? colori : COL;

    const c: any[] = [];
    for (const f of it.af) {
      const { base64, mimeType } = await compressForAI(f);
      c.push({ type: "image", source: { type: "base64", media_type: mimeType, data: base64 } });
    }
    c.push({ type: "text", text: classifyPhotosPrompt(it, colori, fallbackColor) });

    try {
      const raw = await cAI(c);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

      // Validate response count matches photo count
      if (!Array.isArray(parsed) || parsed.length !== it.af.length) {
        console.warn(`[${it.sku}] AI classify returned ${Array.isArray(parsed) ? parsed.length : 0} results for ${it.af.length} photos`);
        throw new Error("Mismatch count");
      }

      let result = parsed.map((x: any, i: number) => ({
        color: (x.color || fallbackColor).trim(), shot: x.shot || "other", file: it.af[i], origIdx: i,
      }));

      // Validate colors against allowed list
      result = validateClassifiedColors(result, allowedColors, fallbackColor);

      // Deduplicate shot types per color
      const usedPerColor: Record<string, boolean> = {};
      for (const ph of result) {
        if (ph.shot === "other") continue;
        const key = ph.color + "||" + ph.shot;
        if (usedPerColor[key]) ph.shot = "other";
        else usedPerColor[key] = true;
      }

      // Verification: check if any colors are still outside allowed list
      const hasInvalid = result.some((ph: any) => !allowedColors.some(a => a.toLowerCase() === ph.color.toLowerCase()));
      if (hasInvalid) {
        console.warn(`[${it.sku}] Invalid colors after validation, re-classifying...`);
        const c2: any[] = [];
        for (const f of it.af) {
          const { base64, mimeType } = await compressForAI(f);
          c2.push({ type: "image", source: { type: "base64", media_type: mimeType, data: base64 } });
        }
        c2.push({ type: "text", text: classifyPhotosStrictPrompt(it, allowedColors) });
        try {
          const raw2 = await cAI(c2);
          const parsed2 = JSON.parse(raw2.replace(/```json|```/g, "").trim());
          if (Array.isArray(parsed2) && parsed2.length === it.af.length) {
            result = parsed2.map((x: any, i: number) => ({
              color: (x.color || fallbackColor).trim(), shot: x.shot || "other", file: it.af[i], origIdx: i,
            }));
            result = validateClassifiedColors(result, allowedColors, fallbackColor);
          }
        } catch { /* keep corrected first result */ }
      }

      return result;
    } catch (e) {
      console.error("Photo classify error:", e);
      return it.af.map((f, i) => ({ color: fallbackColor, shot: i === 0 ? "front_34" : "other", file: f, origIdx: i }));
    }
  }

  async function genLong(it: CatalogItem) {
    const state = getState();
    const exInfo = it.excelInfo || getExcelInfo(it.sku);
    const prompt = mPrLong(state.cfg.br, it.tp, it.nm, it.ds, it.cl, it.ai?.licenza || null, it.cp, exInfo);
    return await cAI([{ type: "text", text: prompt }]);
  }

  async function genMetaDesc(it: CatalogItem) {
    const state = getState();
    const prompt = genMetaDescPrompt(it, state.cfg);
    try { return await cAI([{ type: "text", text: prompt }]); }
    catch { return `Acquista ${it.nm || it.tp} ${state.cfg.br === "zuiki" ? "Zuiki" : "Loveskin"}. ${it.ai?.dettagli_descrizione || ""}`.slice(0, 158); }
  }

  async function genAltImg(it: CatalogItem) {
    const c: any[] = [];
    const { base64, mimeType } = await compressForAI(it.fl);
    c.push({ type: "image", source: { type: "base64", media_type: mimeType, data: base64 } });
    c.push({ type: "text", text: genAltImgPrompt(it) });
    return await cAI(c);
  }

  async function procOne(it: CatalogItem, idx: number, attempt = 0) {
    const state = getState();
    const { cfg, mod, licMem } = state;

    dispatch({ type: "SET_ITEM", idx, payload: { st: "load", er: null } });
    const t0 = Date.now();

    try {
      const exInfo = it.excelInfo || getExcelInfo(it.sku);
      const ai = await aImgs(it.af, it.tp, exInfo);
      const nm = mNm(it.tp, ai);
      const cl = ai.colore_madre || "";

      if (exInfo?.composizione && !it.cp) it.cp = exInfo.composizione;

      // Reorder photos
      let af = it.af, ap = it.ap, fl = it.fl, pv = it.pv;
      try {
        const tempItem = { ...it, ai, cl };
        const origAp = ap.slice();
        const classified = await classifyPhotos(tempItem);
        const colorGroups: Record<string, any[]> = {};
        for (const ph of classified) {
          if (!colorGroups[ph.color]) colorGroups[ph.color] = [];
          colorGroups[ph.color].push(ph);
        }
        for (const col of Object.keys(colorGroups)) {
          colorGroups[col].sort((a: any, b: any) => (SHOT_ORDER[a.shot] ?? 5) - (SHOT_ORDER[b.shot] ?? 5));
        }
        const sorted = Object.values(colorGroups).flat();
        af = sorted.map((p: any) => p.file);
        ap = sorted.map((p: any) => origAp[p.origIdx]);
        fl = af[0]; pv = ap[0];
      } catch (e) {
        console.error("Photo reorder error:", e);
        const fIdx = parseInt(ai.foto_frontale_idx) || 0;
        if (fIdx > 0 && fIdx < af.length) {
          const newAf = [...af]; const ff = newAf.splice(fIdx, 1)[0]; newAf.unshift(ff);
          const newAp = [...ap]; const fp = newAp.splice(fIdx, 1)[0]; newAp.unshift(fp);
          af = newAf; ap = newAp; fl = af[0]; pv = ap[0];
        }
      }

      // Model recognition
      let recMod: string | null = null;
      let modelUnknown = false;
      if (ai.modella_riconosciuta) {
        const recM = mod.find((ml: ModellaInfo) => ml.nome.toLowerCase() === ai.modella_riconosciuta.toLowerCase());
        if (recM) { recMod = recM.nome; }
        else { modelUnknown = true; }
      } else if (cfg.shootType === "model" || cfg.shootType === "mixed") {
        modelUnknown = true;
      }

      // Tags
      const tg = cfg.br === "zuiki"
        ? mTags({ ds: cfg.ds, cat: ai.categoria_seo || "", sub: ai.sottocategoria_seo || "", nm, lic: ai.licenza && ai.licenza !== "null" ? ai.licenza : null, tipo: it.tp }, cfg)
        : mTagsLoveskin({ tipo: it.tp, sfx: it.sf, lic: ai.licenza && ai.licenza !== "null" ? ai.licenza : null, vestibilita: ai.vestibilita || null, sporty: !!ai.is_sporty }, cfg);

      // Description
      const ds = mDs(ai, it.cp, it.tp, recMod, cfg, mod);

      // Doubt handling
      let doubt = false, doubtDesc = "", doubtResolved = false;
      if (ai.dubbio_licenza) {
        const dDesc = (ai.dubbio_descrizione || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().slice(0, 60);
        let memMatch: string | null = null;
        for (const [k, v] of Object.entries(licMem)) {
          if (dDesc.includes(k) || k.includes(dDesc.slice(0, 20))) { memMatch = v as string; break; }
        }
        if (memMatch) {
          ai.licenza = memMatch;
          ai.dubbio_licenza = false;
          doubtResolved = true;
        } else {
          doubt = true;
          doubtDesc = ai.dubbio_descrizione || "Stampa/logo non identificato";
        }
      }

      // Long description
      let dl = "";
      try {
        const tempIt = { ...it, ai, nm, ds, cl, tp: it.tp, cp: it.cp } as CatalogItem;
        dl = await genLong(tempIt);
      } catch (e: any) { dl = "[Errore generazione descrizione lunga: " + e.message + "]"; }

      // Meta fields
      const tempIt2 = { ...it, ai, nm, ds, cl, tp: it.tp, cp: it.cp, tg } as CatalogItem;
      const metaTitle = genMetaTitle(tempIt2, cfg);
      const metaDesc = await genMetaDesc(tempIt2);
      const metaKeys = genMetaKeys(tempIt2, cfg);

      // Alt image
      let altImg = "";
      try { altImg = await genAltImg({ ...tempIt2, fl, af } as CatalogItem); }
      catch { altImg = nm + " - " + cl; }

      const elapsed = Date.now() - t0;

      dispatch({
        type: "SET_ITEM", idx,
        payload: {
          st: "done", ai, nm, cl, ds, dl, tg, af, ap, fl, pv,
          recMod, modelUnknown, doubt, doubtDesc, doubtResolved,
          metaTitle, metaDesc, metaKeys, altImg, _synced: true,
        },
      });

      return elapsed;
    } catch (e: any) {
      if (attempt < 2) {
        console.log(`Auto-retry ${it.sku} (attempt ${attempt + 1}):`, e.message);
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
        return procOne(it, idx, attempt + 1);
      }
      dispatch({ type: "SET_ITEM", idx, payload: { st: "err", er: e.message } });
      return Date.now() - t0;
    }
  }

  async function procF(files: FileList | File[]) {
    const state = getState();
    const { items, unk, cS } = state;
    const imgExts = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "tif", "heic", "heif", "avif", "svg"]);
    const imgs = Array.from(files).filter(f => f.type.startsWith("image/") || imgExts.has(f.name.toLowerCase().split(".").pop() || ""));
    if (!imgs.length) return;

    const gr: Record<string, File[]> = {};
    for (const f of imgs) { const s = pSKU(f.name); (gr[s] = gr[s] || []).push(f); }

    const exSet = new Set(items.map((i: CatalogItem) => i.sku));
    const newItems: CatalogItem[] = [];
    const newUnk = [...unk];

    for (const [sku, sf] of Object.entries(gr)) {
      if (exSet.has(sku)) {
        const existIdx = items.findIndex((i: CatalogItem) => i.sku === sku);
        if (existIdx >= 0) {
          const it = items[existIdx];
          dispatch({
            type: "SET_ITEM", idx: existIdx,
            payload: { af: [...it.af, ...sf], ap: [...it.ap, ...sf.map(f => URL.createObjectURL(f))] },
          });
        }
        continue;
      }
      const allSfx = { ...SFX, ...cS };
      let { s, tipo, u } = gSuf(sku, cS);
      // Auto-resolve from Excel
      if (!s && u) {
        const exi = getExcelInfo(sku);
        if (exi?.tipoArticolo) {
          const newCS = { ...cS, [u]: exi.tipoArticolo };
          fetch("/api/company/suffixes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCS) }).catch(() => {});
          dispatch({ type: "SET_STATE", payload: { cS: newCS } });
          s = u; tipo = exi.tipoArticolo;
        } else if (!newUnk.find(x => x.sf === u)) {
          newUnk.push({ sf: u, sku, dn: false, vl: "" });
        }
      }
      const exInf = getExcelInfo(sku);
      newItems.push({
        id: Math.random(), sku, fl: sf[0], af: sf,
        pv: URL.createObjectURL(sf[0]), ap: sf.map(f => URL.createObjectURL(f)),
        st: s ? "pend" : "wait", ai: null, cp: exInf?.composizione || "",
        tg: "", nm: "", ds: "", dl: "", cl: "", tp: tipo || "", sf: s || u || "",
        er: null, doubt: false, doubtDesc: "", doubtInput: "", doubtResolved: false,
        metaTitle: "", metaDesc: "", metaKeys: "", altImg: "", excelInfo: exInf || null,
      });
    }

    if (newUnk.length !== unk.length) dispatch({ type: "SET_UNK", payload: newUnk });
    if (newItems.length) dispatch({ type: "ADD_ITEMS", payload: newItems });

    dispatch({ type: "SET_STATE", payload: { procPhase: "analyzing" } });

    // Run processing after state update
    setTimeout(() => runP(), 50);
  }

  async function runP() {
    const state = getState();
    const pending = state.items.filter((i: CatalogItem) => i.st === "pend");
    if (!pending.length) { dispatch({ type: "SET_STATE", payload: { procPhase: "" } }); return; }

    dispatch({ type: "SET_STATE", payload: { procPhase: "analyzing", procStart: Date.now(), procTimes: [] } });

    const times: number[] = [];
    await runPool(pending, 2, async (it: CatalogItem) => {
      const currentState = getState();
      const idx = currentState.items.findIndex((i: CatalogItem) => i.sku === it.sku);
      if (idx < 0) return;
      const elapsed = await procOne(currentState.items[idx], idx);
      times.push(elapsed);
      dispatch({ type: "SET_STATE", payload: { procTimes: [...times] } });
    });

    dispatch({ type: "SET_STATE", payload: { procStart: 0, procPhase: "" } });

    // Check for pending doubts
    const finalState = getState();
    const pendingDoubts = finalState.items.filter((i: CatalogItem) => i.doubt && !i.doubtResolved);
    if (pendingDoubts.length) {
      setTimeout(() => window.dispatchEvent(new CustomEvent("catalog:openWizard")), 400);
    }
  }

  async function retryErrors() {
    const state = getState();
    state.items.forEach((it: CatalogItem, idx: number) => {
      if (it.st === "err") dispatch({ type: "SET_ITEM", idx, payload: { st: "pend", er: null } });
    });
    setTimeout(() => runP(), 50);
  }

  async function retryOne(idx: number) {
    dispatch({ type: "SET_ITEM", idx, payload: { st: "pend", er: null } });
    setTimeout(() => runP(), 50);
  }

  async function resolveSuffix(unkIdx: number) {
    const state = getState();
    const u = state.unk[unkIdx];
    if (!u?.vl?.trim()) return;
    const newCS = { ...state.cS, [u.sf]: u.vl.trim() };
    fetch("/api/company/suffixes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCS) }).catch(() => {});
    const newUnk = [...state.unk];
    newUnk[unkIdx] = { ...newUnk[unkIdx], dn: true };
    dispatch({ type: "SET_STATE", payload: { cS: newCS } });
    dispatch({ type: "SET_UNK", payload: newUnk });

    // Update waiting items
    const currentState = getState();
    currentState.items.forEach((it: CatalogItem, idx: number) => {
      if (it.st === "wait" && it.sf === u.sf) {
        dispatch({ type: "SET_ITEM", idx, payload: { tp: u.vl.trim(), st: "pend" } });
      }
    });
    setTimeout(() => runP(), 50);
  }

  return { procF, runP, retryErrors, retryOne, resolveSuffix, genLong, classifyPhotos };
}
