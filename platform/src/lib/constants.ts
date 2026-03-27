export const SFX: Record<string, string> = {
  GB: "Giubbino", GP: "Giubbino Di Pelle", PA: "Pantaloni", PJ: "Jeans",
  AB: "Abito", MA: "Maglia", FE: "Felpa", TO: "Top", TS: "T-shirt",
  BO: "Body", GO: "Gonna", GN: "Gonna", MC: "Maglia", SR: "Scarpe",
  CZ: "Calzini", FR: "Fermacapelli", SC: "Sciarpa", BR: "Borsa",
  PF: "Portafogli", CV: "Coprispalle", GI: "Giacca", CS: "Casacca",
  PI: "Piumino", SP: "Spolverino", PE: "Pelliccia", CD: "Cardigan",
  CA: "Camicia", CJ: "Camicia Di Jeans", SH: "Shorts", SJ: "Shorts Di Jeans",
  PG: "Pigiama", RG: "Reggiseno", SL: "Slip", LG: "Leggings", CN: "Canotta",
};

export const TS_SIZES = ["38", "40", "42", "44", "46", "48", "50", "52"];
export const TL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
export const BRA_SIZES = ["2B", "2C", "3B", "3C", "4B", "4C"];
export const SHOE_SIZES = ["35", "36", "37", "38", "39", "40", "41"];
export const STG = ["Primavera/Estate", "Autunno/Inverno"] as const;
export const SCMAP: Record<string, string> = { "Primavera/Estate": "pe", "Autunno/Inverno": "ai" };

export const COL = [
  "Bianco", "Nero", "Grigio", "Rosso", "Blu", "Verde", "Giallo", "Arancione",
  "Rosa", "Viola", "Marrone", "Beige", "Azzurro", "Bordeaux", "Oro", "Argento",
  "Panna", "Corallo", "Turchese", "Lilla",
];

export const SUP = [
  "t-shirt", "top", "maglia", "felpa", "camicia", "camicia di jeans", "giacca",
  "giubbino", "giubbino di pelle", "cardigan", "coprispalle", "casacca",
  "piumino", "spolverino", "pelliccia", "body", "reggiseno", "sciarpa",
];

export const LSC: Record<string, string[]> = {
  Intimo: ["loveskin", "intimoreggiseni26", "intimoslip26", "slipbrasiliana26", "slipperizoma26", "slipvitaalta26", "reggisenipushup26", "reggisenibralette26", "reggisenibalconcino26", "intimobody26", "intimopigiami26", "intimotopecanotte26"],
  Sporty: ["loveskinleggings", "loveskinsporty", "loveskintop", "loveskin"],
  "Abbigliamento Daily": ["loveskin", "loveskinbody", "loveskintopecanotte", "loveskinpantaloni", "loveskincompleto", "loveskindaily", "loveskinmaglietteet-shirt", "loveskinfelpe"],
};

export const MACRO_MAP: Record<string, string> = {
  "t-shirt": "maglietteet-shirt", top: "topecanotte", canotta: "topecanotte",
  maglia: "maglie", felpa: "felpe", camicia: "camicie", "camicia di jeans": "camicie",
  giacca: "giacche", giubbino: "giubbini", "giubbino di pelle": "giubbini",
  cardigan: "cardigan", coprispalle: "coprispalle", casacca: "casacche",
  piumino: "piumini", spolverino: "spolverini", pelliccia: "pellicce",
  body: "body", pantaloni: "pantaloni", jeans: "jeans", gonna: "gonne",
  shorts: "shorts", "shorts di jeans": "shorts", abito: "abiti",
  leggings: "leggings", pigiama: "pigiami", reggiseno: "reggiseni",
  slip: "slip", scarpe: "scarpe", calzini: "calzini", sciarpa: "sciarpe",
  borsa: "borse",
};

export const SHOT_ORDER: Record<string, number> = {
  front_34: 0, scontornata: 1, back: 2, detail: 3, full_front: 4, other: 5,
};

export const INTIMO_SFX = new Set(["RG", "SL"]);
export const ABBIG_SFX = new Set(["TO", "TS", "CN"]);
export const INTIMO_CAT_MAP: Record<string, string> = {
  reggiseno: "reggiseni", slip: "slip", body: "body", pigiama: "pigiami",
  top: "topecanotte", canotta: "topecanotte",
};
