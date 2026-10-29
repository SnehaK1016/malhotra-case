"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Big, Feedback, PuzzleProps } from "./nav";
import { reduced } from "./shared";

/* After Round 1. Fixed, deterministic sequence: the token's cup goes middle → left → left → right. */
const CUPS = [
  { id: "T", name: "terracotta", fill: "#c98b6b", rim: "#a86d50" },
  { id: "B", name: "blue", fill: "#6f86a6", rim: "#4a5d78" },
  { id: "S", name: "sage", fill: "#8fa58a", rim: "#6c8466" },
];
const START: Record<string, number> = { T: 0, B: 1, S: 2 };
const TOKEN_CUP = "B";
const SWAPS: [number, number][] = [[0, 1], [1, 2], [0, 2]];
const POS = ["left", "middle", "right"];
const POS_LABEL = ["Left", "Middle", "Right"];
const STEP_TEXT = ["The token sits under the middle cup.", "The middle cup is lowered over the token.", "Swap the cups in the left and middle positions.", "Swap the cups in the middle and right positions.", "Swap the cups in the left and right positions."];
const applySwaps = (n: number) => {
  const pos = { ...START };
  SWAPS.slice(0, n).forEach(([a, b]) => { for (const k of Object.keys(pos)) pos[k] = pos[k] === a ? b : pos[k] === b ? a : pos[k]; });
  return pos;
};

function Cup({ c }: { c: (typeof CUPS)[number] }) {
  return (
    <svg viewBox="0 0 120 130" className="block h-auto w-full" aria-hidden>
      <path d="M18 18 L102 18 L90 122 L30 122 Z" fill={c.fill} />
      <path d="M30 122 L90 122" stroke={c.rim} strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="60" cy="18" rx="42" ry="9" fill={c.rim} />
      <path d="M40 40 L36 100" stroke="#fff" strokeOpacity=".25" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export default function CupShuffle({ solved, verify, busy, onRevealed }: PuzzleProps) {
  const box = useRef<HTMLDivElement>(null);
  const cupEls = useRef<Record<string, HTMLDivElement | null>>({});
  const tl = useRef<gsap.core.Timeline | null>(null);
  const [pos, setPos] = useState<Record<string, number>>(solved ? applySwaps(3) : START);
  const [phase, setPhase] = useState<"idle" | "running" | "ready" | "done">(solved ? "done" : "idle");
  const [lifted, setLifted] = useState<number | null>(solved ? 2 : null); // position whose cup is raised
  const [step, setStep] = useState(0); // reduced-motion diagram step (0–4)
  const [msg, setMsg] = useState("");
  const still = reduced();
  const latest = useRef({ pos, lifted }); latest.current = { pos, lifted };

  const place = useCallback((p: Record<string, number>, raised: string | null) => {
    const w = box.current?.clientWidth ?? 600;
    CUPS.forEach((c) => { const el = cupEls.current[c.id]; if (el) gsap.set(el, { x: (p[c.id] * w) / 3, y: c.id === raised ? -70 : 0 }); });
  }, []);
  useEffect(() => { place(pos, null); const r = () => { const v = latest.current; const raised = Object.keys(v.pos).find(k => v.pos[k] === v.lifted) ?? null; place(v.pos, raised); }; window.addEventListener("resize", r); return () => window.removeEventListener("resize", r); }, []); // eslint-disable-line

  /* plays the same fixed sequence every time; slow doubles each swap's duration */
  const run = (slow: boolean) => {
    tl.current?.kill(); setMsg(""); setLifted(null);
    const w = box.current!.clientWidth, slot = w / 3, d = slow ? 1.6 : 0.8;
    setPos(START); place(START, TOKEN_CUP); setPhase("running");
    const p = { ...START };
    const t = gsap.timeline({ onComplete: () => { setPos({ ...p }); setPhase("ready"); } });
    t.to(cupEls.current[TOKEN_CUP], { y: 0, duration: slow ? 0.9 : 0.5, ease: "power2.inOut" }, slow ? 0.9 : 0.6);
    SWAPS.forEach(([a, b]) => {
      const ca = Object.keys(p).find((k) => p[k] === a)!, cb = Object.keys(p).find((k) => p[k] === b)!;
      const xa = b * slot, xb = a * slot;
      t.to(cupEls.current[ca], { keyframes: [{ x: (a * slot + xa) / 2, y: -46, duration: d / 2, ease: "sine.out" }, { x: xa, y: 0, duration: d / 2, ease: "sine.in" }] }, ">0.25");
      t.to(cupEls.current[cb], { keyframes: [{ x: (b * slot + xb) / 2, y: 30, duration: d / 2, ease: "sine.out" }, { x: xb, y: 0, duration: d / 2, ease: "sine.in" }] }, "<");
      p[ca] = b; p[cb] = a;
    });
    tl.current = t;
  };
  useEffect(() => () => { tl.current?.kill(); }, []);

  /* reduced motion: numbered still diagrams of the same swaps */
  const stepTo = (n: number) => { setStep(n); const p = n <= 1 ? START : applySwaps(n - 1); setPos(p); setLifted(n === 0 ? 1 : null); if (n >= 4) setPhase("ready"); };
  useEffect(() => { if (still && !solved) stepTo(0); }, []); // eslint-disable-line
  useEffect(() => { if (still) CUPS.forEach((c) => { const el = cupEls.current[c.id]; if (el) gsap.set(el, { x: (pos[c.id] * (box.current?.clientWidth ?? 600)) / 3, y: lifted !== null && pos[c.id] === lifted ? -70 : 0 }); }); }, [pos, lifted, still]);

  const guess = async (position: number) => {
    if (phase !== "ready" || busy) return;
    const cup = Object.keys(pos).find((k) => pos[k] === position)!;
    if (!still) gsap.to(cupEls.current[cup], { y: -70, duration: 0.45, ease: "power2.out" });
    setLifted(position);
    const r = await verify({ cup: POS[position] });
    if (r.correct) { setMsg(""); setPhase("done"); window.setTimeout(onRevealed, still ? 0 : 700); }
    else { setMsg(r.message ?? ""); if (!still) gsap.to(cupEls.current[cup], { y: 0, duration: 0.45, delay: 1.1, ease: "power2.in", onComplete: () => setLifted(null) }); }
  };
  useEffect(() => { if (solved) { setPhase("done"); setLifted(2); if (!still) place(applySwaps(3), "S"); else setPos(applySwaps(3)); onRevealed(); } }, []); // eslint-disable-line

  const tokenPos = phase === "done" ? 2 : lifted !== null && pos[TOKEN_CUP] === lifted ? lifted : phase === "idle" ? 1 : null;
  const canPick = phase === "ready" && !busy;
  return (
    <div>
      <p className="text-[17px] text-[#2b2b2e]">Keep your eyes on the token. Which cup finishes with it?</p>
      <div className="mt-6 rounded-2xl bg-[#fbf8f1] px-4 pb-4 pt-24 shadow-inner sm:px-8">
        <div ref={box} className="relative h-[clamp(110px,22vw,170px)]">
          {/* token */}
          {tokenPos !== null && <div aria-hidden className="absolute bottom-1 z-0 flex w-1/3 justify-center" style={{ left: `${(tokenPos * 100) / 3}%` }}><span className="block h-7 w-7 rounded-full border-4 border-[#a07a2c]/60 bg-[#d9b25f]" /></div>}
          {CUPS.map((c) => (
            <div key={c.id} ref={(el) => { cupEls.current[c.id] = el; }} className="absolute bottom-0 left-0 z-10 w-1/3 px-[4%]" style={{ willChange: "transform" }}>
              <button type="button" tabIndex={-1} aria-hidden disabled={!canPick} onClick={() => guess(pos[c.id])} className="block w-full disabled:cursor-default"><Cup c={c} /></button>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-4" role="group" aria-label="Choose a cup position">
          {POS_LABEL.map((l, i) => (
            <button key={l} type="button" disabled={!canPick} onClick={() => guess(i)}
              className="min-h-[48px] rounded-xl border-2 border-[#2b2b2e]/15 bg-white px-2 py-2 text-[15px] font-semibold text-[#2b2b2e] transition-colors hover:border-[#4a5d78] disabled:cursor-default disabled:opacity-60">
              {l}{canPick && <span className="sr-only"> cup</span>}
            </button>
          ))}
        </div>
      </div>
      {still && phase !== "done" ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <p className="mr-auto text-[15px] text-[#2b2b2e]" aria-live="polite"><span className="font-semibold">Step {step + 1} of 5.</span> {STEP_TEXT[step]}</p>
          <Big kind="soft" disabled={step === 0} onClick={() => stepTo(step - 1)}>Previous step</Big>
          <Big disabled={step === 4} onClick={() => stepTo(step + 1)}>Next step</Big>
        </div>
      ) : phase !== "done" && (
        <div className="mt-5 flex flex-wrap gap-3">
          {phase === "idle" ? <Big onClick={() => run(false)}>Start shuffle</Big> : <>
            <Big kind="soft" disabled={phase === "running"} onClick={() => run(false)}>Replay</Big>
            <Big kind="soft" disabled={phase === "running"} onClick={() => run(true)}>Slow replay</Big>
          </>}
          <p className="self-center text-[14px] text-[#2b2b2e]/70" aria-live="polite">{phase === "running" ? "Shuffling…" : phase === "ready" ? "Pick the cup with the token." : ""}</p>
        </div>
      )}
      <div className="mt-4"><Feedback text={msg} /></div>
    </div>
  );
}
