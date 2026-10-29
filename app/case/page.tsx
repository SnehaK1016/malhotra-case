"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Hud from "@/components/Hud";
import { go, useCaseState, RoundStatus } from "@/lib/client";
import RoomTransfer from "@/components/handoff/RoomTransfer";

const tools: Record<number, string> = { 1: "Python, decoding", 2: "SQL, pandas", 3: "pandas, charts", 4: "pandas filters, forensic logs", 5: "Forensic file, final verdict" };
const Lock = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="5" y="11" width="14" height="9" rx="1" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
const Tick = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 12.5l5 5L20 6.5" /></svg>);

export default function Dashboard() {
  const { state, setState, offset } = useCaseState();
  const [transfer, setTransfer] = useState(true); // a pending handoff opens straight away after sign-in
  const [toast, setToast] = useState("");
  const rows = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    if (!state || animated.current) return;
    animated.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(rows.current!.children, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.09, ease: "power3.out" });
    const done = state.progress.completed.filter(Boolean).length;
    gsap.fromTo(fill.current, { scaleY: 0 }, { scaleY: done / 5, duration: 1.4, ease: "power3.inOut", transformOrigin: "50% 0" });
  }, [state]);

  const poke = (el: HTMLElement, msg: string) => {
    setToast(msg);
    el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
    window.setTimeout(() => setToast(""), 3500);
  };
  const open = (e: React.MouseEvent<HTMLElement>, n: number, status: RoundStatus, title: string) => {
    if (status === "locked") return poke(e.currentTarget, state?.handoff ? "Folder sealed. Solve the navigation puzzle, travel, then sign in with the next room’s code." : "Folder sealed. It opens with the entry code given in its room.");
    go(`/case/round/${n}`, `Round 0${n}: ${title}`);
  };

  if (!state) return (<><Hud state={null} offset={0} /><p className="p-10 text-graphite">Opening case file…</p></>);
  const p = state.progress;
  const doneCount = p.completed.filter(Boolean).length;
  const railLines = state.rounds.map((r) => ({ label: r.n === 5 ? "ROUND 05 + VERDICT" : `ROUND 0${r.n}`, status: r.status }));
  const current = state.rounds.find((r) => r.status === "active");

  return (
    <>
      <Hud state={state} offset={offset} />
      <main className="mx-auto grid max-w-[1500px] gap-10 px-5 py-10 md:grid-cols-[300px_minmax(0,1fr)] md:gap-16 md:px-8 md:py-14">
        <aside className="md:sticky md:top-24 md:self-start">
          <h2 className="serif text-3xl font-light">Case status</h2>
          <p className="mt-1 text-graphite">{state.team.name}</p>
          <div className="relative mt-8 pl-8">
            <div className="absolute bottom-2 left-[7px] top-2 w-px bg-ink/20"><div ref={fill} className="h-full w-px origin-top bg-wine" /></div>
            <ul className="mono space-y-5 text-[13px]">
              {railLines.map((l) => (
                <li key={l.label} className="relative flex items-baseline justify-between gap-3">
                  <span className={`absolute -left-8 top-[5px] h-[15px] w-[15px] rounded-full border ${l.status === "complete" ? "border-wine bg-wine" : l.status === "active" ? "border-wine bg-paper ring-4 ring-wine/15" : "border-ink/30 bg-paper"}`} />
                  <span className={l.status === "locked" ? "text-ink/45" : ""}>{l.label}</span>
                  <span className={l.status === "complete" ? "text-wine" : l.status === "active" ? "font-semibold" : "text-ink/45"}>{l.status === "complete" ? "✓" : l.status.toUpperCase()}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 text-sm text-graphite"><p>{doneCount} of 5 folders verified</p><p>Wrong submissions: {p.wrong_attempts}</p></div>
        </aside>

        <section className="min-w-0">
          {state.handoff && (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border border-ink/20 bg-bone px-5 py-4">
              <p className="max-w-xl text-[15px]"><span className="font-semibold">Round 0{state.handoff.round} is verified.</span> The investigation timer is paused while you {state.handoff.solved ? "travel to your next room." : "solve the navigation puzzle."}</p>
              <button className="btn" onClick={() => setTransfer(true)}>{state.handoff.solved ? "Show your next room" : "Where next?"}</button>
            </div>
          )}
          <h1 className="serif max-w-3xl text-[clamp(2.2rem,4.5vw,4rem)] font-light leading-[1.05]">
            {p.final_complete ? "The case is closed." : state.handoff ? `Round 0${state.handoff.round} is verified.` : current ? `Round 0${current.n} is open.` : "The case file is open."}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-graphite">{state.handoff ? "Solve a quick puzzle to find your next room." : current ? current.tagline : p.final_complete ? `Your team reconstructed the evidence and solved the case. Stay in ${state.rounds[4].room ?? "your room"} to collect your treasure.` : "Five folders, five rooms."}</p>
          <p role="status" className="mt-4 min-h-[1.5rem] text-sm font-medium text-wine">{toast}</p>

          <div ref={rows} className="mt-6 border-t border-ink/20">
            {state.rounds.map((r) => (
              <button key={r.n} onClick={(e) => open(e, r.n, r.status, r.title)} aria-disabled={r.status === "locked"}
                className={`group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 border-b border-ink/20 px-2 py-7 sm:gap-x-6 text-left transition-colors md:gap-x-10 md:px-6 ${r.status === "active" ? "bg-ink text-bone" : r.status === "locked" ? "text-ink/45 hover:bg-stone/30" : "hover:bg-bone"}`}>
                <span className="mono w-10 text-sm opacity-70">0{r.n}</span>
                <span>
                  <span className="serif block text-2xl md:text-4xl">{r.title}</span>
                  <span className={`mt-1 block text-[15px] ${r.status === "active" ? "text-bone/70" : "text-graphite/80"}`}>{r.status === "locked" ? "Sealed. Opens with the entry code given in its room." : r.tagline}</span>
                  <span className="mono mt-2 block text-xs opacity-60">{tools[r.n]}{r.room ? ` · Room ${r.room}` : ""}</span>
                </span>
                <span className="flex items-center gap-3 text-[12px] font-semibold tracking-[0.14em]">
                  {r.status === "complete" ? (<><Tick /><span className="hidden text-wine md:inline">VERIFIED</span></>) : r.status === "active" ? (<span className="border border-bone/60 px-4 py-2 transition group-hover:bg-bone group-hover:text-ink">OPEN FOLDER</span>) : (<><Lock /><span className="hidden md:inline">LOCKED</span></>)}
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
      {state.handoff && transfer && <RoomTransfer state={state} onState={setState} onClose={() => setTransfer(false)} />}
    </>
  );
}
