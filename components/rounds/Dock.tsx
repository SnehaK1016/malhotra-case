"use client";
import { useEffect, useState } from "react";
import type { RoundPayload } from "@/lib/client";

/* Floating investigator's dock: notes and hints stay at hand while the evidence scrolls. */
export default function Dock({ teamCode, round, data, hint, hintMsg, complete }: { teamCode?: string; round: number; data: RoundPayload; hint: () => Promise<void>; hintMsg: string; complete: boolean }) {
  const [open, setOpen] = useState<"" | "notes" | "hints">("");
  const [confirm, setConfirm] = useState(false);
  const [notes, setNotes] = useState("");
  const key = `mc_notes_${teamCode}_${round}`;
  useEffect(() => { if (teamCode) setNotes(localStorage.getItem(key) ?? ""); }, [key, teamCode]);
  useEffect(() => { if (teamCode) localStorage.setItem(key, notes); }, [notes]); // eslint-disable-line

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open === "notes" && (
        <div className="w-[min(92vw,340px)] bg-[#e9e3d3] p-4 shadow-2xl" style={{ transform: "rotate(-.6deg)" }}>
          <p className="mono mb-2 text-[11px] text-black/55">Investigation note. Saved on this device.</p>
          <textarea autoFocus value={notes} onChange={(e) => setNotes(e.target.value)} rows={7} placeholder="What have you found so far?" className="font-hand w-full resize-none bg-transparent text-[22px] leading-[1.15] text-[#2a2620] placeholder:text-black/35 focus:outline-none" />
        </div>
      )}
      {open === "hints" && (
        <div className="max-h-[60vh] w-[min(92vw,360px)] overflow-auto bg-[#17171a] p-4 text-bone shadow-2xl">
          <p className="mono text-[11px] text-bone/50">{data.hints.length} of {data.round.hintCount} used. Each hint adds a penalty.</p>
          <div className="mt-3 space-y-3">{data.hints.map((h) => <div key={h.no} className="border-l-2 border-sand pl-3"><p className="mono text-[11px] text-sand">HINT 0{h.no}, penalty +{h.cost}</p><p className="mt-1 text-[15px] leading-snug">{h.text}</p></div>)}</div>
          {data.nextHintCost !== null && !complete && (
            <button className={`mt-4 w-full ${confirm ? "btn-light" : "btn-ghost !border-bone/40 !text-bone hover:!bg-bone hover:!text-ink"}`} onClick={async () => { if (!confirm) return setConfirm(true); setConfirm(false); await hint(); }} onBlur={() => setConfirm(false)}>
              {confirm ? `Confirm: hint costs +${data.nextHintCost}` : `Request hint 0${data.hints.length + 1}`}
            </button>
          )}
          {hintMsg && <p role="status" className="mono mt-3 text-xs font-semibold text-sand">{hintMsg}</p>}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => setOpen(open === "notes" ? "" : "notes")} className={`px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] shadow-xl transition-colors ${open === "notes" ? "bg-bone text-ink" : "bg-[#17171a] text-bone hover:bg-wine"}`}>Notes</button>
        <button onClick={() => setOpen(open === "hints" ? "" : "hints")} className={`px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] shadow-xl transition-colors ${open === "hints" ? "bg-bone text-ink" : "bg-[#17171a] text-bone hover:bg-wine"}`}>Hint {data.hints.length}/{data.round.hintCount}</button>
      </div>
    </div>
  );
}
