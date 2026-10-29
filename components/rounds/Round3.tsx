"use client";
import { useDraft } from "./useDraft";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Paper, Stage, DocBody, scrollToId, useReveal, Doc } from "@/components/kit";
import TableBrowser from "./TableBrowser";
import { SqlQuestions, Summary, DocsDrawer, R3View } from "./Sql";
import { api } from "@/lib/client";
import RelationBoard from "./RelationBoard";
import Finding, { FieldLabel, inkField } from "./Finding";
import type { useRound } from "./useRound";

type Company = { name: string; accounts: string[]; transfers: number; total: number; full: string; short: string; person?: string };
const TONE: Record<string, "" | "blue" | "ledger" | "white" | "kraft"> = { certificate: "", bank: "blue", form: "ledger", invoice: "white", letter: "kraft" };
const IDS = ["acc-rk", "acc-iy", "dir-rk", "dir-iy"];

export default function Round3({ r }: { r: ReturnType<typeof useRound> }) {
  const { data, outcome, busy, submit } = r;
  const root = useRef<HTMLDivElement>(null);
  const ev = data!.round.evidence as { docs: Doc[]; mapping: { company: string; person: string }[] };
  const [sel, setSel] = useState(ev.docs[0].id);
  const [v, setV] = useState<R3View>(data!.r3 as R3View);
  const [lifted, setLifted] = useState<Set<string>>(new Set(v.lifted));
  const [docs, setDocs] = useState(false);
  const co: Company[] | null = v.visuals ? v.visuals.map((x) => ({ name: x.company, accounts: [], transfers: 0, total: x.total, full: x.full, short: x.short, person: x.person })) : null;
  const [rk, setRk] = useDraft<string>(3, "ranveer", data!.drafts?.ranveer ?? ""); const [iy, setIy] = useDraft<string>(3, "meera", data!.drafts?.meera ?? ""); const [concl, setConcl] = useDraft<string>(3, "conclusion", data!.drafts?.conclusion ?? "");
  const done = r.complete;
  const all = IDS.every((i) => lifted.has(i));
  useReveal(root, [!!data]);
  const doc = ev.docs.find((d) => d.id === sel)!;
  const personOf = (name: string) => co?.find((c) => c.name === name)?.person ?? ev.mapping.find((m) => name.startsWith(m.company))?.person ?? "";
  const max = Math.max(...(co ?? [{ total: 1 }]).map((c) => c.total));
  const blocks = (c: Company) => Math.round((c.total / max) * 18);
  /* recovered redactions are saved, so they stay lifted on refresh or another laptop */
  const lift = (id: string) => { if (lifted.has(id)) return; setLifted((s) => new Set(s).add(id)); api("/api/r3", { action: "lift", id }); };

  useEffect(() => {
    if (!co || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(".bar-block", { scaleX: 0 }, { scaleX: 1, transformOrigin: "0 50%", duration: 0.35, stagger: 0.045, ease: "power2.out", delay: 0.2 });
  }, [!!co]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (v: string) => { const n = Number(v.replace(/\D/g, "")); return n ? `₹${n.toLocaleString("en-IN")}` : ""; };
  const ready = !!rk && !!iy && !!concl;
  const options = data!.round.fields.find((f) => f.key === "conclusion")!.options!;

  return (
    <div ref={root}>
      <section className="relative flex h-[100svh] min-h-[600px] items-end overflow-hidden scene-dark">
        <div aria-hidden className="absolute inset-0">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="absolute" style={{ left: `${8 + i * 17}%`, top: `${14 + (i % 3) * 14}%`, width: "26%", transform: `rotate(${[-6, 4, -3, 5, -5][i]}deg)`, opacity: 0.18, filter: "blur(1.2px)" }}>
              <Paper tone={["", "blue", "ledger", "white", "kraft"][i] as never}><div className="h-[170px] p-4">{[0, 1, 2, 3, 4, 5].map((k) => <div key={k} className="mb-3 h-[3px] bg-black/40" style={{ width: `${90 - k * 8}%` }} />)}</div></Paper>
            </div>
          ))}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right,#121214 8%,rgba(18,18,20,.45) 70%), linear-gradient(to top,#121214,transparent 50%)" }} />
        </div>
        <div className="relative z-10 w-full px-6 pb-16 md:px-14 md:pb-24"><div className="max-w-xl">
          <p className="serif text-[clamp(1.6rem,3.2vw,2.6rem)] font-light leading-[1.18]">The accounts were not anonymous.<br />Each belonged to a company connected to someone inside Malhotra’s circle.</p>
          <button className="btn-light mt-8" onClick={() => scrollToId("registry")}>Open the registry</button>
        </div></div>
      </section>

      <Stage id="registry" title="The corporate registry" lede="Scanned records, some of them redacted. Select a document to inspect it. Click blacked-out information to recover the hidden details." >
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:gap-10">
          {/* thumbnails in a regular two-column grid beside the reader */}
          <div className="grid min-w-0 grid-cols-2 gap-4 sm:gap-5" role="list" aria-label="Registry documents">
            {ev.docs.map((d, i) => (
              <button key={d.id} role="listitem" onClick={() => setSel(d.id)} aria-label={`Read ${d.title}`} aria-current={sel === d.id ? "true" : undefined}
                className={`group min-w-0 text-left transition-transform duration-300 hover:-translate-y-0.5 ${sel === d.id ? "outline outline-2 outline-offset-4 outline-sand" : ""}`}>
                <Paper tone={TONE[d.theme]} tape={i % 3 === 0 ? "tl" : undefined} seed={i + 2} className="w-full">
                  <div className="relative h-[190px] overflow-hidden sm:h-[210px]"><DocBody doc={d} lifted={lifted} /><div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/10 to-transparent" /></div>
                </Paper>
              </button>
            ))}
          </div>
          <div className="reader-sticky min-w-0">
            <Paper tone={TONE[doc.theme]} className="w-full"><DocBody big doc={doc} lifted={lifted} lift={lift} /></Paper>
            <p className="mono mt-4 text-xs text-bone/60">Redactions lifted: {lifted.size} of 4 {all && <span className="text-sand"> · registry mapped</span>}</p>
          </div>
        </div>
      </Stage>

      <Stage id="database" title="Financial record database" lede="Three source tables. Read them, then answer each question with your own SQL query. Every query runs on the real records.">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-4 flex flex-wrap justify-end"><button className="btn-ghost !border-bone/40 !text-bone hover:!bg-bone hover:!text-ink" onClick={() => setDocs(true)}>View recovered documents</button></div>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="min-w-0 border border-bone/15 bg-[#17191c] p-4"><TableBrowser round={3} tables={v.tables} /></div>
            <div className="min-w-0 space-y-4">
              <SqlQuestions v={v} onView={setV} />
              <Summary v={v} />
            </div>
          </div>
        </div>
        {docs && <DocsDrawer docs={ev.docs} lifted={lifted} lift={lift} onClose={() => setDocs(false)} />}
      </Stage>

      <Stage id="compare" title="What each company received" unlocked={!!co} lockHint="Verify both totals in Question 3 to unlock this section." tone="dark">
        <div className="mx-auto max-w-3xl space-y-10">
          {(co ?? []).map((c) => (
            <div key={c.name}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><p className="serif text-3xl">{personOf(c.name)}</p><p className="mono text-sm text-bone/55">{c.name}</p></div>
              <div className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-[3px]" aria-label={`${blocks(c)} of 18 blocks`}>{Array.from({ length: blocks(c) }).map((_, i) => <span key={i} className="bar-block h-9 bg-bone" />)}</div>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1"><p className="serif text-4xl text-sand">{c.short.replace("Crore", "CRORE")}</p><p className="mono text-sm text-bone/60">{c.full}</p></div>
            </div>
          ))}
          {co && <div className="pt-2"><button className="btn-light" onClick={() => scrollToId("board")}>Review the connections →</button></div>}
        </div>
      </Stage>

      <Stage id="board" title="Relationship board" lede="Two companies, two people of interest. Nobody is accused of anything yet." unlocked={!!co} lockHint="Verify both totals in Question 3 first.">
        <RelationBoard branches={(co ?? []).map((c) => ({ company: c.name.replace(/ Pvt Ltd$/, "").toUpperCase(), amount: c.short.replace("Crore", "CRORE"), person: personOf(c.name) }))} />
        {co && <div className="mt-10 flex justify-center"><button className="btn-light" onClick={() => scrollToId("finding")}>Record your final finding →</button></div>}
      </Stage>

      <Stage id="finding" title="What the money says" unlocked={!!co} lockHint="Verify both totals in Question 3 first.">
        <Finding title="Your finding" sub="Who is financially connected to the missing funds?" label="Verify finding" ready={ready} busy={busy} outcome={outcome} tone="ledger" nextLabel={r.nextLabel} onNext={r.next}
          onSubmit={() => submit({ ranveer: rk, meera: iy, conclusion: concl })}>
          <div><FieldLabel htmlFor="t-rk">Ranveer: total received (₹)</FieldLabel><input id="t-rk" inputMode="numeric" autoComplete="off" className={inkField} value={rk} onChange={(e) => setRk(e.target.value.replace(/[^\d,]/g, ""))} placeholder="full rupee amount" /><p className="mono mt-1 h-4 text-xs text-black/50">{fmt(rk)}</p></div>
          <div><FieldLabel htmlFor="t-iy">Meera: total received (₹)</FieldLabel><input id="t-iy" inputMode="numeric" autoComplete="off" className={inkField} value={iy} onChange={(e) => setIy(e.target.value.replace(/[^\d,]/g, ""))} placeholder="full rupee amount" /><p className="mono mt-1 h-4 text-xs text-black/50">{fmt(iy)}</p></div>
          <div><FieldLabel htmlFor="t-c">Who is financially connected to the missing funds?</FieldLabel>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who is financially connected">{options.map((o) => (
              <button key={o} type="button" role="radio" aria-checked={concl === o} onClick={() => setConcl(o)} className={`mono border-2 px-3 py-2.5 text-sm font-semibold tracking-[0.1em] transition-colors ${concl === o ? "border-wine bg-wine text-bone" : "border-black/30 hover:border-black"}`}>{o}</button>))}</div></div>
        </Finding>
      </Stage>
    </div>
  );
}
