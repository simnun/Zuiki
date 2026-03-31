export interface ModellaInfo {
  nome: string;
  altezza: string;
  tagliaSopra: string;
  tagliaSotto: string;
  tagliaReggiseno: string;
  numeroScarpe: string;
  dbId?: string;
}

export interface MannequinConfig {
  taglia: string;
  petto: string;
  vita: string;
  fianchi: string;
}

export interface SessionConfig {
  br: string;       // brand: "zuiki" | "loveskin"
  st: string;       // stagione
  an: string;       // anno
  ds: string;       // data shooting
  selMods: string[];
  noModel: boolean;
  shootType: string; // "model" | "mannequin" | "still" | "mixed"
  mannequin: MannequinConfig;
}

export interface ExcelInfo {
  row: number;
  codice: string;
  colori: string;
  taglie: string;
  anno: string;
  stagione: string;
  tipoArticolo: string;
  brand: string;
  caratteristica: string;
  composizione: string;
}

export interface AIResponse {
  modello_dettaglio?: string;
  dettagli_descrizione?: string;
  licenza?: string | null;
  dubbio_licenza?: boolean;
  dubbio_descrizione?: string | null;
  colore_madre?: string;
  categoria_seo?: string;
  sottocategoria_seo?: string;
  foto_frontale_idx?: number;
  foto_still_life_indices?: number[];
  modella_riconosciuta?: string | null;
  vestibilita?: string | null;
  is_sporty?: boolean;
}

export type ItemStatus = "pend" | "wait" | "load" | "done" | "err";

export interface CatalogItem {
  id: number;
  sku: string;
  fl: File;           // first file
  af: File[];         // all files
  pv: string;         // preview URL
  ap: string[];       // all preview URLs
  st: ItemStatus;
  ai: AIResponse | null;
  cp: string;         // composizione
  tg: string;         // tags
  nm: string;         // nome
  ds: string;         // descrizione breve
  dl: string;         // descrizione lunga
  cl: string;         // colore
  tp: string;         // tipo
  sf: string;         // suffisso
  er: string | null;  // errore
  doubt: boolean;
  doubtDesc: string;
  doubtInput: string;
  doubtResolved: boolean;
  doubtUserInfo?: string;
  metaTitle: string;
  metaDesc: string;
  metaKeys: string;
  altImg: string;
  excelInfo: ExcelInfo | null;
  recMod?: string | null;
  modelUnknown?: boolean;
  reworking?: boolean;
  corrOpen?: boolean;
  corrHint?: string;
  _synced?: boolean;
}

export interface UnknownSuffix {
  sf: string;
  sku: string;
  dn: boolean;
  vl: string;
}

export interface Correlation {
  outfit_name: string;
  skus: string[];
  motivo: string;
}

export type StepIndex = -2 | -1 | 0 | 1 | 2 | 3;
