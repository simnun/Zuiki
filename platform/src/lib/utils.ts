import { SFX, SUP, SCMAP, MACRO_MAP, COL, INTIMO_SFX, ABBIG_SFX, INTIMO_CAT_MAP } from "./constants";
import type { AIResponse, CatalogItem, ExcelInfo, ModellaInfo, SessionConfig } from "./catalog-types";

export const pSKU = (fn: string) =>
  fn.replace(/\.[^.]+$/, "").split("__")[0].split("_")[0].toUpperCase();

export const gSuf = (sku: string, customSfx: Record<string, string>) => {
  const t = sku.slice(-2);
  const a = { ...SFX, ...customSfx };
  return a[t] ? { s: t, tipo: a[t] } : { s: null, tipo: null, u: t };
};

export const fD = (r: string) => {
  const d = r.replace(/\D/g, "");
  return d.length <= 2 ? d : d.length <= 4 ? d.slice(0, 2) + "/" + d.slice(2) : d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4, 8);
};

export const cap = (s: string) =>
  s ? s.split(" ").map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ") : "";

export const toB = (f: File): Promise<string> =>
  new Promise((r, j) => {
    const x = new FileReader();
    x.onload = () => r((x.result as string).split(",")[1]);
    x.onerror = j;
    x.readAsDataURL(f);
  });

/** Compress image for AI: max 1568px on longest side, JPEG quality 0.75 */
export function compressForAI(f: File, maxDim = 1568): Promise<{ base64: string; mimeType: string }> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(maxDim / Math.max(img.width, img.height), 1);
        const w = Math.round(img.width * s);
        const h = Math.round(img.height * s);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL("image/jpeg", 0.75);
        res({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      };
      img.onerror = rej;
      img.src = r.result as string;
    };
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

export const mT = (f: File) => {
  const ext = f.name.toLowerCase().split(".").pop() || "";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    gif: "image/gif", bmp: "image/bmp", tiff: "image/tiff", tif: "image/tiff",
    heic: "image/heic", heif: "image/heif", avif: "image/avif", svg: "image/svg+xml",
  };
  return map[ext] || f.type || "image/jpeg";
};

export const gTg = (tipo: string, tsSeason: string, tiSeason: string) =>
  SUP.some(s => (tipo || "").toLowerCase().includes(s)) ? tsSeason : tiSeason;

export const esc = (s: string) => '"' + (s || "").replace(/"/g, '""') + '"';

export function friendlyErr(e: string | null) {
  const s = e || "";
  if (s.includes("401")) return "Chiave API non valida o scaduta. Controlla la API key nelle impostazioni.";
  if (s.includes("429")) return "Troppe richieste in poco tempo. Attendi qualche secondo e riprova.";
  if (s.includes("500") || s.includes("529")) return "Problema temporaneo del server AI. Riprova tra poco.";
  if (s.includes("413") || s.includes("too large") || s.includes("too many images")) return "Le foto sono troppo pesanti o troppe. Prova con meno foto o foto più leggere.";
  if (s.includes("network") || s.includes("fetch") || s.includes("Failed")) return "Errore di connessione. Controlla la tua connessione internet.";
  if (s.includes("timeout")) return "La richiesta ha impiegato troppo tempo. Riprova.";
  if (s.includes("JSON parse")) return "L'AI ha risposto in un formato non valido. Riprova.";
  if (s.includes("credit") || s.includes("billing")) return "Credito API esaurito. Ricarica il tuo account Anthropic.";
  return "Errore imprevisto durante l'analisi. Riprova o contatta il supporto.";
}

export function resizeImg(file: File, maxW = 200): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const s = Math.min(maxW / img.width, maxW / img.height, 1);
        c.width = img.width * s;
        c.height = img.height * s;
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = rej;
      img.src = r.result as string;
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function dedupWords(s: string) {
  return s.split(" ").filter((w, i, a) => i === 0 || w.toLowerCase() !== a[i - 1].toLowerCase()).join(" ");
}

export function fmtComp(raw: string) {
  if (!raw) return "";
  return raw.replace(/(\d+)\s*%\s*/g, "$1% ").trim().split(/\s+(?=\d+%)/).join(", ").replace(/,\s*$/, "") + ".";
}

export function mNm(tipo: string, ai: AIResponse | null) {
  const l = ai?.licenza && ai.licenza !== "null" && ai.licenza != null ? ai.licenza : "";
  const m = ai?.modello_dettaglio ? cap(ai.modello_dettaglio) : "";
  // Remove "Scarpe" prefix when modello_dettaglio already specifies a shoe subtype
  let t = tipo;
  if (t.toLowerCase() === "scarpe" && m) {
    const shoeTypes = ["ciabatt", "sandal", "infradito", "sneaker", "stival", "ballerina", "mocassin", "decollet", "zeppa", "anfib", "polacchin", "sabot", "slip on", "slipon", "espadrill", "pantofol", "trainer", "loafer"];
    if (shoeTypes.some(st => m.toLowerCase().includes(st))) t = "";
  }
  return dedupWords([t, m, l].filter(Boolean).join(" "));
}

export function mDs(
  ai: AIResponse | null,
  comp: string,
  tipo: string,
  recModName: string | null | undefined,
  cfg: SessionConfig,
  mod: ModellaInfo[]
) {
  const compFmt = fmtComp(comp);
  const lic = ai?.licenza && ai.licenza !== "null" && ai.licenza != null ? `\u00A9${ai.licenza}\n\n` : "";

  if (cfg.shootType === "still")
    return `${lic}${ai?.dettagli_descrizione || ""}\n\n${compFmt ? `Composizione:\u00A0${compFmt}` : "Composizione:"}`;

  if (cfg.shootType === "mannequin") {
    const mn = cfg.mannequin || {};
    const tg = mn.taglia ? "IT " + mn.taglia : "";
    const misure = [mn.petto ? mn.petto + "cm petto" : "", mn.vita ? mn.vita + "cm vita" : "", mn.fianchi ? mn.fianchi + "cm fianchi" : ""].filter(Boolean).join(" \u2014 ");
    const mannInfo = (tg || misure) ? `\n\nIl manichino indossa la taglia ${tg}${misure ? "\nMisure manichino: " + misure : ""}` : "";
    return `${lic}${ai?.dettagli_descrizione || ""}${mannInfo}\n\n${compFmt ? `Composizione:\u00A0${compFmt}` : "Composizione:"}`;
  }

  if (cfg.shootType === "model_no_size") {
    return `${lic}${ai?.dettagli_descrizione || ""}\n\n${compFmt ? `Composizione:\u00A0${compFmt}` : "Composizione:"}`;
  }

  let ml = recModName ? mod.find(x => x.nome === recModName) : null;
  if (!ml && cfg.selMods.length === 1) {
    const singleMl = mod.find(x => x.nome === cfg.selMods[0]);
    if (singleMl) return mDs(ai, comp, tipo, singleMl.nome, cfg, mod);
  }
  const alt = ml ? ml.altezza : "";
  const tgSopra = ml ? ml.tagliaSopra : "";
  const tgSotto = ml ? ml.tagliaSotto : "";
  const tg = SUP.some(s => (tipo || "").toLowerCase().includes(s)) ? tgSopra : tgSotto;
  const modInfo = ml ? `\n\nLa modella indossa la taglia IT ${tg}\nL'altezza della modella è ${alt} cm` : "";
  return `${lic}${ai?.dettagli_descrizione || ""}${modInfo}\n\n${compFmt ? `Composizione:\u00A0${compFmt}` : "Composizione:"}`;
}

export function mTags(o: { ds: string; cat: string; sub: string; nm: string; lic: string | null; tipo: string }, cfg: SessionConfig) {
  const sa = `${SCMAP[cfg.st] || "pe"}${cfg.an || "26"}`;
  const an = cfg.an || "26";
  const t: string[] = [];
  if (o.ds) t.push(o.ds + "donna" + sa);
  t.push("donna" + sa);
  const tipoLow = (o.tipo || "").toLowerCase();
  const macroKey = MACRO_MAP[tipoLow];
  if (macroKey) t.push(macroKey + "donna" + sa);
  if (o.cat) t.push(o.cat + "donna" + sa);
  if (o.sub && o.sub !== o.cat) t.push(o.sub + "donna" + sa);
  if (o.nm) o.nm.toLowerCase().replace(/[^a-zàèéìòù0-9\s-]/g, "").split(/\s+/).filter(w => w.length > 1).forEach(w => { if (!t.includes(w)) t.push(w); });
  if (o.lic) {
    const licTag = o.lic.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (licTag && !t.includes(licTag)) t.push(licTag);
    if (!t.includes("licenza")) t.push("licenza");
    const licAnno = "licenza" + an;
    if (!t.includes(licAnno)) t.push(licAnno);
  }
  return Array.from(new Set(t)).join("; ") + ";";
}

export function mTagsLoveskin(o: { tipo: string; sfx: string; lic: string | null; vestibilita: string | null; sporty: boolean }, cfg: SessionConfig) {
  const an = cfg.an || "26";
  const sa = `${SCMAP[cfg.st] || "pe"}${an}`;
  const t: string[] = [];
  const sfx = (o.sfx || "").toUpperCase();
  const tipoLow = (o.tipo || "").toLowerCase();
  const isIntimo = INTIMO_SFX.has(sfx) || ["reggiseno", "slip"].some(k => tipoLow.includes(k));
  t.push("loveskin");
  t.push("donna" + sa);
  if (isIntimo) {
    const catKey = Object.keys(INTIMO_CAT_MAP).find(k => tipoLow.includes(k));
    const catPlural = catKey ? INTIMO_CAT_MAP[catKey] : tipoLow.replace(/[^a-z]/g, "");
    if (catPlural) t.push("intimo" + catPlural + an);
    if (tipoLow.includes("reggiseno") && o.vestibilita) t.push("reggiseni" + o.vestibilita.toLowerCase().replace(/[^a-z]/g, "") + an);
    if (tipoLow.includes("slip") && o.vestibilita) t.push("slip" + o.vestibilita.toLowerCase().replace(/[^a-z]/g, "") + an);
  } else {
    t.push("loveskindaily");
    const macroKey = MACRO_MAP[tipoLow];
    if (macroKey) t.push("loveskin" + macroKey);
    if (o.sporty) t.push("loveskinsporty");
  }
  const macroKey = MACRO_MAP[tipoLow];
  if (macroKey && !t.includes(macroKey + "donna" + sa)) t.push(macroKey + "donna" + sa);
  if (o.lic) {
    const licTag = o.lic.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (licTag && !t.includes(licTag)) t.push(licTag);
    if (!t.includes("licenza")) t.push("licenza");
  }
  return Array.from(new Set(t)).join("; ") + ";";
}

export function fmtTime(ms: number) {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60), rs = s % 60;
  return m + "m " + rs + "s";
}

export function wrapHtml(text: string) {
  if (!text) return "";
  const pStyle = 'style="margin: 0px; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-alternates: normal; font-kerning: auto; font-optical-sizing: auto; font-feature-settings: normal; font-variation-settings: normal; font-stretch: normal; line-height: normal; font-family: &quot;Helvetica Neue&quot;; color: rgb(69, 69, 69);"';
  const pOpen = `<p class="p1" ${pStyle}>`;
  const pBr = `${pOpen}<br></p>`;
  return text.split("\n").map(l => {
    const t = l.trim();
    if (!t) return pBr;
    return `${pOpen}${t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\u00A0/g, "&nbsp;")}</p>`;
  }).join("");
}

export function convertToPng(file: File): Promise<Blob> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        c.getContext("2d")!.drawImage(img, 0, 0);
        c.toBlob(blob => {
          if (blob) res(blob);
          else rej(new Error("toBlob failed"));
        }, "image/png");
      };
      img.onerror = rej;
      img.src = r.result as string;
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function convertToJpg(file: File, quality = 0.92): Promise<Blob> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        c.getContext("2d")!.drawImage(img, 0, 0);
        c.toBlob(blob => {
          if (blob) res(blob);
          else rej(new Error("toBlob failed"));
        }, "image/jpeg", quality);
      };
      img.onerror = rej;
      img.src = r.result as string;
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export async function runPool<T>(tasks: T[], conc: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const t = tasks[i++];
      await fn(t);
    }
  }
  await Promise.all(Array.from({ length: Math.min(conc, tasks.length) }, () => worker()));
}
