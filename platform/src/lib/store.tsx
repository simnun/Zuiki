"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import type {
  CatalogItem, SessionConfig, ModellaInfo, UnknownSuffix, Correlation, StepIndex, ExcelInfo,
} from "./catalog-types";
import { SFX, SHOT_ORDER, SCMAP } from "./constants";
import { pSKU, gSuf, mNm, mDs, mTags, mTagsLoveskin, toB, mT, runPool, fmtComp } from "./utils";
import { mPr, mPrLong, genMetaTitle, genMetaDescPrompt, genMetaKeys, genAltImgPrompt, classifyPhotosPrompt } from "./ai-prompts";

// ─── State ───
export interface AppState {
  step: StepIndex;
  cfg: SessionConfig;
  items: CatalogItem[];
  unk: UnknownSuffix[];
  corr: Correlation[];
  cD: boolean;  // correlations done
  cL: boolean;  // correlations loading
  eI: number | null;  // expanded item index
  mod: ModellaInfo[];
  ak: string;  // api key
  cS: Record<string, string>;  // custom suffixes
  licMem: Record<string, string>;
  facePh: Record<string, string[]>;
  nM: boolean;  // new model form
  nMann: boolean;
  pwErr: boolean;
  procPhase: string;
  procStart: number;
  procTimes: number[];
  rwTotal: number;
  rwDone: number;
  excelWb: any;
  excelRows: any[];
  excelMap: Record<string, ExcelInfo>;
  excelFileName: string;
  tmpFaces: string[];
  tmpNm: string;
  tmpAl: string;
  tmpTs: string;
  tmpTi: string;
}

const defaultCfg: SessionConfig = {
  br: "", st: "", an: "", ds: "", selMods: [], noModel: false,
  shootType: "", mannequin: { taglia: "", petto: "", vita: "", fianchi: "" },
};

function getInitialState(): AppState {
  return {
    step: -2 as StepIndex,
    cfg: defaultCfg,
    items: [],
    unk: [],
    corr: [],
    cD: false,
    cL: false,
    eI: null,
    mod: [],
    ak: "",
    cS: {},
    licMem: {},
    facePh: {},
    nM: false,
    nMann: false,
    pwErr: false,
    procPhase: "",
    procStart: 0,
    procTimes: [],
    rwTotal: 0,
    rwDone: 0,
    excelWb: null,
    excelRows: [],
    excelMap: {},
    excelFileName: "",
    tmpFaces: [],
    tmpNm: "",
    tmpAl: "",
    tmpTs: "",
    tmpTi: "",
  };
}

// ─── Actions ───
type Action =
  | { type: "SET_STATE"; payload: Partial<AppState> }
  | { type: "SET_STEP"; payload: StepIndex }
  | { type: "SET_CFG"; payload: Partial<SessionConfig> }
  | { type: "SET_ITEM"; idx: number; payload: Partial<CatalogItem> }
  | { type: "SET_ITEMS"; payload: CatalogItem[] }
  | { type: "ADD_ITEMS"; payload: CatalogItem[] }
  | { type: "REMOVE_ITEM"; idx: number }
  | { type: "SET_UNK"; payload: UnknownSuffix[] }
  | { type: "INIT_FROM_STORAGE" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_STATE":
      return { ...state, ...action.payload };
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "SET_CFG":
      return { ...state, cfg: { ...state.cfg, ...action.payload } };
    case "SET_ITEM": {
      const items = [...state.items];
      items[action.idx] = { ...items[action.idx], ...action.payload };
      return { ...state, items };
    }
    case "SET_ITEMS":
      return { ...state, items: action.payload };
    case "ADD_ITEMS":
      return { ...state, items: [...state.items, ...action.payload] };
    case "REMOVE_ITEM": {
      const items = state.items.filter((_, i) => i !== action.idx);
      return { ...state, items, eI: null };
    }
    case "SET_UNK":
      return { ...state, unk: action.payload };
    default:
      return state;
  }
}

// ─── Context ───
interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  cAI: (content: any, retries?: number) => Promise<string>;
  getExcelInfo: (sku: string) => ExcelInfo | null;
}

const StoreContext = createContext<StoreContextValue>(null!);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, getInitialState());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load from localStorage on mount (API key is fetched from DB in sessions/new)
  useEffect(() => {
    const cS = JSON.parse(localStorage.getItem("zs") || "{}");
    const mod = JSON.parse(localStorage.getItem("zm") || "[]");
    const licMem = JSON.parse(localStorage.getItem("zlm") || "{}");
    const facePh = JSON.parse(localStorage.getItem("zfp") || "{}");

    // API key loaded from DB via /api/company/apikey in sessions/new page
    // Start at step -2 (auth check), sessions/new handles the rest
    dispatch({ type: "SET_STATE", payload: { cS, mod, licMem, facePh, step: -2 as StepIndex } });
  }, []);

  const cAI = useCallback(async (content: any, retries = 0): Promise<string> => {
    const ak = stateRef.current.ak;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ak,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages: [{ role: "user", content }] }),
    });
    if ((r.status === 429 || r.status === 529 || r.status >= 500) && retries < 6) {
      const delay = Math.pow(2, retries) * 3000;
      await new Promise(r => setTimeout(r, delay));
      return cAI(content, retries + 1);
    }
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`);
    }
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    return d.content?.map((x: any) => x.text || "").join("") || "";
  }, []);

  const getExcelInfo = useCallback((sku: string): ExcelInfo | null => {
    return stateRef.current.excelMap[sku.toUpperCase()] || null;
  }, []);

  return (
    <StoreContext.Provider value={{ state, dispatch, cAI, getExcelInfo }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
