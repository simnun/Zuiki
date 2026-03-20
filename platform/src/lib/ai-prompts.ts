import { COL } from "./constants";
import type { CatalogItem, SessionConfig } from "./catalog-types";

export function mPr(br: string, tipo: string, n: number, modelNames: string[], exInfo: any) {
  const m = n > 1 ? `Ti vengono fornite ${n} foto dello STESSO articolo da angolazioni diverse. Usale TUTTE per descrivere meglio. Se una foto ha colore diverso ignorala.` : "Singola foto.";
  const knownLic = ""; // Will be populated from store
  const modelInfo = modelNames?.length
    ? `\nRICONOSCIMENTO MODELLA (MOLTO IMPORTANTE): Ti sono state fornite foto di riferimento del volto delle modelle PRIMA delle foto del prodotto. Le modelle disponibili sono ESCLUSIVAMENTE: ${modelNames.join(", ")}. DEVI confrontare attentamente il volto nella foto del prodotto con TUTTE le foto di riferimento. Analizza: forma del viso, colore/lunghezza dei capelli, lineamenti, sopracciglia, labbra. Inserisci il nome ESATTO della modella nel campo "modella_riconosciuta". Se il volto non è visibile o è troppo coperto per un confronto affidabile, usa null. NON inventare nomi fuori dalla lista.`
    : "";
  const excelInfo = exInfo
    ? `\nDATI TECNICI DAL FILE EXCEL (usa queste informazioni per arricchire la descrizione):
- Colori disponibili: ${exInfo.colori || "N/D"}
- Anno: ${exInfo.anno || "N/D"}
- Stagione: ${exInfo.stagione || "N/D"}
- Tipo articolo: ${exInfo.tipoArticolo || "N/D"}
- Brand: ${exInfo.brand || "N/D"}
- Caratteristica modello: ${exInfo.caratteristica || "N/D"}
- Composizione: ${exInfo.composizione || "N/D"}
Integra queste informazioni nella descrizione dove opportuno (es: composizione, vestibilità, caratteristiche).`
    : "";

  return `Sei un catalogatore moda per ${br === "zuiki" ? "Zuiki" : "Loveskin"}.
IMPORTANTE: Questo articolo è "${tipo}". NON cambiare il tipo.
${m}${knownLic}${modelInfo}${excelInfo}

ATTENZIONE STAMPE/LOGHI/PERSONAGGI: Se vedi QUALSIASI stampa, logo, immagine, disegno, scritta, personaggio, simbolo o decorazione grafica sul capo e NON sei SICURO AL 100% di cosa sia (es: potrebbe essere un personaggio di un cartone, un logo di un brand, un animale di una licenza, una scritta di un marchio), imposta "dubbio_licenza" su true e descrivi in "dubbio_descrizione" ESATTAMENTE cosa vedi nell'immagine (forma, colore, posizione, testo se presente). Non tirare a indovinare: se hai anche il minimo dubbio, segnalalo.

REGOLA COLORE: NON menzionare MAI il colore del prodotto in "dettagli_descrizione". La descrizione va sull'articolo genitore e i figli possono avere colori diversi.

REGOLA TIPO ARTICOLO IN DESCRIZIONE: La "dettagli_descrizione" DEVE iniziare nominando il tipo articolo (es: "T-shirt con...", "Canotta a...", "Jeans a..."). Prima nomina il tipo, poi descrivi i dettagli.

REGOLA JEANS E PANTALONI:
- Se il tipo articolo contiene "Jeans" o il codice SKU finisce con "PJ" o "SJ", chiama il capo SEMPRE "Jeans", MAI "pantaloni" o "pantaloni di jeans".
- Se il tipo articolo è un pantalone (NON jeans), usa SEMPRE il plurale "Pantaloni", MAI il singolare "Pantalone".

FOTO FRONTALE: Se ci sono più foto, indica l'indice (0-based) della foto che mostra il capo da DAVANTI (vista frontale). Se c'è una sola foto, usa 0.

FOTO STILL LIFE: Se ci sono più foto, indica gli indici (0-based) delle foto scattate SENZA modella (still life, flat lay, prodotto appoggiato). Se tutte le foto hanno la modella o c'è una sola foto, usa un array vuoto [].

Rispondi SOLO JSON valido (no markdown, no backtick, no testo extra):
{"modello_dettaglio":"2-3 parole MODELLO/VESTIBILITÀ senza tipo articolo e senza colore","dettagli_descrizione":"INIZIA con il tipo articolo, poi descrivi dettagli visibili: cuciture, tasche, chiusure, stampe, scollo, maniche, vestibilità. Italiano corretto con punteggiatura. Max 3 frasi. NON menzionare il colore.","licenza":"Personaggio/brand SICURO AL 100% (Disney, Mickey Mouse, Snoopy, Hello Kitty, Marvel ecc.) oppure null se non sei sicuro","dubbio_licenza":true/false,"dubbio_descrizione":"Descrizione dettagliata di cosa vedi: forma, colore, posizione, testo. Solo se dubbio_licenza=true, altrimenti null","colore_madre":"SOLO colore base tra: ${COL.join(", ")}","categoria_seo":"macro minuscolo attaccato","sottocategoria_seo":"sotto minuscolo attaccato","foto_frontale_idx":0,"foto_still_life_indices":[]${modelNames?.length ? ',"modella_riconosciuta":"nome modella o null"' : ""}${br === "loveskin" ? ',"vestibilita":"per reggiseni: pushup/bralette/balconcino/triangolo o null. Per slip: brasiliana/perizoma/vitaalta/classico o null. Altrimenti null","is_sporty":"true se capo sportivo/athleisure, false altrimenti"' : ""}}`;
}

export function mPrLong(br: string, tipo: string, nome: string, descBreve: string, colore: string, licenza: string | null, comp: string, exInfo: any) {
  const exTxt = exInfo ? `\n- Colori disponibili: ${exInfo.colori || "N/D"}\n- Anno: ${exInfo.anno || "N/D"}\n- Stagione: ${exInfo.stagione || "N/D"}\n- Caratteristica modello: ${exInfo.caratteristica || "N/D"}` : "";
  return `Sei un copywriter SEO esperto di moda per ${br === "zuiki" ? "Zuiki" : "Loveskin"}.
Scrivi una DESCRIZIONE LUNGA ottimizzata SEO per questo prodotto:
- Tipo: ${tipo}
- Nome: ${nome}
- Licenza/Personaggio: ${licenza || "Nessuna"}
- Composizione: ${comp || "Non specificata"}
- Descrizione breve: ${descBreve}${exTxt}

REGOLE:
- Testo di 150-250 parole, fluido e naturale, NON a elenco puntato
- NON MENZIONARE MAI IL COLORE del prodotto. La descrizione va sull'articolo genitore e i figli hanno colori diversi. Evita qualsiasi riferimento a colori specifici.
- Se il tipo è "Jeans" o contiene "Jeans", chiamali SEMPRE "Jeans", MAI "pantaloni" o "pantaloni di jeans". Se è un pantalone (non jeans), usa SEMPRE il plurale "Pantaloni".
- Includi keywords rilevanti per la ricerca (tipo articolo, stagione, brand, licenza se presente)
- Includi consigli di stile e abbinamenti
- Includi occasioni d'uso
- Usa un tono coinvolgente e aspirazionale ma REALISTICO: NON usare aggettivi come "pregiato", "lussuoso", "esclusivo", "premium", "raffinato" se i materiali sono comuni (poliestere, acrilico, elastan, viscosa, nylon, poliammide). In questo caso punta su design, vestibilità, versatilità, praticità senza fare riferimenti alla composizione.
- NON analizzare mai la composizione del tessuto nella descrizione: non citare i materiali né la percentuale. La composizione è già indicata a parte.
- Ottimizza per Google e per AI (risposte dirette a query tipo "cosa indossare con...")
- Scrivi in italiano corretto e scorrevole
- NON usare markdown, elenchi puntati o formattazione speciale
- Rispondi SOLO con il testo della descrizione, nient'altro`;
}

export function genMetaTitle(it: CatalogItem, cfg: SessionConfig) {
  const br = cfg.br === "zuiki" ? "Zuiki" : "Loveskin";
  const nm = it.nm || it.tp;
  return `${nm} | ${br}`;
}

export function genMetaDescPrompt(it: CatalogItem, cfg: SessionConfig) {
  const br = cfg.br === "zuiki" ? "Zuiki" : "Loveskin";
  const nm = it.nm || it.tp;
  const desc = it.ai?.dettagli_descrizione || "";
  const tipo = it.tp || "";
  const lic = it.ai?.licenza && it.ai.licenza !== "null" ? it.ai.licenza : "";
  return `Scrivi una meta description SEO per questo prodotto e-commerce.
Prodotto: ${nm}
Brand: ${br}
Tipo: ${tipo}
Licenza: ${lic || "Nessuna"}
Descrizione: ${desc}

REGOLE TASSATIVE:
- La meta description DEVE essere tra 120 e 158 caratteri (inclusi spazi). Conta con precisione.
- Deve essere una frase completa e di senso compiuto, MAI troncata.
- Deve invogliare al click, menzionare il brand e il tipo di articolo.
- NON menzionare colori.
- Rispondi SOLO con la meta description, nient'altro.`;
}

export function genMetaKeys(it: CatalogItem, cfg: SessionConfig) {
  const br = cfg.br === "zuiki" ? "zuiki" : "loveskin";
  const tipo = (it.tp || "").toLowerCase();
  const nm = (it.nm || "").toLowerCase();
  const keys = [br, tipo, nm, cfg.st?.toLowerCase() || "", "donna", "moda"];
  if (it.ai?.licenza && it.ai.licenza !== "null") keys.push(it.ai.licenza.toLowerCase());
  if (it.excelInfo?.caratteristica) keys.push(it.excelInfo.caratteristica.toLowerCase());
  return [...new Set(keys.filter(k => k && k.length > 1))].join(", ");
}

export function genAltImgPrompt(it: CatalogItem) {
  return `Sei un esperto di accessibilità web. Descrivi questa immagine di moda in modo che una persona non vedente possa visualizzarla mentalmente.
Prodotto: ${it.nm || it.tp} (${it.sku})
Colore: ${it.cl || "non specificato"}

DESCRIVI in italiano in una singola frase (max 200 caratteri):
- L'ambientazione/set della foto
- La modella (se presente): posa, caratteristiche
- Il capo principale in dettaglio
- Gli eventuali capi abbinati visibili
NON usare virgolette. Rispondi SOLO con la frase descrittiva, nient'altro.`;
}

export function classifyPhotosPrompt(it: CatalogItem, colori: string[], firstColor: string) {
  return `Hai ${it.af.length} foto dello stesso articolo "${it.tp}" (codice ${it.sku}).
${colori.length > 1 ? `Colori disponibili: ${colori.join(", ")}. Identifica il colore di ogni foto.` : `Colore unico: ${firstColor}.`}
Per OGNI foto (indice 0-based) classifica:
- "color": ESATTAMENTE uno dei colori disponibili: ${colori.join(", ")}
- "shot": uno tra "front_34" (3/4 frontale, mezzo busto angolato, posa tre quarti con il corpo leggermente ruotato), "back" (retro/posteriore, si vede la schiena), "detail" (dettaglio/closeup di una parte del capo), "full_front" (frontale a figura intera, si vedono piedi e scarpe), "scontornata" (foto senza sfondo/ritagliata, sfondo bianco puro o trasparente), "other" (qualsiasi altra posa)

REGOLA FONDAMENTALE: Per ogni colore, ogni tipo di shot (front_34, back, detail, full_front, scontornata) può essere assegnato a MASSIMO UNA foto. Se ci sono più foto simili dello stesso colore (es. due pose frontali diverse), assegna il tipo specifico SOLO alla foto più rappresentativa e classifica le altre come "other".
Esempio: se hai 2 foto frontali dello stesso colore, la migliore 3/4 è "front_34" e l'altra è "other".

Rispondi SOLO JSON array: [{"color":"...","shot":"..."},...]
Esempio per 4 foto stesso colore: [{"color":"Nero","shot":"front_34"},{"color":"Nero","shot":"other"},{"color":"Nero","shot":"back"},{"color":"Nero","shot":"full_front"}]`;
}
