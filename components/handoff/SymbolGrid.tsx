"use client";
import { useEffect, useState } from "react";
import { Big, Feedback, PuzzleProps } from "./nav";
import { reduced } from "./shared";

/* After Round 4. Outlined shapes plus names, never colour alone. */
type Sym = "circle" | "triangle" | "square";
const GRID: (Sym | null)[][] = [["circle", "triangle", "square"], ["triangle", "square", "circle"], ["square", "circle", null]];
const KEY: [Sym, string][] = [["circle", "Lab"], ["triangle", "B3"], ["square", "C4"]];
const NAME: Record<Sym, string> = { circle: "Circle", triangle: "Triangle", square: "Square" };

export function Shape({ s, size = 44 }: { s: Sym; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      {s === "circle" && <circle cx="20" cy="20" r="14" fill="none" stroke="#2b2b2e" strokeWidth="3" />}
      {s === "triangle" && <path d="M20 5 L35 33 L5 33 Z" fill="none" stroke="#2b2b2e" strokeWidth="3" strokeLinejoin="round" />}
      {s === "square" && <rect x="7" y="7" width="26" height="26" rx="2" fill="none" stroke="#2b2b2e" strokeWidth="3" />}
    </svg>
  );
}

export default function SymbolGrid({ solved, verify, busy, onRevealed }: PuzzleProps) {
  const [pick, setPick] = useState<Sym | "">(solved ? "triangle" : "");
  const [msg, setMsg] = useState("");
  const [trace, setTrace] = useState(solved);
  useEffect(() => { if (solved) onRevealed(); }, []); // eslint-disable-line
  const check = async () => {
    setMsg("");
    const r = await verify({ symbol: pick });
    if (!r.correct) return setMsg(r.message ?? "");
    setTrace(true);
    window.setTimeout(onRevealed, reduced() ? 0 : 1100);
  };
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-8">
      <div className="min-w-0">
        <p className="text-[17px] text-[#2b2b2e]">Find the missing symbol. Then use the destination key.</p>
        <p className="mt-1 text-[15px] text-[#2b2b2e]/75">Every row and every column must contain each symbol exactly once.</p>
        <div className="mx-auto mt-5 grid max-w-[360px] grid-cols-3 gap-2" role="table" aria-label="Symbol grid">
          {GRID.map((row, r) => row.map((s, c) => {
            const shown = s ?? (solved || trace ? "triangle" : null);
            const lit = trace && (r === 2 || c === 2);
            return (
              <div key={`${r}${c}`} role="cell" className={`flex aspect-square flex-col items-center justify-center rounded-xl border-2 bg-white transition-colors duration-500 ${lit ? "border-[#8fa58a] bg-[#8fa58a]/15" : s ? "border-[#2b2b2e]/12" : "border-dashed border-[#4a5d78]"}`}>
                {shown ? <><span className={!s ? "grid-drop" : ""}><Shape s={shown} /></span><span className="mt-1 text-[12px] text-[#2b2b2e]/70">{NAME[shown]}</span></> : <span className="serif text-4xl text-[#4a5d78]">?</span>}
              </div>
            );
          }))}
        </div>
      </div>
      <div className="min-w-0 self-start space-y-4">
        <div className="rounded-2xl border-2 border-[#2b2b2e]/10 bg-[#fbf8f1] p-5">
          <p className="text-[15px] font-semibold text-[#2b2b2e]">Destination key</p>
          <ul className="mt-2 space-y-2">{KEY.map(([s, room]) => <li key={s} className="flex items-center gap-3 text-[16px] text-[#2b2b2e]"><Shape s={s} size={30} /><span className="w-20">{NAME[s]}</span><span aria-hidden>→</span><span className="sr-only">leads to</span><span className="font-semibold">{room}</span></li>)}</ul>
        </div>
        {!solved && (
          <>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Answer tiles">
              {(["circle", "triangle", "square"] as Sym[]).map((s) => (
                <button key={s} type="button" role="radio" aria-checked={pick === s} onClick={() => { setPick(s); setMsg(""); }}
                  className={`flex min-h-[84px] flex-col items-center justify-center rounded-xl border-2 transition-colors ${pick === s ? "border-[#4a5d78] bg-[#e3e8ef]" : "border-[#2b2b2e]/15 bg-white hover:border-[#4a5d78]"}`}>
                  <Shape s={s} size={34} /><span className="mt-1 text-[14px] font-semibold">{NAME[s]}</span>
                </button>
              ))}
            </div>
            <Big disabled={!pick || busy} onClick={check}>Check pattern</Big>
          </>
        )}
        <Feedback text={msg} />
      </div>
    </div>
  );
}
