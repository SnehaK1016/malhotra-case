"use client";
import { useEffect, useState } from "react";
import { Big, Feedback, PuzzleProps } from "./nav";

/* After Round 2. Each move previews ONE transformation of the ORIGINAL mirrored sign. */
const OPS = [
  { id: "rot180", label: "Turn upside down", says: "Preview: the original sign turned upside down (rotated 180 degrees)." },
  { id: "flip-h", label: "Flip left to right", says: "Preview: the original sign flipped left to right (reflected across a vertical line)." },
  { id: "flip-v", label: "Flip top to bottom", says: "Preview: the original sign flipped top to bottom (reflected across a horizontal line)." },
];
/* same function list in every state so the browser can animate a gentle paper flip between them */
const TRANSFORM: Record<string, string> = {
  none: "rotate(0deg) scale(-1, 1)",
  rot180: "rotate(180deg) scale(-1, 1)",
  "flip-h": "rotate(0deg) scale(1, 1)",
  "flip-v": "rotate(0deg) scale(-1, -1)",
};

export default function MirrorSign({ solved, verify, busy, onRevealed }: PuzzleProps) {
  const [op, setOp] = useState<string>(solved ? "flip-h" : "none");
  const [msg, setMsg] = useState("");
  useEffect(() => { if (solved) onRevealed(); }, []); // eslint-disable-line
  const check = async () => {
    setMsg("");
    const r = await verify({ op });
    if (r.correct) window.setTimeout(onRevealed, 500); else setMsg(r.message ?? "");
  };
  return (
    <div>
      <p className="text-[17px] text-[#2b2b2e]">The room sign was printed backwards. Fix it with one move.</p>
      <p className="sr-only">The original sign has been reflected across a vertical line.</p>
      <div className="mt-6 flex justify-center rounded-2xl bg-[#e9e4da] px-4 py-8" style={{ perspective: 900 }}>
        <div className="mirror-sign w-full max-w-[420px]" style={{ transform: TRANSFORM[op] }}>
          <svg viewBox="0 0 420 220" className="block h-auto w-full drop-shadow-[0_8px_14px_rgba(43,43,46,.18)]" aria-hidden>
            <rect x="6" y="6" width="408" height="208" rx="18" fill="#fbf8f1" stroke="#2b2b2e" strokeOpacity=".25" strokeWidth="2" />
            <rect x="22" y="22" width="376" height="176" rx="10" fill="none" stroke="#4a5d78" strokeWidth="3" />
            <circle cx="40" cy="40" r="5" fill="#2b2b2e" fillOpacity=".3" /><circle cx="380" cy="40" r="5" fill="#2b2b2e" fillOpacity=".3" />
            <text x="210" y="150" textAnchor="middle" fontSize="118" fontWeight="600" fontFamily="var(--font-serif), Georgia, serif" fill="#2b2b2e">B2</text>
          </svg>
        </div>
      </div>
      <p className="mt-3 text-center text-[14px] text-[#2b2b2e]/70" aria-live="polite">{op === "none" ? "The original sign, reflected across a vertical line." : OPS.find((o) => o.id === op)!.says}</p>
      {!solved && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Choose one move">
            {OPS.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={op === o.id} onClick={() => { setOp(o.id); setMsg(""); }}
                className={`min-h-[52px] rounded-xl border-2 px-4 py-3 text-[15px] font-semibold transition-colors ${op === o.id ? "border-[#4a5d78] bg-[#e3e8ef]" : "border-[#2b2b2e]/15 bg-white hover:border-[#4a5d78]"}`}>{o.label}</button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Big disabled={op === "none" || busy} onClick={check}>Check sign</Big>
            <Big kind="soft" disabled={op === "none"} onClick={() => { setOp("none"); setMsg(""); }}>Reset</Big>
          </div>
        </>
      )}
      <div className="mt-4"><Feedback text={msg} /></div>
    </div>
  );
}
