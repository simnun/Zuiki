"use client";

import type { CatalogItem, SessionConfig, ModellaInfo } from "./catalog-types";
import { SCMAP } from "./constants";
import { mNm, mDs, mTags, mTagsLoveskin, toB, mT, runPool } from "./utils";
import { mPrLong } from "./ai-prompts";

type CaiFunc = (content: any, retries?: number) => Promise<string>;
type DispatchFunc = (action: any) => void;
type GetStateFunc = () => any;

interface ActionsDeps {
  cAI: CaiFunc;
  dispatch: DispatchFunc;
  getState: GetStateFunc;
  getExcelInfo: (sku: string) => any;
}

export function createActions(deps: ActionsDeps) {
  const { cAI, dispatch, getState, getExcelInfo } = deps;

  async function reworkItem(idx: number) {
    const state = getState();
    const it = state.items[idx];
    if (!it || it.st !== "done") return;
    const { cfg, mod } = state;
    const userInfo = it.doubtUserInfo || it.doubtInput || it.ai?.licenza || "";

    dispatch({ type: "SET_ITEM", idx, payload: { reworking: true } });

    try {
      const reworkAll = `Sei un catalogatore moda per ${cfg.br === "zuiki" ? "Zuiki" : "Loveskin"}.
L'utente ha chiarito un dubbio su una stampa/logo presente su questo prodotto "${it.tp}".
L'AI aveva visto: "${it.doubtDesc}"
L'utente ha scritto: "${userInfo}"

COMPITO 1 - NOME LICENZA: Estrai SOLO il nome breve e corretto della licenza/personaggio (es: "SuperGirl", "Mickey Mouse", "Snoopy"). Se l'utente ha scritto una frase, estrapolane solo il nome. Max 2-3 parole.
COMPITO 2 - NOME PRODOTTO: Genera il nome prodotto completo formato: "${it.tp} [modello 2-3 parole] [nome licenza breve]"
COMPITO 3 - DESCRIZIONE BREVE: Riscrivi la descrizione breve integrando la licenza in modo naturale. NON copiare ciò che ha scritto l'utente. NON menzionare il colore. Mantieni info su modella e composizione.
Descrizione originale: ${it.ds}

Rispondi SOLO JSON valido: {"licenza":"nome breve","nome_prodotto":"nome completo","descrizione_breve":"testo"}`;

      const raw = await cAI([{ type: "text", text: reworkAll }]);
      const rw = JSON.parse(raw.replace(/```json|```/g, "").trim());

      const updates: Partial<CatalogItem> = {};
      if (rw.licenza && it.ai) {
        updates.ai = { ...it.ai, licenza: rw.licenza };
      }
      if (rw.nome_prodotto) updates.nm = rw.nome_prodotto;
      if (rw.descrizione_breve) updates.ds = rw.descrizione_breve;

      // Update tags with license
      if (rw.licenza && it.tg) {
        const licTag = rw.licenza.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!it.tg.includes(licTag)) {
          let base = it.tg.replace(/;?\s*$/, "");
          updates.tg = base + "; " + licTag + "; licenza; licenza" + (cfg.an || "26") + ";";
        }
      }

      dispatch({ type: "SET_ITEM", idx, payload: updates });

      // Rework long desc
      const currentState = getState();
      const updatedIt = currentState.items[idx];
      const exInfoRw = updatedIt.excelInfo || getExcelInfo(updatedIt.sku);
      const dl = await cAI([{
        type: "text",
        text: mPrLong(cfg.br, updatedIt.tp, updatedIt.nm, updatedIt.ds, updatedIt.cl, updatedIt.ai?.licenza || null, updatedIt.cp, exInfoRw),
      }]);

      dispatch({ type: "SET_ITEM", idx, payload: { dl, reworking: false } });
    } catch (e) {
      console.error("Rework error:", e);
      dispatch({ type: "SET_ITEM", idx, payload: { reworking: false } });
    }
  }

  async function suggestCorr(idx: number) {
    const state = getState();
    const it = state.items[idx];
    if (!it || it.st !== "done") return;
    const hint = it.corrHint?.trim();
    if (!hint) { alert("Scrivi prima cosa ha sbagliato l'AI"); return; }
    const { cfg, mod } = state;

    dispatch({ type: "SET_ITEM", idx, payload: { reworking: true, corrOpen: false } });

    try {
      const c: any[] = [];
      for (const f of it.af) c.push({ type: "image", source: { type: "base64", media_type: mT(f), data: await toB(f) } });
      c.push({
        type: "text",
        text: `Sei un catalogatore moda per ${cfg.br === "zuiki" ? "Zuiki" : "Loveskin"}.
Hai già analizzato questo "${it.tp}" ma l'utente ti segnala un problema.
Correzione dell'utente: "${hint}"
Analisi precedente: modello="${it.ai?.modello_dettaglio}", licenza="${it.ai?.licenza}", descrizione="${it.ai?.dettagli_descrizione}"

IMPORTANTE: La correzione dell'utente è un'INDICAZIONE per guidarti, NON testo da copiare letteralmente.
- Comprendi il SIGNIFICATO della correzione e rielabora professionalmente
- Se l'utente dice "è Supergirl della Marvel" → licenza="Supergirl", NON "SuperGirl film Marvel"
- Il nome licenza deve essere SOLO il nome ufficiale breve
- Il modello_dettaglio descrive VESTIBILITÀ/TAGLIO, NON la licenza
REGOLA COLORE: NON menzionare MAI il colore.
REGOLA TIPO ARTICOLO: La dettagli_descrizione DEVE iniziare nominando il tipo articolo.
Rispondi SOLO JSON: {"modello_dettaglio":"2-3 parole","dettagli_descrizione":"max 3 frasi senza colore","licenza":"nome breve o null","colore_madre":"colore base","categoria_seo":"macro","sottocategoria_seo":"sotto"}`,
      });

      const raw = await cAI(c);
      const ai = JSON.parse(raw.replace(/```json|```/g, "").trim());
      const mergedAi = { ...(it.ai || {}), ...ai };
      const nm = mNm(it.tp, mergedAi);
      const cl = ai.colore_madre || it.cl;
      const tg = cfg.br === "zuiki"
        ? mTags({ ds: cfg.ds, cat: ai.categoria_seo || "", sub: ai.sottocategoria_seo || "", nm, lic: ai.licenza && ai.licenza !== "null" ? ai.licenza : null, tipo: it.tp }, cfg)
        : mTagsLoveskin({ tipo: it.tp, sfx: it.sf, lic: ai.licenza && ai.licenza !== "null" ? ai.licenza : null, vestibilita: ai.vestibilita || null, sporty: !!ai.is_sporty }, cfg);
      const ds = mDs(mergedAi, it.cp, it.tp, it.recMod, cfg, mod);

      dispatch({ type: "SET_ITEM", idx, payload: { ai: mergedAi, nm, cl, tg, ds, corrHint: "" } });

      // Regen long desc
      const exInfo = it.excelInfo || getExcelInfo(it.sku);
      const dl = await cAI([{ type: "text", text: mPrLong(cfg.br, it.tp, nm, ds, cl, mergedAi.licenza || null, it.cp, exInfo) }]);

      dispatch({ type: "SET_ITEM", idx, payload: { dl, reworking: false } });
    } catch (e) {
      console.error("Correction error:", e);
      dispatch({ type: "SET_ITEM", idx, payload: { reworking: false } });
    }
  }

  async function regenLong(idx: number) {
    const state = getState();
    const it = state.items[idx];
    if (!it) return;
    const { cfg } = state;

    dispatch({ type: "SET_ITEM", idx, payload: { dl: "Generazione in corso..." } });
    try {
      const exInfo = it.excelInfo || getExcelInfo(it.sku);
      const dl = await cAI([{ type: "text", text: mPrLong(cfg.br, it.tp, it.nm, it.ds, it.cl, it.ai?.licenza || null, it.cp, exInfo) }]);
      dispatch({ type: "SET_ITEM", idx, payload: { dl } });
    } catch (e: any) {
      dispatch({ type: "SET_ITEM", idx, payload: { dl: "Errore: " + e.message } });
    }
  }

  async function handleWizardRework(toRework: { idx: number }[]) {
    dispatch({ type: "SET_STATE", payload: { procPhase: "reworking", rwTotal: toRework.length, rwDone: 0 } });
    await runPool(toRework, 5, async (d) => {
      await reworkItem(d.idx);
      const s = getState();
      dispatch({ type: "SET_STATE", payload: { rwDone: s.rwDone + 1 } });
    });
    dispatch({ type: "SET_STATE", payload: { procPhase: "" } });
  }

  async function findCorrelations() {
    const state = getState();
    const done = state.items.filter((i: CatalogItem) => i.st === "done");
    dispatch({ type: "SET_STATE", payload: { cL: true, cD: false, corr: [] } });

    const BATCH = 20;
    const allCorr: any[] = [];

    for (let b = 0; b < done.length; b += BATCH) {
      const batch = done.slice(b, b + BATCH);
      const c: any[] = [];
      for (const it of batch) {
        try { c.push({ type: "image", source: { type: "base64", media_type: mT(it.fl), data: await toB(it.fl) } }); } catch {}
        c.push({ type: "text", text: `[SKU:${it.sku} — ${it.nm} (${it.tp})]` });
      }
      c.push({
        type: "text",
        text: `Analizza le foto sopra. Trova articoli che sono stati chiaramente scattati NELLO STESSO SET/OUTFIT (stessa scena, stessa modella, stessi accessori, croppati dallo stesso scatto fotografico).
Rispondi SOLO con JSON valido, senza markdown e senza backtick:
[{"outfit_name":"descrizione breve outfit","skus":["SKU1","SKU2"],"motivo":"perché sono correlati"}]
Se non trovi nessun match, rispondi con: []`,
      });
      try {
        const raw = await cAI(c);
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        if (Array.isArray(parsed)) allCorr.push(...parsed);
      } catch (e) { console.error("Errore correlazioni batch:", e); }
    }

    dispatch({ type: "SET_STATE", payload: { corr: allCorr, cL: false, cD: true } });
  }

  return { reworkItem, suggestCorr, regenLong, handleWizardRework, findCorrelations };
}
