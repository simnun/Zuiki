"use client";

import { useState, useEffect, useCallback } from "react";

interface LightboxProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

export default function Lightbox({ images, startIndex, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(startIndex);
  const [show, setShow] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
  }, []);

  const nav = useCallback((d: number) => {
    setIdx(prev => (prev + d + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") nav(-1);
      if (e.key === "ArrowRight") nav(1);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [nav, onClose]);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className={`lightbox ${show ? "show" : ""}`}
      style={{ display: "flex" }}
      onClick={(e) => { if ((e.target as HTMLElement).tagName !== "IMG") handleClose(); }}
    >
      <button className="lightbox-close" onClick={handleClose}>✕</button>
      <button className="lightbox-nav" style={{ left: 16 }} onClick={(e) => { e.stopPropagation(); nav(-1); }}>‹</button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[idx]} alt="" />
      <button className="lightbox-nav" style={{ right: 16 }} onClick={(e) => { e.stopPropagation(); nav(1); }}>›</button>
    </div>
  );
}

// Global lightbox state manager
let _openLightbox: ((images: string[], idx: number) => void) | null = null;

export function setLightboxOpener(fn: (images: string[], idx: number) => void) {
  _openLightbox = fn;
}

export function openLB(images: string[], idx: number) {
  _openLightbox?.(images, idx);
}
