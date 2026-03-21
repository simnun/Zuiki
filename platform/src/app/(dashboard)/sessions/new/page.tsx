"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Script from "next/script";
import { StoreProvider, useStore } from "@/lib/store";
import { createProcessor } from "@/lib/catalog-processor";
import { createActions } from "@/lib/catalog-actions";
import Header from "@/components/Header";
import Lightbox, { setLightboxOpener } from "@/components/Lightbox";
import Wizard from "@/components/Wizard";
import StepSetup from "@/components/StepSetup";
import StepCatalog from "@/components/StepCatalog";
import StepExport from "@/components/StepExport";

function ApiKeyPrompt({ dispatch }: { dispatch: any }) {
  const [key, setKey] = useState("");
  const save = () => {
    const v = key.trim();
    if (v) {
      localStorage.setItem("za", v);
      dispatch({ type: "SET_STATE", payload: { ak: v, step: 0 } });
    }
  };
  return (
    <div className="animate-fadeUp" style={{ maxWidth: 560, margin: "40px auto" }}>
      <div className="card" style={{ padding: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>API Key richiesta</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
          Per utilizzare il catalogo AI serve la chiave API di Anthropic (Claude).
          Senza di essa non è possibile processare le foto dello shooting.
        </p>
        <div className="field">
          <label>API KEY ANTHROPIC</label>
          <input
            className="inp"
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            onKeyDown={e => { if (e.key === "Enter") save(); }}
          />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn btn-p" onClick={save} style={{ padding: "12px 28px" }}>
            Salva e continua
          </button>
          <a href="/settings" style={{ fontSize: 12, color: "var(--muted)" }}>
            Oppure vai alle Impostazioni
          </a>
        </div>
        <div style={{
          background: "var(--subtle)", borderRadius: 10, padding: "14px 16px",
          marginTop: 20, border: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Come ottenere la API Key</div>
          <ol style={{ fontSize: 12, color: "var(--muted)", margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Vai su <strong>console.anthropic.com</strong></li>
            <li>Crea un account o accedi</li>
            <li>Vai in <strong>API Keys</strong> e crea una nuova chiave</li>
            <li>Copia la chiave e incollala qui sopra</li>
          </ol>
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
          La chiave viene salvata solo nel tuo browser e non viene mai inviata ai nostri server.
        </p>
      </div>
    </div>
  );
}

function SessionContent() {
  const { state, dispatch, cAI, getExcelInfo } = useStore();
  const { step } = state;
  const stateRef = useRef(state);
  stateRef.current = state;

  // On mount: skip login step, go to API key or setup
  useEffect(() => {
    if (step === -2) {
      // User is already authenticated via NextAuth — skip login
      const ak = localStorage.getItem("za") || "";
      if (ak) {
        dispatch({ type: "SET_STATE", payload: { step: 0, ak } });
      } else {
        dispatch({ type: "SET_STEP", payload: -1 });
      }
    }
  }, [step, dispatch]);

  // Lightbox state
  const [lbImages, setLbImages] = useState<string[] | null>(null);
  const [lbStart, setLbStart] = useState(0);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);

  // Set up lightbox opener
  useEffect(() => {
    setLightboxOpener((images, idx) => {
      setLbImages(images);
      setLbStart(idx);
    });
  }, []);

  // Create processor and actions
  const processorRef = useRef<ReturnType<typeof createProcessor> | null>(null);
  const actionsRef = useRef<ReturnType<typeof createActions> | null>(null);

  useEffect(() => {
    const getState = () => stateRef.current;
    processorRef.current = createProcessor({ cAI, dispatch, getExcelInfo, getState });
    actionsRef.current = createActions({ cAI, dispatch, getState, getExcelInfo });
  }, [cAI, dispatch, getExcelInfo]);

  // Wire up custom events from StepCatalog
  useEffect(() => {
    const handlers: Record<string, (e: Event) => void> = {
      "catalog:addFiles": (e) => {
        const files = (e as CustomEvent).detail;
        processorRef.current?.procF(files);
      },
      "catalog:retryOne": (e) => {
        processorRef.current?.retryOne((e as CustomEvent).detail);
      },
      "catalog:retryErrors": () => {
        processorRef.current?.retryErrors();
      },
      "catalog:suggestCorr": (e) => {
        actionsRef.current?.suggestCorr((e as CustomEvent).detail);
      },
      "catalog:regenLong": (e) => {
        actionsRef.current?.regenLong((e as CustomEvent).detail);
      },
      "catalog:openWizard": () => {
        setWizardOpen(true);
      },
      "catalog:resolveSuffix": (e) => {
        processorRef.current?.resolveSuffix((e as CustomEvent).detail);
      },
    };

    for (const [event, handler] of Object.entries(handlers)) {
      window.addEventListener(event, handler);
    }
    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        window.removeEventListener(event, handler);
      }
    };
  }, []);

  const handleWizardClose = useCallback(() => setWizardOpen(false), []);
  const handleWizardRework = useCallback((toRework: any[]) => {
    actionsRef.current?.handleWizardRework(toRework);
  }, []);
  const handleFindCorrelations = useCallback(() => {
    actionsRef.current?.findCorrelations();
  }, []);

  return (
    <>
      <Header />
      {wizardOpen && (
        <Wizard onClose={handleWizardClose} onRework={handleWizardRework} />
      )}
      {lbImages && (
        <Lightbox
          images={lbImages}
          startIndex={lbStart}
          onClose={() => setLbImages(null)}
        />
      )}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px" }}>
        {step === -1 && <ApiKeyPrompt dispatch={dispatch} />}
        {step === 0 && <StepSetup />}
        {step === 1 && <StepCatalog />}
        {step === 2 && <StepExport onFindCorrelations={handleFindCorrelations} />}
      </main>
    </>
  );
}

export default function NewSessionPage() {
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
        strategy="beforeInteractive"
      />
      <StoreProvider>
        <SessionContent />
      </StoreProvider>
    </>
  );
}
