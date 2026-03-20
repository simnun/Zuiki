"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { openLB } from "./Lightbox";

interface WizardDoubt {
  idx: number;
  it: any;
}

interface WizardProps {
  onClose: () => void;
  onRework: (toRework: WizardDoubt[]) => void;
}

export default function Wizard({ onClose, onRework }: WizardProps) {
  const { state, dispatch } = useStore();
  const { items } = state;

  const [doubts, setDoubts] = useState<WizardDoubt[]>(() =>
    items.map((it, i) => ({ idx: i, it })).filter(x => x.it.doubt && !x.it.doubtResolved)
  );
  const [wizIdx, setWizIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [wizIdx]);

  if (!doubts.length) {
    onClose();
    return null;
  }

  const d = doubts[wizIdx];
  const it = d.it;
  const np = doubts.length;
  const imgSrc = it.ap ? it.ap[0] : it.pv;

  const saveInput = () => {
    if (inputRef.current) {
      const newDoubts = [...doubts];
      newDoubts[wizIdx] = { ...newDoubts[wizIdx], it: { ...newDoubts[wizIdx].it, doubtInput: inputRef.current.value } };
      setDoubts(newDoubts);
    }
  };

  const skip = () => {
    const newItems = [...items];
    newItems[d.idx] = { ...newItems[d.idx], doubt: false, doubtResolved: true };
    dispatch({ type: "SET_ITEMS", payload: newItems });
    const newDoubts = doubts.filter((_, i) => i !== wizIdx);
    if (!newDoubts.length) { onClose(); return; }
    setDoubts(newDoubts);
    if (wizIdx >= newDoubts.length) setWizIdx(newDoubts.length - 1);
  };

  const prev = () => {
    if (wizIdx > 0) { saveInput(); setWizIdx(wizIdx - 1); }
  };

  const next = () => {
    saveInput();
    const currentInput = inputRef.current?.value?.trim();
    const newItems = [...items];

    if (currentInput) {
      // Resolve doubt
      newItems[d.idx] = {
        ...newItems[d.idx],
        doubtResolved: true,
        doubt: false,
        doubtUserInfo: currentInput,
        doubtInput: currentInput,
      };
    } else {
      newItems[d.idx] = { ...newItems[d.idx], doubt: false, doubtResolved: true };
    }
    dispatch({ type: "SET_ITEMS", payload: newItems });

    if (wizIdx < doubts.length - 1) {
      setWizIdx(wizIdx + 1);
      return;
    }

    // Last one - collect items to rework
    const toRework = doubts.filter(d => {
      const item = newItems[d.idx];
      return item.doubtUserInfo;
    });
    onClose();
    if (toRework.length) onRework(toRework);
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-card">
        <div className="wizard-progress" style={{ flexShrink: 0 }}>
          <div className="wizard-progress-bar" style={{ width: `${((wizIdx + 1) / np) * 100}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{wizIdx + 1} di {np}</span>
          <span className="sku" style={{ fontSize: 14 }}>{it.sku}</span>
          <span className="tag-t">{it.tp}</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          className="wizard-img"
          alt=""
          style={{ cursor: "zoom-in" }}
          onClick={() => openLB(it.ap || [it.pv], 0)}
        />
        <div className="doubt-box" style={{ marginTop: 0, marginBottom: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
            <span style={{ fontSize: 16 }}>🔍</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#8a5e00", marginBottom: 2 }}>Stampa/Logo da identificare</p>
              <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.3 }}>L&apos;AI ha visto: <em>&quot;{it.doubtDesc}&quot;</em></p>
            </div>
          </div>
          <input
            ref={inputRef}
            className="inp"
            placeholder="Scrivi le info per chiarire il dubbio..."
            style={{ fontSize: 14, borderColor: "#f0d8a8", padding: "10px 14px" }}
            defaultValue={it.doubtInput || ""}
            onKeyDown={(e) => { if (e.key === "Enter") next(); }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexShrink: 0 }}>
          {wizIdx > 0 ? (
            <button className="btn btn-s" onClick={prev}>← Indietro</button>
          ) : <div />}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-s" onClick={skip}>Ignora</button>
            <button className="btn btn-p" onClick={next}>
              {wizIdx === np - 1 ? "Completa e Rielabora →" : "Avanti →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
