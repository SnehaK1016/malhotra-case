"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Paper, Stamp } from "@/components/kit";
import type { Outcome } from "./useRound";

/* The only place a round asks for an answer. Presented as an investigator's note, not a form. */
export default function Finding({ title = "Your finding", sub, label = "Verify finding", ready, busy, onSubmit, outcome, onNext, nextLabel, children, tone = "paper", locked }: {
  title?: string; sub?: string; label?: string; ready: boolean; busy: boolean; onSubmit: () => void; outcome: Outcome; onNext: () => void; nextLabel: string;
  children: React.ReactNode; tone?: "paper" | "ledger" | "blue"; locked?: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const done = !!outcome?.correct;
  useEffect(() => {
    if (outcome && !outcome.correct && form.current) { form.current.classList.remove("shake"); void form.current.offsetWidth; form.current.classList.add("shake"); }
  }, [outcome]);
  useEffect(() => {
    if (done && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.fromTo(".res-line", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.28, ease: "power3.out" });
  }, [done]);

  if (done) {
    const lines = outcome!.lines ?? ["EVIDENCE VERIFIED"];
    return (
      <div className="mx-auto max-w-2xl">
        <Paper tone={tone === "paper" ? "" : tone} className="mx-auto" rot={-0.6} tape="top">
          <div className="p-8 md:p-12">
            <Stamp rot={-6}>Verified</Stamp>
            <p className="res-line serif mt-6 text-[clamp(1.8rem,4vw,3rem)] font-light leading-[1.05]">{lines[0]}</p>
            <div className="mt-5 space-y-2">{lines.slice(1).map((l, i) => <p key={i} className={`res-line ${i === lines.length - 2 ? "mono text-sm font-semibold tracking-[0.1em] text-wine" : "text-lg text-black/70"}`}>{l}</p>)}</div>
          </div>
        </Paper>
        <div className="mt-8 flex justify-center"><button className="btn-light max-w-full" onClick={onNext}>{nextLabel}</button></div>
      </div>
    );
  }
  return (
    <form ref={form} onSubmit={(e) => { e.preventDefault(); if (ready && !busy) onSubmit(); }} noValidate className="mx-auto max-w-xl">
      <Paper tone={tone === "paper" ? "" : tone} rot={0.5} tape="tr">
        <div className="p-7 md:p-10">
          <h3 className="serif text-3xl">{title}</h3>
          {sub && <p className="font-hand mt-1 text-2xl text-black/60">{sub}</p>}
          <div className="mt-6 space-y-5 text-ink">{children}</div>
          <button className="btn mt-8 w-full" disabled={!ready || busy || !!locked}>{busy ? "Checking the evidence" : label}</button>
          {locked && <p className="mt-2 text-[13px] text-black/60">{locked}</p>}
          {outcome && !outcome.correct && (
            <div role="alert" className="mt-5 border-l-2 border-wine bg-wine/5 px-3 py-3"><p className="text-sm font-semibold tracking-[0.1em] text-wine">{outcome.message}</p><p className="mt-1 text-sm">{outcome.detail}</p></div>
          )}
        </div>
      </Paper>
    </form>
  );
}

export const FieldLabel = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => <label htmlFor={htmlFor} className="mono mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/60">{children}</label>;
export const inkField = "w-full border-0 border-b-2 border-black/40 bg-transparent px-1 py-2 font-hand text-[26px] leading-none text-[#1f3a6b] placeholder:text-black/30 focus:border-wine focus:outline-none";
