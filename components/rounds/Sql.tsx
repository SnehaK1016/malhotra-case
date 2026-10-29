"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Paper, DocBody, Doc } from "@/components/kit";
import { useScrollLock, useFocusTrap } from "@/components/handoff/shared";
import Output from "./Output";

type Res = { kind: "table"; columns: string[]; rows: (string | number | null)[][]; total: number } | { kind: "text"; text: string };
type Q = { id: string; label: string; title: string; scenario: string; hint: string; tables: string[]; draft: string; ok: boolean; open: boolean; out: Res | null };
export type R3View = {
  tables: string[]; questions: Q[]; lifted: string[]; sqlDone: boolean;
  summary: { accounts: string; company: string | null; person: string | null; total: { full: string; short: string } | null }[];
  visuals: { company: string; person: string; total: number; full: string; short: string }[] | null;
};
const COLS: Record<string, string> = { transactions: "transaction_id, date, time, hour, sender_account, receiver_account, amount, transaction_type, reference, initiated_by", account_registry: "account_id, account_holder, account_type, branch, opened_on, status", company_connections: "company_name, person_name, role" };
const Q3_INTRO = "You have established which companies own the accounts and who is connected to them. Calculate the amount each company received. Use the transactions table from Round 2. receiver_account identifies the destination, and amount stores each payment value in rupees.";

function Editor({ q, onView }: { q: Q; onView: (v: R3View) => void }) {
  const [sql, setSql] = useState(q.draft);
  const [out, setOut] = useState<Res | null>(q.out);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(false);
  const timer = useRef<number>();
  /* drafts are saved as the team types, so another laptop picks them up */
  useEffect(() => {
    if (q.ok || sql === q.draft) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => api("/api/r3", { action: "draft", q: q.id, sql }), 900);
    return () => window.clearTimeout(timer.current);
  }, [sql]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async () => {
    setBusy(true); setErr(""); setMsg(null);
    const r = await api<{ ok: boolean; result?: Res; error?: string }>("/api/r3", { action: "run", q: q.id, sql });
    setBusy(false);
    if (!r.ok || !r.data.ok) { setOut(null); return setErr(r.data.error ?? "That query could not run."); }
    setOut(r.data.result!);
  };
  const check = async () => {
    setBusy(true); setErr(""); setMsg(null);
    const r = await api<{ ok: boolean; message: string; result: Res | null; view: R3View; error?: string }>("/api/r3", { action: "check", q: q.id, sql });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? "That could not be checked.");
    if (r.data.result) setOut(r.data.result);
    setMsg({ ok: r.data.ok, text: r.data.message }); onView(r.data.view);
  };
  const clear = () => { if (!sql.trim() || window.confirm("Clear the editor? Your current query will be deleted.")) { setSql(""); setOut(null); setErr(""); setMsg(null); } };
  return (
    <div className={`border ${q.ok ? "border-[#8fa58a]/50" : "border-sand/50"} bg-[#111417] p-5`}>
      <p className="mono text-[12px] tracking-[0.14em] text-sand">{q.label.toUpperCase()} · {q.title.toUpperCase()} {q.ok && <span className="text-[#a9c0a4]">· VERIFIED</span>}</p>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed">{q.scenario.split("\n\n").map((p) => <p key={p}>{p}</p>)}</div>
      <p className="mono mt-3 text-[12px] text-bone/60">Table: <span className="text-sand">{q.tables.join(", ")}</span> · Columns: {q.tables.map((t) => COLS[t]).join("; ")}</p>
      <label htmlFor={`sql-${q.id}`} className="sr-only">SQL editor for {q.label}</label>
      <textarea id={`sql-${q.id}`} rows={7} spellCheck={false} autoComplete="off" disabled={q.ok} value={sql} placeholder="Write your SELECT query here"
        onChange={(e) => { setSql(e.target.value); setMsg(null); }} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } }}
        className="mono mt-3 w-full border-2 border-bone/25 bg-[#0d0f11] p-3 text-[14px] leading-relaxed text-[#cfd8dc] outline-none focus:border-sand disabled:opacity-75" />
      {!q.ok && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className="btn-light !px-5 !py-2.5" disabled={busy || !sql.trim()} onClick={run}>{busy ? "Running…" : "Run Query"}</button>
          <button className="btn !px-5 !py-2.5" disabled={busy || !sql.trim()} onClick={check}>Check Result</button>
          <button className="btn-ghost !border-bone/30 !text-bone hover:!bg-bone hover:!text-ink" disabled={!sql} onClick={clear}>Clear Editor</button>
          <button className="text-[13px] underline underline-offset-4" onClick={() => setHint(!hint)} aria-expanded={hint}>Method hint (free)</button>
          <span className="text-[12px] text-bone/45">Ctrl+Enter runs the query.</span>
        </div>
      )}
      {hint && !q.ok && <p className="mt-3 border-l-2 border-sand bg-sand/10 px-3 py-2 text-[14px]">{q.hint}</p>}
      {err && <p role="alert" className="mono mt-3 border-l-2 border-wine bg-wine/15 px-3 py-2 text-[13px]">{err}</p>}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 border-l-2 px-3 py-2 text-[14px] ${msg.ok ? "border-[#8fa58a] bg-[#8fa58a]/10" : "border-wine bg-wine/15"}`}>{msg.text}</p>}
      {out && <div className="mt-4"><p className="mono mb-1 text-[11px] text-bone/50">RESULT {q.ok ? "· verified" : ""}</p><Output results={[out]} /></div>}
    </div>
  );
}

export function SqlQuestions({ v, onView }: { v: R3View; onView: (v: R3View) => void }) {
  const firstOpen = v.questions.find((q) => q.open && !q.ok)?.id ?? v.questions[v.questions.length - 1].id;
  const [cur, setCur] = useState(firstOpen.startsWith("q3") ? "q3" : firstOpen);
  useEffect(() => { setCur(firstOpen.startsWith("q3") ? "q3" : firstOpen); }, [firstOpen]);
  const steps = [{ id: "q1", label: "Question 1" }, { id: "q2", label: "Question 2" }, { id: "q3", label: "Question 3" }];
  const ok = (id: string) => id === "q3" ? v.questions.filter((q) => q.id.startsWith("q3")).every((q) => q.ok) : v.questions.find((q) => q.id === id)!.ok;
  const open = (id: string) => v.questions.find((q) => q.id === (id === "q3" ? "q3a" : id))!.open;
  return (
    <div>
      <div role="tablist" aria-label="SQL questions" className="flex flex-wrap gap-1.5">
        {steps.map((s) => (
          <button key={s.id} role="tab" aria-selected={cur === s.id} disabled={!open(s.id)} onClick={() => setCur(s.id)}
            className={`px-3 py-2 text-[13px] disabled:opacity-35 ${cur === s.id ? "bg-bone text-ink" : "border border-bone/25 hover:border-bone/60"}`}>{s.label}{ok(s.id) ? " ✓" : ""}</button>
        ))}
      </div>
      <div className="mt-4 space-y-4">
        {cur === "q3" && <p className="text-[15px] leading-relaxed text-bone/85">{Q3_INTRO}</p>}
        {v.questions.filter((q) => (cur === "q3" ? q.id.startsWith("q3") : q.id === cur)).map((q) => <Editor key={q.id} q={q} onView={onView} />)}
      </div>
    </div>
  );
}

export function Summary({ v }: { v: R3View }) {
  const ne = <span className="text-bone/45">Not established yet</span>;
  return (
    <div className="border border-bone/15 bg-[#17191c] p-4">
      <p className="mono text-[11px] tracking-[0.16em] text-sand">EVIDENCE SUMMARY</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[13px]">
          <thead><tr className="border-b border-bone/20">{["Accounts", "Company", "Connected person", "Total received"].map((h) => <th key={h} className="py-1.5 pr-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{v.summary.map((r) => <tr key={r.accounts} className="border-b border-bone/10"><td className="mono py-1.5 pr-3">{r.accounts}</td><td className="py-1.5 pr-3">{r.company ?? ne}</td><td className="py-1.5 pr-3">{r.person ?? ne}</td><td className="mono py-1.5 pr-3">{r.total ? `${r.total.full} (${r.total.short})` : ne}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

/* The recovered registry documents, available beside the SQL tasks. */
export function DocsDrawer({ docs, lifted, lift, onClose }: { docs: Doc[]; lifted: Set<string>; lift: (id: string) => void; onClose: () => void }) {
  const [sel, setSel] = useState(docs[0].id);
  const layer = useRef<HTMLDivElement>(null);
  useScrollLock(true); useFocusTrap(layer, true);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const doc = docs.find((d) => d.id === sel)!;
  return (
    <div ref={layer} role="dialog" aria-modal="true" aria-label="Recovered documents" className="dark-surface fixed inset-0 z-[75] overflow-y-auto bg-[#121214]/[.98] px-4 py-6 text-bone md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="serif text-2xl">Recovered documents</p><button className="btn-light !px-5 !py-2.5" onClick={onClose} autoFocus>Close</button></div>
        <div className="mt-4 flex flex-wrap gap-1.5">{docs.map((d) => <button key={d.id} onClick={() => setSel(d.id)} aria-current={sel === d.id ? "true" : undefined} className={`px-3 py-1.5 text-[13px] ${sel === d.id ? "bg-bone text-ink" : "border border-bone/25"}`}>{d.title}</button>)}</div>
        <div className="mt-5"><Paper className="w-full"><DocBody big doc={doc} lifted={lifted} lift={lift} /></Paper></div>
      </div>
    </div>
  );
}
