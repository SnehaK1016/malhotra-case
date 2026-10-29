"use client";
import { useDraft } from "./useDraft";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { api, clock, go, CaseState, Finale, FinaleStep } from "@/lib/client";
import { Paper, Stamp, scrollToId } from "@/components/kit";
import { Enlargeable } from "@/components/handoff/shared";
import { FieldLabel, inkField } from "./Finding";
import { ReportArt, quarter, ORIGIN, SLOTS, SLOT_LABEL, RW, RH, Slot } from "./finale/Report";
import type { useRound } from "./useRound";

const motion = () => typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* the fragments as they lie in the tray; which page quarter each one is cut from */
const FRAGS: { id: string; from: Slot }[] = [{ id: "F1", from: "tr" }, { id: "F2", from: "br" }, { id: "F3", from: "tl" }, { id: "F4", from: "bl" }];
const PAD = 14;

function Fragment({ from, uid }: { from: Slot; uid: string }) {
  const [ox, oy] = ORIGIN[from];
  return (
    <svg viewBox={`${ox - PAD} ${oy - PAD} ${RW / 2 + 2 * PAD} ${RH / 2 + 2 * PAD}`} className="block h-auto w-full" aria-hidden>
      <defs><clipPath id={uid}><polygon points={quarter(from)} /></clipPath></defs>
      <g clipPath={`url(#${uid})`} style={{ filter: "drop-shadow(0 3px 3px rgba(0,0,0,.35))" }}><ReportArt /></g>
    </svg>
  );
}

/* ---------------- sealed envelope ---------------- */
function Envelope({ open, play }: { open: boolean; play: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!play || !ref.current) return;
    if (!motion()) return;
    const ctx = gsap.context(() => {
      const t = gsap.timeline();
      t.to(".seal-l", { x: -26, rotate: -14, duration: 0.35, ease: "power2.out", transformOrigin: "100% 50%" })
        .to(".seal-r", { x: 26, rotate: 14, duration: 0.35, ease: "power2.out", transformOrigin: "0% 50%" }, "<")
        .to(".flap", { scaleY: -1, duration: 0.5, ease: "power2.inOut", transformOrigin: "50% 0%" }, "-=0.05")
        .fromTo(".doc", { y: 0 }, { y: -110, duration: 0.55, ease: "power3.out" }, "-=0.1");
    }, ref);
    return () => ctx.revert();
  }, [play]);
  const o = open && !play;
  return (
    <svg ref={ref} viewBox="0 0 520 400" className="envelope block h-auto w-full max-w-[560px]" role="img" aria-label={open ? "The evidence envelope, opened, with a laboratory document inside." : "A sealed evidence envelope tagged K-01, lab return, with a tamper seal across it."}>
      <rect x="40" y="250" width="420" height="120" rx="4" fill="#2a3f63" transform="rotate(-4 250 310)" />
      <rect x="52" y="262" width="150" height="16" rx="2" fill="#20324f" transform="rotate(-4 250 310)" />
      <g className="doc" style={{ transform: o ? "translateY(-110px)" : undefined }}>
        <rect x="120" y="120" width="280" height="200" fill="#f3efe4" />
        {[150, 172, 194, 216].map((y) => <line key={y} x1="140" x2={380 - (y % 3) * 20} y1={y} y2={y} stroke="#2b2b2e" strokeOpacity=".3" strokeWidth="3" />)}
      </g>
      <rect x="90" y="140" width="340" height="220" fill="#ebe5d6" stroke="#cdc4b0" />
      <path d="M90 360 L260 250 L430 360" fill="none" stroke="#cdc4b0" strokeWidth="2" />
      <path className="flap" d="M90 140 L260 255 L430 140 Z" fill="#e4dccb" stroke="#cdc4b0" style={{ transform: o ? "scaleY(-1)" : undefined, transformOrigin: "50% 140px", transformBox: "view-box" }} />
      <g style={{ opacity: o ? 0 : 1 }}>
        <rect className="seal-l" x="240" y="140" width="20" height="220" fill="#6e1f2b" opacity=".92" />
        <rect className="seal-r" x="260" y="140" width="20" height="220" fill="#6e1f2b" opacity=".92" />
      </g>
      <g transform="translate(330 300) rotate(-6)"><rect width="104" height="40" rx="3" fill="#f6f2ea" stroke="#2b2b2e" strokeOpacity=".35" /><circle cx="10" cy="20" r="4" fill="none" stroke="#2b2b2e" strokeOpacity=".5" /><text x="20" y="18" fontSize="11" fontFamily="var(--font-mono), monospace" fill="#2b2b2e">K-01 /</text><text x="20" y="32" fontSize="11" fontFamily="var(--font-mono), monospace" fill="#2b2b2e">LAB RETURN</text></g>
      <path d="M118 128 v26 a8 8 0 0 0 16 0 v-30 a5 5 0 0 0 -10 0 v24" fill="none" stroke="#9aa3ab" strokeWidth="2.5" />
    </svg>
  );
}

/* ---------------- verified evidence journal ---------------- */
function Journal({ f }: { f: Finale }) {
  const body = (
    <div className="space-y-4">
      {f.journal.length === 0 && <p className="text-[14px] text-bone/55">Findings appear here as you verify them.</p>}
      {f.journal.map((g) => (
        <div key={g.group}><p className="mono text-[11px] tracking-[0.16em] text-sand">{g.group.toUpperCase()}</p><ul className="mt-1.5 space-y-1 text-[14px] leading-snug text-bone/85">{g.items.map((i) => <li key={i} className="journal-item">{i}</li>)}</ul></div>
      ))}
    </div>
  );
  return (
    <>
      <aside className="hidden border border-bone/15 bg-[#17181b] p-5 lg:sticky lg:top-24 lg:block lg:self-start" aria-label="Verified evidence"><p className="serif mb-4 text-xl">Verified evidence</p>{body}</aside>
      <details className="border border-bone/15 bg-[#17181b] p-4 lg:hidden"><summary className="serif cursor-pointer text-lg">Verified evidence ({f.journal.reduce((n, g) => n + g.items.length, 0)})</summary><div className="mt-4">{body}</div></details>
    </>
  );
}

const Tip = ({ children }: { children: React.ReactNode }) => (
  <details className="mt-4 text-[14px] text-bone/70"><summary className="cursor-pointer underline underline-offset-4">Need a method tip? (free)</summary><p className="mt-2 max-w-prose">{children}</p></details>
);
const Msg = ({ text, ok }: { text: string; ok?: boolean }) => text ? <p role={ok ? "status" : "alert"} className={`mt-4 border-l-2 px-3 py-2 text-[15px] ${ok ? "border-sand bg-sand/10 text-bone" : "border-wine bg-wine/15 text-bone"}`}>{text}</p> : null;
const Section = ({ id, title, children, intro }: { id: string; title: string; intro?: string; children: React.ReactNode }) => (
  <section id={id} className="border-t border-bone/15 pt-10"><h2 className="serif text-[clamp(1.8rem,3.4vw,2.8rem)] font-light leading-tight">{title}</h2>{intro && <p className="mt-3 max-w-2xl text-[16px] text-bone/75">{intro}</p>}<div className="mt-6">{children}</div></section>
);

/* ---------------- 1. restore the report ---------------- */
function Restore({ f, act, busy }: { f: Finale; act: Act; busy: boolean }) {
  const done = f.steps.restore;
  const [place, setPlace] = useDraft<Partial<Record<Slot, string>>>(5, "arrangement", f.drafts?.arrangement ?? {});
  const [sel, setSel] = useState<string>("");
  const [msg, setMsg] = useState("");
  /* pointer-based dragging: works for mouse, pen and touch (native HTML5 drag-and-drop does not work on touch screens) */
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const start = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const skipClick = useRef(false);
  const down = (id: string) => (e: React.PointerEvent) => { start.current = { id, x: e.clientX, y: e.clientY, moved: false }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const moveP = (e: React.PointerEvent) => {
    const st = start.current; if (!st) return;
    if (!st.moved && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 6) st.moved = true;
    if (st.moved) setDrag({ id: st.id, x: e.clientX, y: e.clientY });
  };
  const up = (e: React.PointerEvent) => {
    const st = start.current; start.current = null;
    if (!st?.moved) return;
    skipClick.current = true; setDrag(null);
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-slot]") as HTMLElement | null;
    if (el) put(el.dataset.slot as Slot, st.id);
  };
  const where = (id: string) => SLOTS.find((s) => place[s] === id);
  const put = (slot: Slot, id: string) => {
    setMsg("");
    setPlace((p) => { const n = { ...p }; for (const s of SLOTS) if (n[s] === id) delete n[s]; n[slot] = id; return n; });
    setSel("");
  };
  const clickSlot = (slot: Slot) => { if (sel) put(slot, sel); else if (place[slot]) setSel(place[slot]!); };
  const check = async () => {
    const r = await act("restore", { arrangement: place });
    setMsg(r.ok ? "" : r.message ?? "");
  };
  const board = (big?: boolean) => (
    <div className={`relative mx-auto w-full ${big ? "max-w-[620px]" : "max-w-[520px]"}`} style={{ background: "#d6d1c6", padding: 10 }}>
      <svg viewBox={`0 0 ${RW} ${RH}`} className="block h-auto w-full" aria-hidden>
        <rect width={RW} height={RH} fill="#cfc9bd" />
        {!done && SLOTS.map((s) => <rect key={s} x={ORIGIN[s][0] + 6} y={ORIGIN[s][1] + 6} width={RW / 2 - 12} height={RH / 2 - 12} fill="none" stroke="#8d877b" strokeDasharray="8 6" />)}
        {done ? <g className="restored-page"><ReportArt /></g> : SLOTS.map((s) => {
          const id = place[s]; if (!id) return null;
          const from = FRAGS.find((x) => x.id === id)!.from;
          const [dx, dy] = [ORIGIN[s][0] - ORIGIN[from][0], ORIGIN[s][1] - ORIGIN[from][1]];
          return <g key={s} transform={`translate(${dx} ${dy})`} style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,.35))" }}><clipPath id={`bp-${s}-${big ? "b" : "s"}`}><polygon points={quarter(from)} /></clipPath><g clipPath={`url(#bp-${s}-${big ? "b" : "s"})`}><ReportArt /></g></g>;
        })}
        {done && <g transform="translate(70 700) rotate(-6)"><rect x="-8" y="-24" width="168" height="34" fill="none" stroke="#6e1f2b" strokeWidth="3" opacity=".8" /><text x="76" y="0" textAnchor="middle" fontSize="20" fontWeight="700" letterSpacing="4" fill="#6e1f2b" opacity=".85" fontFamily="var(--font-mono), monospace">RESTORED</text></g>}
      </svg>
      {!done && (
        <div className="absolute inset-[10px] grid grid-cols-2 grid-rows-2">
          {SLOTS.map((s) => (
            <button key={s} type="button" aria-label={`${SLOT_LABEL[s]} position${place[s] ? `, holds fragment ${place[s]!.slice(1)}` : ", empty"}${sel ? `. Place fragment ${sel.slice(1)} here` : ""}`}
              data-slot={s} onClick={() => clickSlot(s)}
              className={`m-1 border-2 transition-colors ${sel ? "border-sand/80 hover:bg-sand/10" : place[s] === sel && sel ? "border-sand" : "border-transparent hover:border-bone/30"}`} />
          ))}
        </div>
      )}
    </div>
  );
  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Enlargeable label="report restoration board" render={() => board(true)}>{board()}</Enlargeable>
          {!done && (
            <div className="mt-5">
              <p className="mb-2 text-[14px] text-bone/65">Fragment tray. Select a fragment, then a position on the board. You can also drag a fragment onto the board. Select a placed piece on the board to move it again.</p>
              <div className="grid grid-cols-4 gap-3 bg-[#1d1e21] p-3" role="listbox" aria-label="Fragment tray">
                {FRAGS.map((x) => {
                  const at = where(x.id);
                  return (
                    <button key={x.id} type="button" role="option" aria-selected={sel === x.id} onPointerDown={down(x.id)} onPointerMove={moveP} onPointerUp={up} onPointerCancel={() => { start.current = null; setDrag(null); }}
                      onClick={() => { if (skipClick.current) { skipClick.current = false; return; } setSel(sel === x.id ? "" : x.id); }} style={{ touchAction: "none" }}
                      aria-label={`Fragment ${x.id.slice(1)}${at ? `, placed ${SLOT_LABEL[at]}` : ", in the tray"}`}
                      className={`relative min-w-0 p-1 transition-transform hover:-translate-y-0.5 ${sel === x.id ? "outline outline-2 outline-sand" : ""} ${at ? "opacity-40" : ""}`}>
                      <Fragment from={x.from} uid={`tray-${x.id}`} />
                      <span className="mono absolute left-1.5 top-1 bg-ink/80 px-1 text-[11px] text-bone">{x.id.slice(1)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[16px] text-bone/80">Match its edges, ruled lines and seal to restore the page.</p>
          {!done ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="btn-light" disabled={busy || SLOTS.some((s) => !place[s])} onClick={check}>Check report</button>
              <button className="btn-ghost !border-bone/40 !text-bone hover:!bg-bone hover:!text-ink" onClick={() => { setPlace({}); setSel(""); setMsg(""); }}>Reset arrangement</button>
            </div>
          ) : <Msg ok text={f.messages.restoreOk ?? ""} />}
          <Msg text={msg} />
          {drag && <div aria-hidden className="pointer-events-none fixed z-[60] w-28 -translate-x-1/2 -translate-y-1/2 opacity-90" style={{ left: drag.x, top: drag.y }}><Fragment from={FRAGS.find((x) => x.id === drag.id)!.from} uid="drag-ghost" /></div>}
          {!done && <Tip>Start with the corners: each corner fragment carries one burgundy corner mark of the border. Then check that the ruled lines and the circular seal continue across every torn edge.</Tip>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- 2. the concealed entry ---------------- */
function Inspect({ f, act, busy }: { f: Finale; act: Act; busy: boolean }) {
  const done = f.steps.inspect;
  const [light, setLight] = useState(false);
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const asked = useRef(false);
  const over = !!spot && spot.x > 250 && spot.x < 556 && spot.y > 590 && spot.y < 694;
  useEffect(() => { if (over && !done && !asked.current) { asked.current = true; act("inspect"); } }, [over, done]); // eslint-disable-line
  const move = (e: React.PointerEvent) => {
    if (!light || !svg.current) return;
    const b = svg.current.getBoundingClientRect();
    setSpot({ x: ((e.clientX - b.left) / b.width) * RW, y: ((e.clientY - b.top) / b.height) * RH });
  };
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className={`mx-auto max-w-[560px] bg-[#d6d1c6] p-2.5 ${light ? "cursor-none" : ""}`}>
          <svg ref={svg} viewBox={`0 0 ${RW} ${RH}`} className="block h-auto w-full touch-none" onPointerMove={move} onPointerDown={move} onPointerLeave={() => setSpot(null)} role="img"
            aria-label={done ? `Report K-01. Sample K-01B classification: ABO group ${f.classification?.abo}, Rh(D) ${f.classification?.rh}.` : "Report K-01. The K-01B classification is covered by a damaged archival label."}>
            <defs><radialGradient id="lamp"><stop offset="0" stopColor="#fff6dc" stopOpacity=".55" /><stop offset=".7" stopColor="#fff6dc" stopOpacity=".18" /><stop offset="1" stopColor="#fff6dc" stopOpacity="0" /></radialGradient></defs>
            <ReportArt classification={f.classification} labelLifted={done} labelFaded={over && !done} annotate={!done} />
            {light && <rect width={RW} height={RH} fill="#1b1a17" opacity=".28" pointerEvents="none" />}
            {light && spot && <circle cx={spot.x} cy={spot.y} r="70" fill="url(#lamp)" pointerEvents="none" />}
          </svg>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[16px] text-bone/80">One entry on the report is hidden under a damaged archival label.</p>
        {!done ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn-light" aria-pressed={light} onClick={() => setLight(!light)}>{light ? "Switch off the examination light" : "Examination light"}</button>
            <button className="btn-ghost !border-bone/40 !text-bone hover:!bg-bone hover:!text-ink" disabled={busy} onClick={() => act("inspect")}>Inspect sample label</button>
          </div>
        ) : <Msg ok text={`Handle trace: ${f.classification?.short}. Recorded in your evidence journal.`} />}
        {light && !done && <p className="mt-3 text-[14px] text-bone/60">Move the light across the page. The label becomes readable when the light is over it.</p>}
        <p className="mt-6 text-[13px] text-bone/50">The light is a game interaction. Light does not determine a blood group; the laboratory report does.</p>
        <EvidenceBag />
      </div>
    </div>
  );
}
function EvidenceBag() {
  return (
    <figure className="mt-6 max-w-[240px]">
      <svg viewBox="0 0 220 150" className="block h-auto w-full" role="img" aria-label="Evidence bag K-01 containing the recovered knife.">
        <rect x="10" y="10" width="200" height="130" rx="6" fill="#e9eef3" fillOpacity=".14" stroke="#ece8e1" strokeOpacity=".5" />
        <rect x="10" y="10" width="200" height="16" fill="#6e1f2b" fillOpacity=".7" />
        <path d="M40 92 L150 70 L176 66 L150 80 Z" fill="#c9cdd2" />
        <rect x="18" y="88" width="30" height="14" rx="3" transform="rotate(-11 33 95)" fill="#3a3330" />
        <circle cx="120" cy="77" r="2" fill="#5a2a22" opacity=".7" /><circle cx="128" cy="75" r="1.4" fill="#5a2a22" opacity=".6" />
        <rect x="140" y="104" width="58" height="26" fill="#f6f2ea" /><text x="148" y="121" fontSize="12" fontFamily="var(--font-mono), monospace" fill="#2b2b2e">K-01</text>
      </svg>
      <figcaption className="mono mt-1 text-[11px] text-bone/50">Item K-01, sealed evidence bag</figcaption>
    </figure>
  );
}

/* ---------------- 3. reference profiles ---------------- */
function Portrait({ name }: { name: string }) {
  const initials = name.replace(/\./g, "").split(" ").map((w) => w[0]).join("");
  return (
    <svg viewBox="0 0 80 96" className="h-full w-full" aria-hidden><rect width="80" height="96" fill="#aeb7bd" /><circle cx="40" cy="36" r="15" fill="#6b777f" /><path d="M8 96c2-26 16-36 32-36s30 10 32 36z" fill="#6b777f" /><text x="40" y="88" textAnchor="middle" fontSize="11" fontFamily="monospace" fill="#e9ecef">{initials}</text></svg>
  );
}
function Profiles({ f, act, busy }: { f: Finale; act: Act; busy: boolean }) {
  const done = f.steps.reference;
  const [pick, setPick] = useState(done ? f.reference?.ref ?? "" : "");
  const [msg, setMsg] = useState("");
  const compare = async () => { setMsg(""); const r = await act("reference", { ref: pick }); if (!r.ok) setMsg(r.message ?? ""); };
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="Reference profiles">
        {f.profiles.map((p) => (
          <button key={p.ref} type="button" role="radio" aria-checked={pick === p.ref} disabled={done} onClick={() => { setPick(p.ref); setMsg(""); }}
            className={`flex min-w-0 flex-col bg-[#eceae3] p-4 text-left text-[#1d2225] transition-shadow ${pick === p.ref ? "outline outline-[3px] outline-offset-2 outline-[#7f95b5]" : "hover:outline hover:outline-1 hover:outline-bone/40"}`}>
            <div className="flex gap-3">
              <div className="h-24 w-20 shrink-0 overflow-hidden"><Portrait name={p.name} /></div>
              <div className="min-w-0"><p className="serif text-lg leading-tight">{p.name}</p><p className="mt-1 text-[12px] text-black/65">{p.role}</p></div>
            </div>
            <dl className="mono mt-4 grid grid-cols-2 gap-2 text-[13px]">
              <div><dt className="text-[11px] text-black/50">Blood group</dt><dd className="text-xl font-bold">{p.blood}</dd></div>
              <div><dt className="text-[11px] text-black/50">Reference</dt><dd className="text-xl font-bold">{p.ref}</dd></div>
            </dl>
            <p className="mt-3 min-h-[1.25rem] text-[12px] font-semibold text-[#4a5d78]">{pick === p.ref ? "Selected for comparison" : ""}</p>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-bone/50">Blood groups and reference samples are fictional game evidence.</p>
      {!done && <div className="mt-5"><button className="btn-light" disabled={!pick || busy} onClick={compare}>Compare reference sample</button></div>}
      <Msg text={msg} />
      {done && <Msg ok text={f.messages.referenceOk ?? ""} />}
      {!done && <Tip>Look at the classification recorded in your journal, then find the one profile with exactly the same group and sign.</Tip>}
    </div>
  );
}

/* ---------------- 4. comparison and statement ---------------- */
function Comparison({ f, act, busy }: { f: Finale; act: Act; busy: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const c = f.comparison;
  useEffect(() => { if (c && ref.current && motion()) gsap.fromTo(ref.current, { scaleY: 0.08, opacity: 0.4 }, { scaleY: 1, opacity: 1, duration: 0.7, ease: "power3.out", transformOrigin: "50% 0%" }); }, [!!c]); // eslint-disable-line
  return (
    <div className="space-y-8">
      {!c ? (
        <div className="max-w-md bg-[#2a3f63] p-5 shadow-xl">
          <Paper tone="white" className="w-full"><div className="p-5 text-black"><p className="mono text-[13px] font-bold">K-01B / Individual comparison</p><p className="mt-1 text-[13px] text-black/60">Open after reference selection</p></div></Paper>
          <button className="btn-light mt-5" disabled={busy} onClick={() => act("comparison")}>Open comparison return</button>
        </div>
      ) : (
        <div ref={ref}>
          <Paper tone="white" tape="tl" className="w-full max-w-3xl"><div className="p-6 text-black md:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-black/70 pb-2"><p className="serif text-xl font-semibold">Laboratory addendum: individual comparison</p><p className="mono text-[11px] text-black/55">FICTIONAL GAME EVIDENCE</p></div>
            <p className="mono mt-4 text-[11px] text-black/55">Schematic comparison: an illustration of matching fictional markers, not a real DNA chart.</p>
            <div className="mt-2 overflow-x-auto">
              <svg viewBox="0 0 520 210" className="block h-auto w-full min-w-[420px]" aria-hidden>
                <text x="20" y="18" fontSize="12" fontFamily="var(--font-mono), monospace">EVIDENCE {c.evidence}</text>
                <text x="500" y="18" fontSize="12" textAnchor="end" fontFamily="var(--font-mono), monospace">REFERENCE {c.reference}</text>
                {c.markers.map(([m, a, b], i) => (
                  <g key={m}>
                    <rect x="20" y={34 + i * 34} width="150" height="24" fill="#e4e8ef" /><text x="30" y={51 + i * 34} fontSize="12" fontFamily="var(--font-mono), monospace">{m}: {a}</text>
                    <rect x="350" y={34 + i * 34} width="150" height="24" fill="#e4e8ef" /><text x="360" y={51 + i * 34} fontSize="12" fontFamily="var(--font-mono), monospace">{m}: {b}</text>
                    <line className="cmp-line" x1="170" y1={46 + i * 34} x2="350" y2={46 + i * 34} stroke="#6e1f2b" strokeWidth="1.4" strokeDasharray="4 4" />
                  </g>
                ))}
              </svg>
            </div>
            <dl className="mono mt-5 grid gap-x-8 gap-y-2 text-[14px] sm:grid-cols-2">
              <div><dt className="text-[11px] text-black/50">Evidence sample</dt><dd className="font-semibold">{c.evidence}</dd></div>
              <div><dt className="text-[11px] text-black/50">Reference sample</dt><dd className="font-semibold">{c.reference}</dd></div>
              <div><dt className="text-[11px] text-black/50">Reference person</dt><dd className="font-semibold">{c.person}</dd></div>
              <div><dt className="text-[11px] text-black/50">DNA comparison</dt><dd className="font-semibold text-wine">{c.result}</dd></div>
            </dl>
            <p className="mt-5 border-t border-black/15 pt-3 text-[14px] text-black/75">{c.note}</p>
          </div></Paper>
        </div>
      )}
      {c && !f.statement && <button className="btn-light" disabled={busy} onClick={() => act("statement")}>Read the supporting statement</button>}
      {f.statement && (
        <Paper tone="kraft" tape="tr" className="w-full max-w-3xl"><div className="p-6 text-black md:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-black/70 pb-2"><p className="serif text-xl font-semibold">{f.statement.title}</p><p className="mono text-[11px] text-black/60">Ref. {f.statement.ref}</p></div>
          <div className="mt-4 space-y-3 text-[15px] leading-relaxed">{f.statement.body.map((p, i) => <p key={i}>{p}</p>)}</div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div><p className="font-hand text-3xl text-[#1f3a6b]">{f.statement.signed}</p><p className="border-t border-black/50 pt-1 text-[12px] text-black/60">Signature</p></div>
            <Stamp rot={-6}>Verified</Stamp>
          </div>
          <p className="mono mt-4 inline-block bg-black/10 px-2 py-0.5 text-[11px]">FICTIONAL GAME EVIDENCE</p>
        </div></Paper>
      )}
    </div>
  );
}

/* ---------------- 5. final statement ---------------- */
const PEOPLE = [["RANVEER", "Ranveer"], ["MEERA", "Meera"], ["KABIR", "Kabir"], ["NAINA", "Naina"]];
const EVIDENCE = [["comparison", "Individual forensic comparison supported by the verified statement"], ["blood", "Blood group alone"], ["largest", "Largest payment total alone"], ["ownership", "Company ownership alone"]];
const ROLE = [["financial", "Financial fraud, not the murder"], ["murder", "Participation in the murder"]];
function Statement({ f, act, busy }: { f: Finale; act: Act; busy: boolean }) {
  const done = f.steps.verdict;
  const [a, setA] = useDraft<{ murderer: string; fraud: string; ranveer: string; meera: string; total: string; evidence: string; meera_role: string }>(5, "finding", f.drafts?.finding ?? { murderer: "", fraud: "", ranveer: "", meera: "", total: "", evidence: "", meera_role: "" });
  const [msg, setMsg] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const ready = Object.values(a).every((v) => v.trim());
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!ready || busy) return; setMsg("");
    const r = await act("verdict", a);
    if (!r.ok) { setMsg(r.message ?? ""); const el = form.current; if (el) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); } }
  };
  const fmt = (v: string) => { const n = Number(v.replace(/\D/g, "")); return n ? `₹${n.toLocaleString("en-IN")}` : ""; };
  const Radios = ({ k, opts, label }: { k: keyof typeof a; opts: string[][]; label: string }) => (
    <fieldset><legend className="mono mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/60">{label}</legend>
      <div className="grid gap-2">{opts.map(([v, t]) => <button key={v} type="button" role="radio" aria-checked={a[k] === v} disabled={done} onClick={() => setA({ ...a, [k]: v })} className={`border-2 px-3 py-2 text-left text-[14px] transition-colors ${a[k] === v ? "border-wine bg-wine text-bone" : "border-black/25 hover:border-black"}`}>{t}</button>)}</div>
    </fieldset>
  );
  if (done) return <div className="max-w-xl"><Paper rot={-0.4} tape="top" className="w-full"><div className="p-8 text-black"><Stamp rot={-5} className="!text-base">Statement verified</Stamp><p className="serif mt-4 text-2xl">The case statement is filed.</p><p className="mt-2 text-[15px] text-black/70">Ranveer committed the murder. Meera took part in the financial fraud, not the murder.</p></div></Paper></div>;
  return (
    <form ref={form} onSubmit={submit} noValidate className="max-w-2xl">
      <Paper rot={0.3} tape="tr" className="w-full"><div className="space-y-5 p-6 text-ink md:p-9">
        <h3 className="serif text-3xl">Final case statement</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><FieldLabel htmlFor="v1">Who committed the murder?</FieldLabel><select id="v1" className={`${inkField} text-[24px]`} value={a.murderer} onChange={(e) => setA({ ...a, murderer: e.target.value })}><option value="">choose</option>{PEOPLE.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
          <div><FieldLabel htmlFor="v2">Who assisted in the financial fraud?</FieldLabel><select id="v2" className={`${inkField} text-[24px]`} value={a.fraud} onChange={(e) => setA({ ...a, fraud: e.target.value })}><option value="">choose</option>{PEOPLE.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
        </div>
        {([["ranveer", "Amount received by Ranveer’s company (₹)"], ["meera", "Amount received by Meera’s company (₹)"], ["total", "Total money traced (₹)"]] as const).map(([k, l]) => (
          <div key={k}><FieldLabel htmlFor={`v-${k}`}>{l}</FieldLabel><input id={`v-${k}`} inputMode="numeric" autoComplete="off" className={inkField} value={a[k]} onChange={(e) => setA({ ...a, [k]: e.target.value.replace(/[^\d,]/g, "") })} placeholder="full rupee amount" /><p className="mono mt-1 h-4 text-xs text-black/50">{fmt(a[k])}</p></div>
        ))}
        <Radios k="evidence" opts={EVIDENCE} label="Which evidence supports the murder conclusion?" />
        <Radios k="meera_role" opts={ROLE} label="Meera’s involvement" />
        <button className="btn w-full" disabled={!ready || busy}>{busy ? "Checking the file" : "Verify investigation statement"}</button>
        {msg && <p role="alert" className="border-l-2 border-wine bg-wine/5 px-3 py-3 text-sm">{msg}</p>}
      </div></Paper>
    </form>
  );
}

/* ---------------- 6. the treasure lock ---------------- */
function Lock({ f, act, busy }: { f: Finale; act: Act; busy: boolean }) {
  const [d, setD] = useState(["", "", ""]);
  const [msg, setMsg] = useState("");
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const open = f.steps.unlock;
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || !box.current || !motion()) return;
    const ctx = gsap.context(() => {
      gsap.timeline().to(".shackle", { y: -16, duration: 0.5, ease: "power2.out" }).to(".lid", { rotateX: -70, duration: 0.8, ease: "power2.inOut", transformOrigin: "50% 0%" }).fromTo(".glow", { opacity: 0 }, { opacity: 1, duration: 0.9 }, "<0.2").fromTo(".closed-stamp", { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" });
    }, box);
    return () => ctx.revert();
  }, [open]);
  const set = (i: number, v: string) => {
    const ch = v.replace(/\D/g, "").slice(-1);
    const n = d.map((x, k) => (k === i ? ch : x)); setD(n); setMsg("");
    if (ch && i < 2) refs[i + 1].current?.focus();
  };
  const unlock = async () => { const r = await act("unlock", { code: d.join("") }); if (!r.ok) setMsg(r.message ?? ""); };
  const key = f.lockKey!;
  return (
    <div ref={box} className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="relative mx-auto max-w-[360px]" style={{ perspective: 800 }}>
          <svg viewBox="0 0 360 260" className="block h-auto w-full" aria-hidden>
            <rect x="30" y="90" width="300" height="150" rx="6" fill="#3a2d22" />
            <rect className="glow" x="44" y="104" width="272" height="122" fill="#d9b25f" opacity={open ? 1 : 0} style={{ filter: "blur(10px)" }} />
            <g className="lid" style={{ transformBox: "view-box", transform: open && !motion() ? "rotateX(-70deg)" : undefined }}><rect x="26" y="78" width="308" height="40" rx="6" fill="#4c3b2c" /></g>
            <g className="shackle" style={{ transform: open && !motion() ? "translateY(-16px)" : undefined }}><path d="M160 92 v-28 a20 20 0 0 1 40 0 v28" fill="none" stroke="#9aa3ab" strokeWidth="9" /></g>
            <rect x="148" y="88" width="64" height="54" rx="6" fill="#7d858c" />
            {open && <g className="closed-stamp" style={{ transformBox: "fill-box", transformOrigin: "center" }}><rect x="88" y="180" width="184" height="38" fill="none" stroke="#6e1f2b" strokeWidth="3" /><text x="180" y="206" textAnchor="middle" fontSize="20" fontWeight="700" letterSpacing="4" fill="#6e1f2b" fontFamily="var(--font-mono), monospace">CASE CLOSED</text></g>}
          </svg>
        </div>
        {!open && (
          <div className="mt-6">
            <div className="flex justify-center gap-3" role="group" aria-label="Three-digit lock code">
              {d.map((x, i) => (
                <input key={i} ref={refs[i]} aria-label={`Digit ${i + 1}`} inputMode="numeric" autoComplete="off" maxLength={2} value={x} onChange={(e) => set(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Backspace" && !d[i] && i > 0) refs[i - 1].current?.focus(); if (e.key === "Enter" && d.every(Boolean)) unlock(); }}
                  className="mono h-20 w-16 border-2 border-bone/40 bg-[#17181b] text-center text-4xl text-bone outline-none focus:border-sand" />
              ))}
            </div>
            <div className="mt-5 flex justify-center"><button className="btn-light" disabled={busy || !d.every(Boolean)} onClick={unlock}>Unlock treasure</button></div>
            <Msg text={msg} />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <Paper tone="white" tape="top" className="w-full max-w-sm"><div className="p-6 text-black">
          <p className="mono text-[12px] font-bold tracking-[0.14em]">ARCHIVE KEY</p>
          <p className="mono mt-4 text-[11px] text-black/55">GROUP</p>
          <table className="mono mt-1 w-full text-[16px]"><tbody>{key.group.map(([g, n]) => <tr key={g} className="border-b border-black/10"><td className="py-1">{g}</td><td className="py-1 text-right">{n}</td></tr>)}</tbody></table>
          <p className="mono mt-4 text-[11px] text-black/55">SIGN</p>
          <table className="mono mt-1 w-full text-[16px]"><tbody>{key.sign.map(([g, n]) => <tr key={g} className="border-b border-black/10"><td className="py-1">{g}</td><td className="py-1 text-right">{n}</td></tr>)}</tbody></table>
          <p className="mt-4 text-[14px]">Combine the group number with the sign digit.</p>
          <p className="mono mt-3 text-[11px] text-black/55">Fictional archive coding key.</p>
        </div></Paper>
        {!open && <Tip>Use the confirmed suspect’s blood group from your journal. Write the group as its two-digit number, then add the sign digit.</Tip>}
      </div>
    </div>
  );
}

function Closed({ f, onLeave }: { f: Finale; onLeave: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const fin = f.final!;
  useEffect(() => {
    if (!motion() || !ref.current) return;
    const ctx = gsap.context(() => { gsap.timeline({ defaults: { ease: "power3.out" } }).fromTo(".c-in", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.18, delay: 0.3 }); }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={ref} aria-labelledby="closed-title" className="dark-surface relative overflow-hidden bg-ink text-bone">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/office.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" style={{ filter: "saturate(.4) brightness(.55)", objectPosition: "45% 50%" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/85" />
      <div className="relative mx-auto max-w-5xl px-6 py-20 md:px-12">
        <h2 id="closed-title" className="c-in serif text-[clamp(3.2rem,10vw,8rem)] font-light uppercase leading-none tracking-[0.03em]">Case closed</h2>
        <div className="c-in my-8 h-px bg-sand" />
        <div className="c-in serif max-w-2xl space-y-1 text-2xl font-light leading-snug md:text-3xl">{fin.lines.map((l) => <p key={l}>{l}</p>)}</div>
        <dl className="c-in mt-12 grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-3">
          <div><dt className="text-sm text-bone/60">Team</dt><dd className="mono mt-1 text-2xl">{fin.team}</dd></div>
          <div><dt className="text-sm text-bone/60">Final active time</dt><dd className="mono mt-1 text-2xl">{clock(fin.activeMs)}</dd></div>
          <div><dt className="text-sm text-bone/60">Score</dt><dd className="mono mt-1 text-2xl">{fin.score ?? "-"}</dd></div>
        </dl>
        <p className="c-in mt-10 max-w-xl border-l-2 border-sand pl-4 text-lg font-medium">{fin.message}</p>
        <div className="c-in mt-10"><button className="btn-light" onClick={onLeave}>Return to case file</button></div>
      </div>
    </section>
  );
}

type Act = (action: FinaleStep, input?: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>;

export default function Round5({ r }: { r: ReturnType<typeof useRound> }) {
  const [f, setF] = useState<Finale>(r.data!.finale!);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const act: Act = async (action, input) => {
    setBusy(true);
    const res = await api<{ ok: boolean; message?: string; finale?: Finale; state?: CaseState; error?: string }>("/api/finale", { action, input });
    setBusy(false);
    if (res.ok && res.data.finale) { setF(res.data.finale); if (res.data.state) r.setState(res.data.state); }
    if (!res.ok) return { ok: false, message: res.data.error ?? "That could not be checked. Try again." };
    return { ok: res.data.ok, message: res.data.message };
  };
  /* bring each newly unlocked section into view */
  const last = useRef(f.steps);
  useEffect(() => {
    const order: [FinaleStep, string][] = [["restore", "r5-sample"], ["inspect", "r5-profiles"], ["reference", "r5-compare"], ["statement", "r5-statement"], ["verdict", "r5-lock"], ["unlock", "r5-closed"]];
    for (const [k, id] of order) if (f.steps[k] && !last.current[k]) { window.setTimeout(() => scrollToId(id), motion() ? 900 : 50); break; }
    last.current = f.steps;
  }, [f.steps]);
  const breakSeal = async () => {
    if (f.steps.open) return scrollToId("r5-work");
    setOpening(true);
    const res = await act("open");
    if (res.ok) window.setTimeout(() => scrollToId("r5-work"), motion() ? 1300 : 50);
  };
  const s = f.steps;
  return (
    <div>
      <section className="scene-dark relative flex min-h-[calc(100svh-64px)] items-center overflow-hidden px-6 py-16 md:px-14" style={{ background: "radial-gradient(ellipse at 70% 40%, #2a2622 0%, #151417 60%)" }}>
        <div className="env-hero mx-auto grid w-full max-w-[1280px] items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="min-w-0">
            <h1 className="serif text-[clamp(2.6rem,5.4vw,4.6rem)] font-light leading-[1.02]">The last sealed file.</h1>
            <p className="serif mt-5 text-[clamp(1.3rem,2.2vw,1.8rem)] font-light leading-snug text-bone/85">The money trail is clear. The murder is not.<br />One laboratory return remains unopened.</p>
            <button className="btn-light mt-8" disabled={busy} onClick={breakSeal}>{s.open ? "Continue to the evidence" : "Break the seal"}</button>
          </div>
          <div className="envelope-wrap mx-auto w-full max-w-[560px] min-w-0"><Envelope open={s.open} play={opening && s.open} /></div>
        </div>
      </section>

      {s.open && (
        <div id="r5-work" className="scene-dark px-5 pb-24 pt-14 md:px-10">
          <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-16">
              <Section id="r5-restore" title="A report recovered in pieces." intro="The laboratory report was damaged in transit. Match its edges, ruled lines and seal to restore the page."><Restore f={f} act={act} busy={busy} /></Section>
              {s.restore && <Section id="r5-sample" title="Two samples. Different questions."><Inspect f={f} act={act} busy={busy} /></Section>}
              {s.inspect && <Section id="r5-profiles" title="Whose reference should be compared?" intro="The handle trace has a recovered classification. Compare it with the fictional reference profiles and select the compatible person for further examination."><Profiles f={f} act={act} busy={busy} /></Section>}
              {s.reference && <Section id="r5-compare" title="The comparison return."><Comparison f={f} act={act} busy={busy} /></Section>}
              {s.statement && <Section id="r5-statement" title="Put the evidence into words." intro="Your conclusion must distinguish the financial fraud from the murder. Use the verified documents to complete the final case statement."><Statement f={f} act={act} busy={busy} /></Section>}
              {s.verdict && <Section id="r5-lock" title="One last lock." intro="The case statement is complete. The archive key uses the confirmed suspect’s profile."><Lock f={f} act={act} busy={busy} /></Section>}
            </div>
            <Journal f={f} />
          </div>
        </div>
      )}
      {f.final && <div id="r5-closed"><Closed f={f} onLeave={() => go("/case", "Case file")} /></div>}
    </div>
  );
}
