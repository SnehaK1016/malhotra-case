"use client";
import { useDraft } from "./useDraft";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { api, Cell, Flow, QResult, R4View } from "@/lib/client";
import { Paper, Stage, scrollToId, useReveal } from "@/components/kit";
import FreeTerminal from "./FreeTerminal";
import LogReel from "./LogReel";
import Finding, { FieldLabel, inkField } from "./Finding";
import { EVIDENCE_IMAGES } from "@/lib/evidence-images";
import type { useRound } from "./useRound";

type Emp = { id: string; name: string; role: string; clearance: string };
const motion = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;


function Badge({ e, rot }: { e: Emp; rot: number }) {
  const photo = EVIDENCE_IMAGES[e.id];
  const initials = e.name.split(" ").map((w) => w[0]).join("");
  return (
    <div className="relative mx-auto w-full max-w-[250px]" style={{ transform: `rotate(${rot}deg)`, filter: "drop-shadow(0 14px 14px rgba(0,0,0,.5))" }}>
      <div className="mx-auto h-5 w-14 rounded-t-md bg-[#2a3238]"><div className="mx-auto mt-1.5 h-1.5 w-8 rounded-full bg-[#0d1114]" /></div>
      <div className="bg-[#eceae3] text-[#1d2225]">
        <div className="flex items-center justify-between bg-[#2f3b4a] px-4 py-2 text-[#e9ecef]"><span className="serif text-sm">Malhotra Industries</span><span className="mono text-[10px] tracking-[0.12em]">STAFF</span></div>
        <div className="flex gap-3 p-4">
          <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-[#b8c0c6]">
            {photo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={photo} alt={e.name} className="h-full w-full object-cover" /> : (
              <svg viewBox="0 0 80 96" className="h-full w-full" aria-label={`${e.name}, photo placeholder`}><rect width="80" height="96" fill="#aeb7bd" /><circle cx="40" cy="36" r="15" fill="#6b777f" /><path d="M8 96c2-26 16-36 32-36s30 10 32 36z" fill="#6b777f" /><text x="40" y="88" textAnchor="middle" fontSize="11" fontFamily="monospace" fill="#e9ecef">{initials}</text></svg>
            )}
          </div>
          <div className="min-w-0"><p className="serif text-lg leading-tight">{e.name}</p><p className="mt-1 text-[12px] text-black/65">{e.role}</p><p className="mono mt-2 text-[12px] font-bold">{e.id}</p><p className="mono text-[10px] text-black/50">Clearance {e.clearance}</p></div>
        </div>
        <div className="flex h-8 items-end gap-[2px] px-4 pb-2">{Array.from({ length: 38 }).map((_, i) => <span key={i} className="block bg-black/70" style={{ width: (i * 7) % 3 === 0 ? 3 : 1.5, height: `${60 + ((i * 13) % 5) * 8}%` }} />)}</div>
      </div>
    </div>
  );
}

/* ---------- result table: what the student's filter returned ---------- */
function ResultTable({ r, n, keyRows }: { r: QResult; n: number; keyRows: (row: Cell[], cols: string[]) => boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !motion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".r4-bar", { scaleX: 1 }, { scaleX: Math.max(0.02, r.total / Math.max(1, r.before)), duration: 0.9, ease: "power2.inOut", transformOrigin: "0 50%" });
      gsap.fromTo(".r4-row", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, stagger: Math.min(0.06, 1.2 / Math.max(1, r.rows.length)), delay: 0.5 });
      gsap.fromTo(".r4-key", { backgroundColor: "rgba(110,31,43,0)" }, { backgroundColor: "rgba(110,31,43,.45)", duration: 0.6, delay: 1.1 });
    }, ref);
    return () => ctx.revert();
  }, [r, n]);
  const amountCol = r.columns.indexOf("amount");
  return (
    <div ref={ref} className="min-w-0">
      {r.error ? <p className="mono border-l-2 border-wine bg-wine/10 px-3 py-2 text-[13px] text-bone">{r.error}</p> : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-3 text-[13px] text-bone/70">
            <span className="mono">{r.total.toLocaleString("en-IN")} of {r.before.toLocaleString("en-IN")} rows match</span>
            <span aria-hidden className="relative h-1.5 w-40 overflow-hidden bg-bone/15"><span className="r4-bar absolute inset-0 bg-sand" style={{ transform: `scaleX(${Math.max(0.02, r.total / Math.max(1, r.before))})`, transformOrigin: "0 50%" }} /></span>
          </div>
          <div className="max-h-[300px] overflow-auto border border-bone/15 bg-[#0d0f11]">
            <table className="mono w-full border-collapse text-[12px]">
              <thead><tr>{r.columns.map((c) => <th key={c} className="sticky top-0 whitespace-nowrap bg-[#1b1e22] px-3 py-2 text-left font-semibold text-bone">{c}</th>)}</tr></thead>
              <tbody>{r.rows.map((row, i) => {
                const key = keyRows(row, r.columns);
                return (
                  <tr key={i} className={`r4-row ${key ? "r4-key bg-wine/45" : ""}`}>
                    {row.map((v, j) => <td key={j} className={`whitespace-nowrap border-b border-bone/10 px-3 py-1.5 ${typeof v === "number" ? "text-right" : ""} ${j === amountCol && n === 4 ? "font-semibold text-sand" : "text-bone/85"}`}>{v === null ? "NaN" : typeof v === "number" && r.columns[j] === "amount" ? v.toLocaleString("en-IN") : String(v)}</td>)}
                  </tr>
                );
              })}</tbody>
            </table>
            {!r.rows.length && <p className="p-3 text-[13px] text-bone/60">Empty dataframe: no rows match this filter.</p>}
          </div>
          {r.total > r.rows.length && <p className="mono mt-1 text-[11px] text-bone/50">Showing the first {r.rows.length} rows.</p>}
        </>
      )}
    </div>
  );
}

/* ---------- one question card with its blanks ---------- */
type Q = R4View["questions"][number];
type Solved = { n: number; result: QResult; after: string; answer: string[] };
function QuestionCard({ q, solved, active, columns, onSolved, keyRows, draft }: { draft?: string[]; q: Q; solved?: Solved; active: boolean; columns: string[]; onSolved: (s: Solved, done: number, flow: Flow | null) => void; keyRows: (row: Cell[], cols: string[]) => boolean }) {
  const [b, setB] = useDraft<string[]>(4, "q" + q.n, solved ? solved.answer : draft ?? ["", ""]);
  const [checks, setChecks] = useState<{ ok: boolean; note?: string }[] | null>(null);
  const [result, setResult] = useState<QResult | null>(solved?.result ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const run = async () => {
    setBusy(true); setErr("");
    const r = await api<{ correct: boolean; blanks: { ok: boolean; note?: string }[]; result: QResult; done: number; after: string | null; answer: string[] | null; flow: Flow | null; error?: string }>("/api/r4", { q: q.n, blanks: b });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? "That could not be run.");
    setChecks(r.data.blanks); setResult(r.data.result);
    if (r.data.correct && r.data.after && r.data.answer) onSolved({ n: q.n, result: r.data.result, after: r.data.after, answer: r.data.answer }, r.data.done, r.data.flow);
    else if (box.current) { box.current.classList.remove("shake"); void box.current.offsetWidth; box.current.classList.add("shake"); }
  };
  const done = !!solved;
  const width = (i: number) => `${Math.max(7, (b[i]?.length ?? 0) + 2)}ch`;
  const mark = (i: number) => done ? "border-[#8fa58a]" : !checks ? "border-sand/70" : checks[i].ok ? "border-[#8fa58a]" : "border-wine";
  if (!active && !done) return (
    <div className="border border-bone/15 px-5 py-4 text-bone/40"><p className="mono text-[12px]">QUESTION {q.n}</p><p className="mt-1 text-[15px]">Locked until the previous question is answered.</p></div>
  );
  return (
    <div ref={box} className={`border ${done ? "border-[#8fa58a]/50" : "border-sand/50"} bg-[#111417] p-5 md:p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="mono text-[12px] tracking-[0.14em] text-sand">QUESTION {q.n} OF 4</p>{done && <p className="mono text-[12px] text-[#a9c0a4]">ANSWERED</p>}</div>
      <p className="mt-2 text-[15px] text-bone/75">{q.scenario}</p>
      <p className="serif mt-2 text-[clamp(1.25rem,2vw,1.55rem)] leading-snug">{q.question}</p>
      <p className={`mt-3 text-[14px] ${q.n === 4 ? "border-l-2 border-sand pl-3 text-bone" : "text-bone/65"}`}>{q.dfNote}</p>
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label={`Columns of ${q.frame === "transactions" ? "the transaction dataframe" : "the access-log dataframe"}`}>
        <span className="text-[12px] text-bone/55">{q.frame === "transactions" ? "df columns (transactions):" : q.frame === "case_day" ? "case_day columns:" : "df columns (access logs):"}</span>
        {columns.map((c) => <code key={c} className="mono bg-bone/10 px-1.5 py-0.5 text-[12px] text-bone/80">{c}</code>)}
      </div>
      <div className="mono mt-4 overflow-x-auto bg-black/50 px-4 py-3 text-[14px] leading-[2.1] text-[#cfd8dc]">
        <span className="select-none text-sand">In [{q.n}]: </span>
        <span className="whitespace-pre">{q.template[0]}</span>
        <input aria-label={`Question ${q.n}, first blank`} spellCheck={false} autoComplete="off" disabled={done} value={b[0]} onChange={(e) => { setB([e.target.value, b[1]]); setChecks(null); }} onKeyDown={(e) => e.key === "Enter" && !done && run()}
          className={`mx-0.5 border-b-2 bg-[#1b1f24] px-1.5 py-0.5 text-sand outline-none focus:bg-[#242a31] ${mark(0)}`} style={{ width: width(0) }} />
        <span className="whitespace-pre">{q.template[1]}</span>
        <input aria-label={`Question ${q.n}, second blank`} spellCheck={false} autoComplete="off" disabled={done} value={b[1]} onChange={(e) => { setB([b[0], e.target.value]); setChecks(null); }} onKeyDown={(e) => e.key === "Enter" && !done && run()}
          className={`mx-0.5 border-b-2 bg-[#1b1f24] px-1.5 py-0.5 text-sand outline-none focus:bg-[#242a31] ${mark(1)}`} style={{ width: width(1) }} />
        <span className="whitespace-pre">{q.template[2]}</span>
      </div>
      {checks && !done && (
        <ul className="mt-2 space-y-0.5 text-[13px]" aria-live="polite">
          {checks.map((c, i) => <li key={i} className={c.ok ? "text-[#a9c0a4]" : "text-[#e3a9a9]"}>{i === 0 ? "First" : "Second"} blank: {c.ok ? "correct" : c.note ?? "not yet"}</li>)}
        </ul>
      )}
      {!done && <div className="mt-4 flex flex-wrap items-center gap-3"><button className="btn-light !px-6 !py-3" disabled={busy || !b[0].trim() || !b[1].trim()} onClick={run}>{busy ? "Running" : "Run code"}</button><span className="text-[13px] text-bone/55">Each blank is checked separately. Your code is not executed; the filter it describes is applied to the real data.</span></div>}
      {err && <p role="alert" className="mt-3 text-sm text-sand">{err}</p>}
      {result && <div className="mt-5"><p className="mono mb-2 text-[11px] text-bone/50">Out [{q.n}]</p><ResultTable r={result} n={q.n} keyRows={keyRows} /></div>}
      {solved && <p className="font-hand mt-4 text-[24px] leading-tight text-sand">{solved.after}</p>}
    </div>
  );
}

/* ---------- reconstruction of the earlier verified financial trail ---------- */
function FlowDiagram({ flow }: { flow: Flow }) {
  const ref = useRef<SVGSVGElement>(null);
  const W = 900, H = 120 + flow.links.length * 100;
  const srcY = (i: number) => H / 2 + (i - (flow.sources.length - 1) / 2) * 110;
  const dstY = (i: number) => 70 + i * 100;
  useEffect(() => {
    if (!ref.current || !motion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".fl-path", { strokeDashoffset: 700 }, { strokeDashoffset: 0, duration: 0.9, stagger: 0.55, ease: "power2.inOut" });
      gsap.fromTo(".fl-dst", { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.55, delay: 0.6 });
      gsap.fromTo(".fl-lab", { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.55, delay: 0.7 });
    }, ref);
    return () => ctx.revert();
  }, [flow]);
  return (
    <div>
      <div className="overflow-x-auto"><svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[640px]" role="img" aria-label={`Reconstruction: ${flow.links.map((l) => `${l.from} sent ${l.count} transfers totalling ${l.totalText} to ${l.to}`).join("; ")}.`}>
        <defs><marker id="fl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#b6a585" /></marker></defs>
        {flow.links.map((l, i) => {
          const si = flow.sources.findIndex((s) => s.id === l.from), y1 = srcY(si), y2 = dstY(i);
          return (
            <g key={l.to + l.from}>
              <path className="fl-path" d={`M262 ${y1} C 420 ${y1}, 470 ${y2}, 610 ${y2}`} fill="none" stroke="#b6a585" strokeWidth="2.2" strokeDasharray="700" markerEnd="url(#fl-arrow)" />
              <text className="fl-lab" x="436" y={(y1 + y2) / 2 - 8} textAnchor="middle" fontSize="13" fontFamily="var(--font-mono), monospace" fill="#ece8e1">{l.count} transfers · {l.short}</text>
            </g>
          );
        })}
        {flow.sources.map((s, i) => (
          <g key={s.id}>
            <rect x="30" y={srcY(i) - 52} width="232" height="104" fill="#1b1e22" stroke="#ece8e1" strokeOpacity=".35" />
            <text x="46" y={srcY(i) - 26} fontSize="12" fontFamily="var(--font-mono), monospace" fill="#e3a9a9">DEBIT · SOURCE</text>
            <text x="46" y={srcY(i) + 2} fontSize="22" fontWeight="700" fontFamily="var(--font-mono), monospace" fill="#ece8e1">{s.id}</text>
            <text x="46" y={srcY(i) + 26} fontSize="12" fontFamily="var(--font-sans), sans-serif" fill="#ece8e1" fillOpacity=".7">{s.holder}</text>
          </g>
        ))}
        {flow.links.map((l, i) => (
          <g key={l.to} className="fl-dst">
            <rect x="616" y={dstY(i) - 40} width="254" height="80" fill="#1b1e22" stroke="#b6a585" strokeOpacity=".6" />
            <text x="632" y={dstY(i) - 16} fontSize="12" fontFamily="var(--font-mono), monospace" fill="#a9c0a4">CREDIT · DESTINATION</text>
            <text x="632" y={dstY(i) + 8} fontSize="20" fontWeight="700" fontFamily="var(--font-mono), monospace" fill="#ece8e1">{l.to}</text>
            <text x="632" y={dstY(i) + 28} fontSize="12" fontFamily="var(--font-sans), sans-serif" fill="#ece8e1" fillOpacity=".7">{l.holder} · {l.totalText}</text>
          </g>
        ))}
      </svg></div>
      <p className="mt-4 text-[15px] text-bone/75">Reconstruction of the financial trail verified in Rounds 2 and 3, computed from the transaction records: {flow.transfers} transfers, {flow.totalText} in total{flow.sources.length === 1 ? `, all sent from ${flow.sources[0].id}` : ""}. The ₹25,00,000 payment to ACC7710 found in Question 4 is a separate incident record and is not part of this total.</p>
    </div>
  );
}

export default function Round4({ r }: { r: ReturnType<typeof useRound> }) {
  const { data, outcome, busy, submit } = r;
  const root = useRef<HTMLDivElement>(null);
  const emps = (data!.round.evidence as { employees: Emp[] }).employees;
  const v = data!.r4!;
  const ev = v.evidence;
  const [solved, setSolved] = useState<Solved[]>(v.results);
  const [doneN, setDoneN] = useState(v.done);
  const [flow, setFlow] = useState<Flow | null>(v.flow);
  const [replay, setReplay] = useState(false);
  const logBox = useRef<HTMLDivElement>(null);
  /* open the log scrolled so the critical 21:47 record is in view */
  useEffect(() => { const box = logBox.current, row = box?.querySelector<HTMLElement>("[data-critical]"); if (box && row) box.scrollTop = Math.max(0, row.offsetTop - box.clientHeight / 2); }, []);
  const [a, setA] = useDraft<{ employee: string; time: string; amount: string; related: string }>(4, "finding", r.data!.drafts?.finding ?? { employee: "", time: "", amount: "", related: "" });
  const done = r.complete;
  useReveal(root, [!!data]);
  const rows = useMemo(() => {
    let s = 5; const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
    return Array.from({ length: 60 }, () => `${String(Math.floor(rnd() * 24)).padStart(2, "0")}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}  AUTH  EMP_00${1 + Math.floor(rnd() * 8)}  ${["HQ-GATE-B", "FL11-T03", "TRSY-T07", "FL11-T05"][Math.floor(rnd() * 4)]}  OK`);
  }, []);
  const c = ev.card;
  const disc = { employee: c.employee, time: c.time, amount: c.amount, full: c.amountText, short: "₹25 Lakh", related: c.related, transaction_id: c.transaction_id };
  /* the two terminal records (Question 3) and the matching payment (Question 4) are highlighted */
  const keyRows = (n: number) => (row: Cell[], cols: string[]) => {
    const g = (k: string) => row[cols.indexOf(k)];
    if (n === 3) return (g("employee_id") === c.employee && g("login_time") === c.time) || (g("employee_id") === c.related && g("login_time") === c.relatedTime);
    if (n === 4) return g("transaction_id") === c.transaction_id;
    return false;
  };
  const onSolved = (s: Solved, d: number, f: Flow | null) => {
    setSolved((x) => [...x.filter((y) => y.n !== s.n), s].sort((p, q) => p.n - q.n));
    setDoneN(d); if (f) setFlow(f);
    if (d >= 4) window.setTimeout(() => scrollToId("trail"), motion() ? 1600 : 50);
  };
  const ready = Object.values(a).every((x) => x.trim());
  const set = (k: keyof typeof a, upper = false) => (e: React.ChangeEvent<HTMLInputElement>) => setA({ ...a, [k]: upper ? e.target.value.toUpperCase() : e.target.value });

  return (
    <div ref={root}>
      <section className="relative flex min-h-[78svh] items-end overflow-hidden" style={{ background: "linear-gradient(180deg,#0e1318,#0a0d10)", color: "#ece8e1" }}>
        <div aria-hidden className="mono absolute inset-0 overflow-hidden px-4 text-[11px] leading-[2.2] text-[#7e93a6]/35" style={{ maskImage: "linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent)" }}>
          <div className="stream-col whitespace-pre" style={{ animation: "streamUp 90s linear infinite" }}>{[...rows, ...rows].join("\n")}</div>
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right,#0a0d10 8%,rgba(10,13,16,.3) 70%), linear-gradient(to top,#0a0d10,transparent 45%)" }} />
        <div className="relative z-10 w-full px-6 pb-16 md:px-14 md:pb-20"><div className="max-w-xl">
          <h1 className="serif text-[clamp(2.4rem,5vw,4rem)] font-light leading-[1.02]">What the logs show</h1>
          <p className="serif mt-4 text-[clamp(1.3rem,2.4vw,1.9rem)] font-light leading-[1.25] text-bone/85">The financial trail identified two people. Now investigators need to know who accessed Malhotra’s systems that night.</p>
          <button className="btn-light mt-8" onClick={() => scrollToId("staff")}>Open the security terminal</button>
        </div></div>
      </section>

      <Stage id="staff" title="Employee directory" lede="Six people held credentials on the treasury floor. Each ID badge is on file.">
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{emps.map((e, i) => <div key={e.id} data-reveal><Badge e={e} rot={[-1.2, 0.8, -0.5, 1, -0.9, 0.6][i]} /></div>)}</div>
        <div className="mt-12 flex justify-center"><button className="btn-ghost !border-bone/40 !text-bone hover:!bg-bone hover:!text-ink" onClick={() => scrollToId("logs")}>Go to the security log</button></div>
      </Stage>

      <Stage id="logs" title="Timeline and security evidence" lede={`Every access-log record from ${ev.date}, the day of the incident, with the matching treasury payment.`}>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0 border border-bone/20 bg-[#10151a]">
            <div className="flex items-center justify-between border-b border-bone/15 px-4 py-2"><span className="mono text-xs tracking-[0.14em]">SECURITY ACCESS TERMINAL · ACCESS_LOGS</span><span className="mono text-[11px] text-bone/50">{ev.log.length} records</span></div>
            <div ref={logBox} className="max-h-[420px] overflow-auto">
              <table className="mono w-full border-collapse text-[12px]">
                <thead><tr>{["Time", "Employee ID", "Action", "Access point", "Result"].map((h) => <th key={h} className="sticky top-0 whitespace-nowrap bg-[#1b1e22] px-3 py-2 text-left font-semibold">{h}</th>)}</tr></thead>
                <tbody>{ev.log.map((x, i) => {
                  const crit = x.result === "DELEGATED_SESSION";
                  return <tr key={i} data-critical={crit || undefined} className={crit ? "bg-wine/50" : x.key ? "bg-wine/15" : i % 2 ? "bg-white/[.03]" : ""}>{[x.time, x.employee, x.action, x.point, x.result].map((v2, j) => <td key={j} className={`whitespace-nowrap border-b border-bone/10 px-3 py-1.5 ${crit ? "font-semibold text-bone" : "text-bone/80"}`}>{v2}</td>)}</tr>;
                })}</tbody>
              </table>
            </div>
          </div>
          <div className="min-w-0 space-y-4">
            <Paper tone="blue" tape="tr" className="w-full"><div className="p-6 text-black">
              <p className="mono text-[11px] tracking-[0.18em] text-black/55">ASSOCIATED FINANCIAL ACTIVITY</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
                <div><dt className="text-[12px] text-black/55">Time</dt><dd className="mono text-xl font-semibold">{c.time}</dd></div>
                <div><dt className="text-[12px] text-black/55">Transaction amount</dt><dd className="mono text-xl font-semibold">{c.amountText}</dd></div>
                <div><dt className="text-[12px] text-black/55">Employee account</dt><dd className="mono text-xl font-semibold">{c.employee}</dd></div>
                <div><dt className="text-[12px] text-black/55">Related employee</dt><dd className="mono text-xl font-semibold">{c.related}</dd></div>
              </dl>
              <p className="mono mt-4 border-t border-black/15 pt-3 text-[12px] text-black/65">{c.employee} | TRANSFER_APPROVE | {c.terminal} | DELEGATED_SESSION</p>
            </div></Paper>
            <p className="text-[14px] text-bone/60">A delegated session means one person’s login was being used under another’s authority. It shows whose account acted, not who was sitting at the keyboard.</p>
            <button className="btn-ghost !border-bone/40 !text-bone hover:!bg-bone hover:!text-ink" aria-expanded={replay} onClick={() => setReplay(!replay)}>{replay ? "Close the replay" : "Replay the night"}</button>
          </div>
        </div>
        {replay && <div className="mx-auto mt-10 max-w-4xl"><LogReel disc={disc} /></div>}
      </Stage>

      <Stage id="questions" title="Four log questions" lede="Fill in the blanks to filter the data. Each answer unlocks the next question and shows exactly what your code returns.">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center gap-4"><p className="mono text-sm">Progress <b className="text-sand">{doneN}/4</b></p><div className="flex flex-1 gap-1.5" aria-hidden>{[1, 2, 3, 4].map((i) => <span key={i} className={`h-1.5 flex-1 ${i <= doneN ? "bg-sand" : "bg-bone/15"}`} />)}</div></div>
          <div className="space-y-5">
            {v.questions.map((q) => (
              <QuestionCard key={q.n} draft={data!.drafts?.["q" + q.n]} q={q} solved={solved.find((s) => s.n === q.n)} active={q.n === doneN + 1} columns={q.frame === "transactions" ? ev.columns.transactions : ev.columns.access_logs} onSolved={onSolved} keyRows={keyRows(q.n)} />
            ))}
          </div>
          <FreeTerminal round={data!.round} />
        </div>
      </Stage>

      <Stage id="trail" title="The money trail, reconstructed" lede="One account debited, four accounts credited: the pattern your team verified in Rounds 2 and 3." unlocked={!!flow || done} lockHint="Answer all four log questions to reconstruct the trail.">
        {flow && <div className="mx-auto max-w-5xl"><FlowDiagram flow={flow} /></div>}
      </Stage>

      <Stage id="finding" title="Final incident note" unlocked={doneN >= 4 || done} lockHint="Answer all four log questions first.">
        <Finding title="Incident note" sub="Your reading of the access logs" label="Verify finding" ready={ready} busy={busy} outcome={outcome} tone="blue" nextLabel={r.nextLabel} onNext={r.next}
          locked={doneN < 4 && !done ? "Answer all four questions to enable this note." : undefined}
          onSubmit={() => submit(a)}>
          <div><FieldLabel htmlFor="e1">Suspicious employee</FieldLabel><input id="e1" autoComplete="off" maxLength={10} className={inkField} value={a.employee} onChange={set("employee", true)} placeholder="EMP_000" /></div>
          <div><FieldLabel htmlFor="e2">Critical time</FieldLabel><input id="e2" autoComplete="off" maxLength={8} className={inkField} value={a.time} onChange={set("time")} placeholder="HH:MM" /></div>
          <div><FieldLabel htmlFor="e3">Transaction amount (₹)</FieldLabel><input id="e3" inputMode="numeric" autoComplete="off" className={inkField} value={a.amount} onChange={set("amount")} placeholder="full rupee amount" /></div>
          <div><FieldLabel htmlFor="e4">Related employee</FieldLabel><input id="e4" autoComplete="off" maxLength={10} className={inkField} value={a.related} onChange={set("related", true)} placeholder="EMP_000" /></div>
          <p className="text-[13px] text-black/60">These records show whose account acted and when. They do not, on their own, prove who committed the murder.</p>
        </Finding>
      </Stage>
    </div>
  );
}
