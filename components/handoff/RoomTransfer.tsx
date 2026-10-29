"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { api, go, CaseState } from "@/lib/client";
import { reduced, useFocusTrap, useScrollLock } from "./shared";
import { Big, Pill, Ticket, Verify } from "./nav";
import CupShuffle from "./CupShuffle";
import MirrorSign from "./MirrorSign";
import RobotGrid from "./RobotGrid";
import SymbolGrid from "./SymbolGrid";

const PUZZLES = { cups: CupShuffle, mirror: MirrorSign, robot: RobotGrid, grid: SymbolGrid } as const;

/* Navigation break after Rounds 1–4. Lighter and more playful than the investigation; the timer is paused throughout. */
export default function RoomTransfer({ state, onState, onClose }: { state: CaseState; onState: (s: CaseState) => void; onClose?: () => void }) {
  const h = state.handoff!;
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const ticket = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [hintBusy, setHintBusy] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [err, setErr] = useState("");

  useScrollLock(true);
  useFocusTrap(root, true);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (!onClose) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  /* the ticket appears after the puzzle's own success animation; the dialog returns to it and announces it */
  useEffect(() => {
    if (!revealed || !ticket.current) return;
    ticket.current.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
    ticket.current.focus({ preventScroll: true });
    if (!reduced()) gsap.fromTo(ticket.current, { y: 24, opacity: 0, rotate: -1.2 }, { y: 0, opacity: 1, rotate: 0, duration: 0.7, ease: "power3.out" });
  }, [revealed]);

  const verify: Verify = async (input) => {
    setBusy(true); setErr("");
    const r = await api<{ correct: boolean; message?: string; state?: CaseState; error?: string }>("/api/clue", { round: h.round, input });
    setBusy(false);
    if (r.ok && r.data.correct && r.data.state) { onState(r.data.state); return { correct: true }; }
    if (!r.ok) setErr(r.data.error ?? "That check could not be completed. Try again.");
    return { correct: false, message: r.data.message };
  };
  const hint = async () => {
    setHintBusy(true);
    const r = await api<{ state?: CaseState }>("/api/clue", { round: h.round, action: "hint" });
    setHintBusy(false);
    if (r.ok && r.data.state) onState(r.data.state);
  };
  const seal = async () => {
    setSealing(true);
    const r = await api("/api/seal", {});
    if (!r.ok) { setSealing(false); setErr((r.data as { error?: string }).error ?? "Could not seal the round."); return; }
    go("/access", "Round sealed. Sign in at the next room.");
  };

  const Puzzle = PUZZLES[h.kind];
  return (
    <div ref={root} role="dialog" aria-modal="true" aria-labelledby="rt-title" className="nav-surface fixed inset-0 z-[70] text-[#2b2b2e]" style={{ background: "#ebe6dc" }}>
      <div ref={scroller} className="h-full overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-[1040px] px-5 pb-16 pt-6 md:px-10 md:pt-10">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[14px] text-[#2b2b2e]/65">Round 0{h.round} verified and saved</p>
              <h2 id="rt-title" ref={heading} tabIndex={-1} className="dialog-heading serif mt-1 text-[clamp(2rem,4.4vw,3.2rem)] font-light leading-tight">{h.heading}</h2>
              <p className="mt-1 text-[17px] text-[#2b2b2e]/75">{h.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Pill>Investigation timer paused</Pill>
              {onClose && <button type="button" className="text-[14px] underline underline-offset-4 hover:text-[#4a5d78]" onClick={onClose}>Back to the evidence</button>}
            </div>
          </header>

          <section className="mt-7 rounded-3xl bg-[#f7f3ea] p-5 shadow-[0_6px_18px_rgba(43,43,46,.08)] md:p-8" aria-label={h.title}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h3 className="serif text-2xl">{h.title}</h3>
              {!h.solved && (h.hint
                ? <p className="max-w-md rounded-xl bg-[#e3e8ef] px-4 py-2 text-[15px]"><span className="font-semibold">Hint.</span> {h.hint}</p>
                : <Big kind="soft" disabled={hintBusy} onClick={hint}>Show a hint (free)</Big>)}
            </div>
            <Puzzle solved={h.solved} verify={verify} busy={busy} onRevealed={() => setRevealed(true)} />
            {err && <p role="alert" className="mt-3 text-[15px] text-[#7a3e26]">{err}</p>}
          </section>

          {h.solved && revealed && h.destination && (
            <div ref={ticket} tabIndex={-1} className="mt-8 outline-none" role="status" aria-label={`${h.success} ${h.message}`}>
              <Ticket room={h.destination} success={h.success ?? ""} message={h.message ?? ""} />
              <div className="mt-6 flex flex-col items-center gap-2">
                <Big disabled={sealing} onClick={seal}>{sealing ? "Sealing" : "Seal this round and go to room sign-in"}</Big>
                <p className="max-w-md text-center text-[13px] text-[#2b2b2e]/65">This signs the team out of this laptop. Your progress is saved and the timer stays paused until the next room’s code is entered.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
