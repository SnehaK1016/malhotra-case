"use client";
import { useEffect, useState } from "react";
import { Big, Feedback, PuzzleProps } from "./nav";
import { reduced } from "./shared";

/* After Round 3. Columns A–D, rows 1–4 with row 1 at the top. The robot starts at A4. */
const COLS = ["A", "B", "C", "D"];
const MOVES: [string, number, number][] = [["RIGHT", 2, 0], ["UP", 2, 0], ["LEFT", 1, 0], ["UP", 1, 0]];
const START = { c: 0, r: 4 };
/* the route is derived from the movement card, and only drawn after the server has accepted the answer */
const route = () => {
  const out = [{ ...START }];
  let { c, r } = START;
  for (const [dir, n] of MOVES) { if (dir === "RIGHT") c += n; if (dir === "LEFT") c -= n; if (dir === "UP") r -= n; out.push({ c, r }); }
  return out;
};
const name = (c: number, r: number) => `${COLS[c]}${r}`;

function Robot() {
  return (
    <svg viewBox="0 0 60 60" className="h-[70%] w-[70%]" aria-hidden>
      <rect x="14" y="18" width="32" height="26" rx="7" fill="#4a5d78" />
      <rect x="20" y="25" width="7" height="7" rx="2" fill="#fbf8f1" /><rect x="33" y="25" width="7" height="7" rx="2" fill="#fbf8f1" />
      <rect x="27" y="8" width="6" height="10" rx="2" fill="#2b2b2e" /><circle cx="30" cy="8" r="3.5" fill="#c98b6b" />
      <rect x="18" y="44" width="8" height="8" rx="2" fill="#2b2b2e" /><rect x="34" y="44" width="8" height="8" rx="2" fill="#2b2b2e" />
    </svg>
  );
}

export default function RobotGrid({ solved, verify, busy, onRevealed }: PuzzleProps) {
  const [sel, setSel] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [at, setAt] = useState(solved ? route().length - 1 : 0); // index along the route
  const [trail, setTrail] = useState<number>(solved ? route().length : 0);
  const pts = route();
  const bot = pts[at];
  useEffect(() => { if (solved) onRevealed(); }, []); // eslint-disable-line

  const check = async () => {
    setMsg("");
    const r = await verify({ cell: sel });
    if (!r.correct) return setMsg(r.message ?? "");
    if (reduced()) { setAt(pts.length - 1); setTrail(pts.length); onRevealed(); return; }
    pts.forEach((_, i) => window.setTimeout(() => { setAt(i); setTrail(i + 1); if (i === pts.length - 1) window.setTimeout(onRevealed, 500); }, 550 * i + 200));
  };
  const onPath = (c: number, r: number) => {
    for (let i = 0; i < trail - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (c >= Math.min(a.c, b.c) && c <= Math.max(a.c, b.c) && r >= Math.min(a.r, b.r) && r <= Math.max(a.r, b.r)) return true;
    }
    return false;
  };
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-8">
      <div className="min-w-0">
        <p className="text-[17px] text-[#2b2b2e]">Follow every move. Select the square where the robot finishes.</p>
        <div className="mx-auto mt-5 max-w-[420px]">
          <p className="mb-2 flex items-center justify-center gap-2 text-[14px] font-semibold text-[#2b2b2e]"><svg width="16" height="18" viewBox="0 0 16 18" aria-hidden><path d="M8 1 L15 9 L10 9 L10 17 L6 17 L6 9 L1 9 Z" fill="#4a5d78" /></svg>UP</p>
          <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-1.5">
            <span />
            <div className="grid grid-cols-4 gap-1.5 text-center text-[14px] font-semibold text-[#2b2b2e]/70">{COLS.map((c) => <span key={c}>{c}</span>)}</div>
            <div className="grid grid-rows-4 gap-1.5 text-center text-[14px] font-semibold text-[#2b2b2e]/70">{[1, 2, 3, 4].map((r) => <span key={r} className="flex items-center justify-center">{r}</span>)}</div>
            <div className="relative grid grid-cols-4 grid-rows-4 gap-1.5" role="radiogroup" aria-label="Grid squares">
              {[1, 2, 3, 4].map((r) => COLS.map((cl, c) => {
                const id = name(c, r);
                return (
                  <button key={id} type="button" role="radio" aria-checked={sel === id} aria-label={`Square ${id}${c === START.c && r === START.r ? ", robot start" : ""}`} disabled={solved}
                    onClick={() => { setSel(id); setMsg(""); }}
                    className={`relative aspect-square rounded-lg border-2 text-[12px] transition-colors ${sel === id && !solved ? "border-[#4a5d78] bg-[#e3e8ef]" : onPath(c, r) ? "border-[#8fa58a] bg-[#8fa58a]/25" : "border-[#2b2b2e]/12 bg-white hover:border-[#4a5d78]/60"}`}>
                    <span className="absolute left-1.5 top-1 text-[#2b2b2e]/45">{id}</span>
                  </button>
                );
              }))}
              <div aria-hidden className="robot-mark pointer-events-none absolute flex items-center justify-center" style={{ width: "calc((100% - 3 * 0.375rem) / 4)", height: "calc((100% - 3 * 0.375rem) / 4)", left: `calc(${bot.c} * (100% + 0.375rem) / 4)`, top: `calc(${bot.r - 1} * (100% + 0.375rem) / 4)` }}><Robot /></div>
            </div>
          </div>
        </div>
      </div>
      <div className="min-w-0 self-start">
        <div className="rounded-2xl border-2 border-[#2b2b2e]/10 bg-[#fbf8f1] p-5">
          <p className="text-[15px] font-semibold text-[#2b2b2e]">Movement card</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[16px] text-[#2b2b2e]">{MOVES.map(([d, n], i) => <li key={i}>Move <b>{d}</b> {n} square{n > 1 ? "s" : ""}.</li>)}</ol>
          <p className="mt-3 text-[14px] text-[#2b2b2e]/70">The robot starts at A4. The coordinate of the square where it finishes is also the name of your next room.</p>
        </div>
        {!solved && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Big disabled={!sel || busy} onClick={check}>Check destination</Big>
            <Big kind="soft" disabled={!sel} onClick={() => { setSel(""); setMsg(""); }}>Reset selection</Big>
            <span className="text-[14px] text-[#2b2b2e]/70" aria-live="polite">{sel ? `Selected: ${sel}` : "No square selected."}</span>
          </div>
        )}
        <div className="mt-4"><Feedback text={msg} /></div>
      </div>
    </div>
  );
}
