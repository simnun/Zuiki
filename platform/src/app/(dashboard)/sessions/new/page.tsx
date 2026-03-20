"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Script from "next/script";
import { StoreProvider, useStore } from "@/lib/store";
import { createProcessor } from "@/lib/catalog-processor";
import { createActions } from "@/lib/catalog-actions";
import Header from "@/components/Header";
import Lightbox, { setLightboxOpener } from "@/components/Lightbox";
import Wizard from "@/components/Wizard";
import StepApiKey from "@/components/StepApiKey";
import StepSetup from "@/components/StepSetup";
import StepCatalog from "@/components/StepCatalog";
import StepExport from "@/components/StepExport";

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
        {step === -1 && <StepApiKey />}
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
