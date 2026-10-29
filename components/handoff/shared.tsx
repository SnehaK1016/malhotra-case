"use client";
import { useEffect, useRef, useState } from "react";

export const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Keeps Tab focus inside a modal layer. */
export function useFocusTrap(ref: React.RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.defaultPrevented) return;
      const f = Array.from(el.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null || x instanceof SVGElement);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [ref, active]);
}

/* Locks page scrolling behind a dialog and restores it afterwards. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement, body = document.body;
    const prev = [html.style.overflow, body.style.overflow, body.style.paddingRight];
    const gap = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden"; body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => { html.style.overflow = prev[0]; body.style.overflow = prev[1]; body.style.paddingRight = prev[2]; };
  }, [active]);
}

/* A recovered document that can be opened full screen. The enlarged copy is live, so it can be worked on directly. */
export function Enlargeable({ label, children, render }: { label: string; children: React.ReactNode; render: () => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useFocusTrap(layer, open);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);
  useEffect(() => { if (!open) btn.current?.focus({ preventScroll: true }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="min-w-0">
      {children}
      <button ref={btn} type="button" className="clue-link mt-3" onClick={() => setOpen(true)} aria-haspopup="dialog">Enlarge {label}</button>
      {open && (
        <div ref={layer} role="dialog" aria-modal="true" aria-label={`${label}, enlarged`} className="fixed inset-0 z-[80] overflow-y-auto px-4 py-6 md:px-10" style={{ background: "#141416" }}>
          <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 pb-4 text-bone">
            <p className="serif text-xl">{label[0].toUpperCase() + label.slice(1)}</p>
            <button ref={close} type="button" className="btn-light !px-5 !py-2.5" onClick={() => setOpen(false)}>Close enlargement</button>
          </div>
          <div className="mx-auto max-w-[1100px]">{render()}</div>
        </div>
      )}
    </div>
  );
}

