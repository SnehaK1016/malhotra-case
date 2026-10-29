"use client";
import { useDraft } from "./useDraft";
import { useRef, useState } from "react";
import gsap from "gsap";
import { api } from "@/lib/client";
import { Paper, Stage, Stamp, scrollToId, useReveal } from "@/components/kit";
import DeskScene from "./DeskScene";
import Finding, { FieldLabel, inkField } from "./Finding";
import Warmup, { R1View } from "./Warmup";
import type { useRound } from "./useRound";

type FileView = { relevant?: boolean; sealed?: boolean; title?: string; lines?: string[]; text?: string; items?: any[] };
const rots = [-2.2, 1.6, -1.2];

export default function Round1({ r }: { r: ReturnType<typeof useRound> }) {
  const { data, outcome, busy, submit } = r;
  const root = useRef<HTMLDivElement>(null);
  const folder = useRef<HTMLDivElement>(null);
  const spill = useRef<HTMLDivElement>(null);
  const ev = data!.round.evidence as { expression: string; paths: { id: string; note: string }[]; cabinet: { id: number; label: string; tab: string; wear: number }[] };
  const [opened, setOpened] = useState(false);
  const [w, setW] = useState<R1View>(data!.r1 as R1View);
  const [result, setResult] = useDraft(1, "audit-result", data!.drafts?.["audit-result"] ?? "");
  const [auditMsg, setAuditMsg] = useState("");
  const index = w.audit.solved ? "05" : null;
  const [fileSel, setFileSel] = useState<number | null>(w.inspection.lastFile);
  const [view, setView] = useState<FileView | null>(w.inspection.lastView);
  const [found, setFound] = useState(w.inspection.hasRelevant);
  const [ans, setAns] = useDraft<{ file: string; reason: string }>(1, "finding", data!.drafts?.finding ?? { file: "", reason: "" });
  const done = r.complete;
  useReveal(root, [!!data]);

  const openEvidence = () => {
    if (opened) return scrollToId("warmup");
    setOpened(true);
    const f = folder.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setTimeout(() => scrollToId("warmup"), 100); return; }
    const tl = gsap.timeline({ onComplete: () => scrollToId("warmup") });
    tl.to(f.querySelector(".folder-flap"), { rotateY: -168, duration: 1.2, ease: "power3.inOut" })
      .to(f.querySelectorAll(".folder-sheet"), { x: (i) => 90 + i * 34, y: (i) => -20 - i * 10, rotate: (i) => 5 + i * 5, duration: 1, stagger: 0.18, ease: "power3.out" }, 0.55)
      .to(f, { x: "-6%", duration: 1, ease: "power2.inOut" }, 0.4);
  };

  /* the team calculates the audit result itself; the server checks it */
  const checkAudit = async () => {
    setAuditMsg("");
    const x = await api<{ correct: boolean; message: string; view: R1View; error?: string }>("/api/r1", { action: "audit", result });
    if (!x.ok) return setAuditMsg(x.data.error ?? "That could not be checked.");
    setW(x.data.view); setAuditMsg(x.data.message);
    if (x.data.correct) setTimeout(() => scrollToId("cabinet"), 1200);
  };

  const openFile = async (id: number) => {
    setFileSel(id); setView(null);
    const x = await api<FileView>("/api/analysis", { round: 1, kind: "openfile", file: id });
    if (!x.ok) return;
    setView(x.data);
    if (x.data.relevant) {
      setFound(true); // the team still chooses the file and the reason themselves in the finding
      setTimeout(() => document.querySelector(".spill-item")?.scrollIntoView({ block: "center", behavior: "smooth" }), 700);
      requestAnimationFrame(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        gsap.fromTo(".spill-item", { y: 80, x: (i) => (i - 2) * -60, opacity: 0, rotate: (i) => (i % 2 ? -12 : 12), scale: 0.8 }, { y: 0, x: 0, opacity: 1, rotate: (i) => [-2, 1.6, -1.4, 3, -2.4][i] ?? 0, scale: 1, duration: 1.1, stagger: 0.2, ease: "power3.out" });
        gsap.fromTo(".cab-flap", { rotateX: 0 }, { rotateX: -150, duration: 1, ease: "power3.inOut" });
      });
    }
  };

  const fileStr = (id: number) => `FILE ${String(id).padStart(2, "0")}`;
  const ready = !!ans.file && !!ans.reason;
  const fileOpt = data!.round.fields.find((f) => f.key === "file")!.options!;

  return (
    <div ref={root}>
      {/* LAYER 1: STORY */}
      <section className="relative flex h-[100svh] min-h-[620px] items-end overflow-hidden scene-dark">
        <DeskScene ref={folder} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to right, rgba(10,6,4,.85) 0%, rgba(10,6,4,.55) 32%, transparent 58%), linear-gradient(to top, rgba(10,6,4,.7), transparent 40%)" }} />
        <div className="relative z-10 w-full px-6 pb-14 md:px-14 md:pb-20">
          <div className="max-w-xl">
            <p className="serif text-[clamp(1.6rem,3.2vw,2.6rem)] font-light leading-[1.18] text-bone">Malhotra’s audit system was damaged hours before his death.<br />One fragment survived.</p>
            <button className="btn-light mt-8" onClick={openEvidence}>{opened ? "Continue" : "Open evidence"}</button>
          </div>
        </div>
      </section>

      <nav aria-label="Round 1 stages" className="flex flex-wrap gap-3 border-y border-bone/15 px-6 py-5 md:px-14">
        {[["warmup", "1 · Python system checks", true], ["fragment", "2 · Decode the audit index", w.unlocked || done], ["cabinet", "3 · Inspect the files", !!index || done], ["finding", "4 · Submit the finding", found || done]].map(([id,label,open]) => <button key={String(id)} disabled={!open} onClick={()=>scrollToId(String(id))} className="mono border border-bone/25 px-3 py-2 text-xs disabled:opacity-40">{String(label)}{!open ? " · Locked" : ""}</button>)}
      </nav>
      {/* LAYER 2: INVESTIGATION. The fragment. */}
      <Stage id="warmup" title="Python system checks" lede="Malhotra’s audit system is partially damaged. Before opening the archive, verify ten small Python routines recovered from the system. Predict the output of each routine. Discuss your reasoning with your team before submitting.">
        <p className="mb-5 text-sm text-bone/60">Warm-up: approximately 12–15 minutes. Predict the outputs; your team can attempt the checks in any order.</p>
        <Warmup v={w} onView={(nv) => { const was = w.unlocked; setW(nv); if (!was && nv.unlocked) setTimeout(() => scrollToId("fragment"), 900); }} />
      </Stage>

      <Stage id="fragment" title="The recovered fragment" lede="Investigators recovered one damaged calculation. Beside it, three handwritten attempts at reading it. Work out the result yourselves." unlocked={w.unlocked || done} lockHint="Answer 8 of the 10 Python system checks correctly to unlock the audit.">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="relative mx-auto w-full max-w-[560px] py-6">
            <Paper torn="tlrb" seed={7} rot={-1.4} tape="top" className="w-full">
              <div className="mono px-8 py-12 text-center text-black/80 md:px-12">
                <p className="text-[11px] tracking-[0.3em]">AUDIT INDEX RECOVERY</p>
                <p className="serif mt-8 text-[clamp(2rem,5vw,3.4rem)] font-medium tracking-wide">{ev.expression}</p>
                <p className="mt-8 text-sm text-black/55">Follow the correct order.</p>
                {!index && (
                  <div className="mt-8 border-t border-dashed border-black/30 pt-5 text-left">
                    <label htmlFor="audit-result" className="mono block text-[11px] tracking-[0.18em] text-black/60">YOUR RESULT</label>
                    <div className="mt-2 flex gap-3">
                      <input id="audit-result" inputMode="decimal" autoComplete="off" value={result} onChange={(e) => { setResult(e.target.value.replace(/[^\d.\-]/g, "")); setAuditMsg(""); }} onKeyDown={(e) => e.key === "Enter" && result && checkAudit()}
                        className="font-hand w-28 border-b-2 border-black/40 bg-transparent text-center text-[34px] text-[#1f3a6b] outline-none focus:border-wine" />
                      <button className="btn !px-5" disabled={!result} onClick={checkAudit}>Check result</button>
                    </div>
                    {auditMsg && <p role="alert" className="mt-3 text-sm text-wine">{auditMsg}</p>}
                  </div>
                )}
                {index && <div className="mt-8"><Stamp rot={-6} className="!text-base">AUDIT INDEX: {index}</Stamp></div>}
              </div>
            </Paper>
          </div>
          <div className="relative grid min-w-0 gap-6 sm:grid-cols-3 lg:grid-cols-1">
            {ev.paths.map((p, i) => (
              <div key={p.id} data-reveal className="text-left">
                <Paper rot={rots[i]} tone={i === 1 ? "kraft" : "white"} tape={i === 0 ? "tl" : i === 2 ? "tr" : undefined} className="w-full">
                  <div className="p-5">
                    <span className="font-hand inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-wine text-xl text-wine">{p.id}</span>
                    <p className="font-hand mt-2 text-[27px] leading-[1.05] text-[#1f3a6b]">{p.note}</p>
                  </div>
                </Paper>
              </div>
            ))}
          </div>
        </div>
      </Stage>

      {/* the cabinet */}
      <Stage id="cabinet" title="The evidence cabinet" lede={index ? "The folder tab reads 05. Five files were pulled from the drawer." : "Five files were pulled from the drawer."} unlocked={!!index || done} lockHint="The cabinet stays shut until the audit index is recovered.">
        <div className="mx-auto max-w-5xl">
          <div className="relative rounded-[3px] bg-[#222a2e] px-4 pb-0 pt-10 shadow-2xl md:px-10" style={{ backgroundImage: "linear-gradient(180deg,#2a3236,#1d2428)" }}>
            <div className="absolute inset-x-0 top-0 h-6 border-b border-black/60 bg-[#2f383d]"><div className="mx-auto mt-1.5 h-2.5 w-24 rounded-full bg-[#171d20]" /></div>
            <div className="flex items-end justify-center gap-0 overflow-x-auto pb-0 pt-4">
              {ev.cabinet.map((f, i) => (
                <button key={f.id} onClick={() => openFile(f.id)} aria-label={`Open ${f.label}`} className="group relative -mx-1 shrink-0 transition-transform duration-300 hover:-translate-y-4 focus-visible:-translate-y-4" style={{ transform: `rotate(${[-1.2, 0.8, -0.6, 1.4, -0.9][i]}deg)`, zIndex: fileSel === f.id ? 20 : 5 - Math.abs(i - 2), marginTop: [18, 0, 26, 8, 14][i] }}>
                  <div className="relative h-[250px] w-[132px] md:h-[290px] md:w-[158px]" style={{ filter: "drop-shadow(0 10px 10px rgba(0,0,0,.55))" }}>
                    <div className="absolute left-[8%] top-[-14px] h-[18px] w-[52%] rounded-t-[3px] bg-[#c0a97f]"><span className="mono block pt-[3px] text-center text-[9px] font-bold text-[#3b2f1a]">{f.tab}</span></div>
                    <div className="absolute inset-0 rounded-[2px]" style={{ background: "linear-gradient(160deg,#cdb68c,#b79f74)" }}>
                      <div className="absolute inset-x-[12%] top-[16%] bg-[#ece6d4] p-2 text-center"><p className="mono text-[13px] font-bold text-[#2b261b]">{f.label}</p><p className="mono text-[8px] text-black/45">AUDIT / 2026</p></div>
                      {f.wear >= 2 && <div className="absolute inset-0 rounded-[2px]" style={{ background: "radial-gradient(ellipse at 85% 90%, rgba(60,40,20,.35), transparent 55%)" }} />}
                      {f.wear >= 3 && <div className="absolute inset-x-0 bottom-0 h-[34%]" style={{ background: "repeating-linear-gradient(115deg, rgba(0,0,0,.14) 0 3px, transparent 3px 9px)", maskImage: "linear-gradient(to top, #000, transparent)", WebkitMaskImage: "linear-gradient(to top, #000, transparent)" }} />}
                      {f.wear >= 1 && <div className="absolute left-0 top-0 h-5 w-5" style={{ background: "linear-gradient(135deg, rgba(0,0,0,.28) 50%, transparent 50%)" }} />}
                      <div className={`absolute inset-0 rounded-[2px] ring-2 ring-wine/0 transition ${fileSel === f.id ? "ring-wine/80" : "group-hover:ring-black/30"}`} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-0 h-5 bg-gradient-to-b from-black/50 to-transparent" />
          </div>

          {/* what the selected file contains */}
          <div className="mt-12 min-h-[200px] min-w-0">
            {fileSel && !view && <p className="mono text-center text-sm text-bone/50">Opening {fileStr(fileSel)}…</p>}
            {view && !view.relevant && (
              <div className="mx-auto max-w-xl">
                <Paper rot={-0.8} tone="white" fold>
                  <div className="p-8 text-black">
                    <p className="mono text-[11px] tracking-[0.2em] text-black/50">{fileSel ? fileStr(fileSel) : ""}</p>
                    <h3 className="serif mt-2 text-2xl">{view.title ?? "Sealed folder"}</h3>
                    <div className="mt-4 space-y-2">{(view.lines ?? [view.text ?? ""]).map((l, i) => <p key={i} className={i === (view.lines?.length ?? 1) - 1 ? "font-hand text-[26px] text-wine/85" : "text-[15px] text-black/70"}>{l}</p>)}</div>
                  </div>
                </Paper>
              </div>
            )}
            {view?.relevant && (
              <div ref={spill} className="relative mx-auto grid max-w-5xl gap-6 md:grid-cols-6">
                {view.items!.map((it, i) => (
                  <div key={i} className={`spill-item ${["md:col-span-3", "md:col-span-3", "md:col-span-3", "md:col-span-2", "md:col-span-2"][i]}`}>
                    {it.kind === "statement" && (
                      <Paper tone="white" tape="tl"><div className="overflow-x-auto p-5 text-black"><p className="mono text-[11px] font-bold tracking-[0.14em]">{it.title}</p><table className="mono mt-3 w-full text-[11px]"><tbody>{it.rows.map((r: string[], k: number) => <tr key={k} className="border-b border-black/15">{r.map((c, j) => <td key={j} className={`py-1.5 ${j === 2 ? "text-right" : ""}`}>{c}</td>)}</tr>)}</tbody></table></div></Paper>
                    )}
                    {it.kind === "refs" && (
                      <Paper tone="ledger" torn="rb" seed={5}><div className="p-5 text-black"><p className="mono text-[11px] font-bold tracking-[0.14em]">{it.title}</p><div className="mono mt-3 space-y-1.5 text-[12px]">{it.lines.map((l: string, k: number) => <p key={k}>{l}</p>)}</div></div></Paper>
                    )}
                    {it.kind === "sheet" && (
                      <Paper tone="ledger" torn="tr" seed={12}><div className="overflow-x-auto p-5 text-black"><p className="mono text-[11px] font-bold tracking-[0.14em]">{it.title}</p><table className="mono mt-3 w-full text-[11px]"><tbody>{it.rows.map((r: string[], k: number) => <tr key={k} className="border-b border-black/15">{r.map((c, j) => <td key={j} className="py-1.5">{c}</td>)}</tr>)}</tbody></table></div></Paper>
                    )}
                    {it.kind === "usb" && (
                      <div className="flex flex-col items-center justify-center py-4" style={{ filter: "drop-shadow(0 12px 10px rgba(0,0,0,.6))" }}>
                        <svg viewBox="0 0 120 220" className="h-44"><rect x="38" y="6" width="44" height="46" fill="#a9b1b6" /><rect x="48" y="14" width="8" height="10" fill="#222" /><rect x="64" y="14" width="8" height="10" fill="#222" /><rect x="28" y="50" width="64" height="150" rx="10" fill="#1a2d52" /><rect x="40" y="90" width="40" height="52" fill="#e5dec9" /><text x="60" y="112" textAnchor="middle" fontSize="11" fontFamily="monospace" fill="#222">{it.label}</text><text x="60" y="130" textAnchor="middle" fontSize="6.5" fontFamily="monospace" fill="#444">{it.size}</text></svg>
                      </div>
                    )}
                    {it.kind === "note" && (
                      <Paper tone="kraft" rot={3} tape="top"><div className="flex min-h-[150px] items-center justify-center p-6"><p className="font-hand text-center text-[42px] leading-none text-[#1f3a6b]">{it.text}</p></div></Paper>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Stage>

      {/* LAYER 3: FINDING */}
      <Stage id="finding" title="What the evidence says" unlocked={found || done} lockHint="Inspect the files in the cabinet first.">
        <Finding title="Your finding" sub="Which file, and why?" label="Verify finding" ready={ready} busy={busy} outcome={outcome} nextLabel={r.nextLabel} onNext={r.next}
          onSubmit={() => submit({ file: ans.file, reason: ans.reason })}>
          <div><FieldLabel htmlFor="f-file">Evidence file</FieldLabel>
            <select id="f-file" className={`${inkField} text-[24px]`} value={ans.file} onChange={(e) => setAns({ ...ans, file: e.target.value })}><option value="">choose a file</option>{fileOpt.map((o) => <option key={o}>{o}</option>)}</select></div>
          <fieldset><legend className="mono mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/60">Why this file?</legend>
            <div className="grid gap-2" role="radiogroup" aria-label="Supporting reason">{w.reasons.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={ans.reason === o.id} onClick={() => setAns({ ...ans, reason: o.id })}
                className={`border-2 px-3 py-2 text-left text-[14px] leading-snug transition-colors ${ans.reason === o.id ? "border-wine bg-wine text-bone" : "border-black/25 hover:border-black"}`}>{o.text}</button>
            ))}</div>
          </fieldset>
        </Finding>
      </Stage>
    </div>
  );
}
