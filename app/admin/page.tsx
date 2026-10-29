"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { api, clock, go } from "@/lib/client";

type Detail = { r1: { questionsAttempted: number; correct: number; attempts: number; hints: number; auditUnlocked: boolean; auditSolved: boolean }; r2: { task: string; done: boolean; tries: number }[]; r3: { q: string; done: boolean; tries: number }[]; r4: { questions: number }; r5: { step: string; done: boolean }[] };
type Row = {
  code: string; name: string; current_round: number | string; room: string; next_room: string | null; stage: string; paused: boolean;
  completed: boolean[]; completed_count: number; hints_used: number; penalty: number; wrong_attempts: number; clue_wrong: number; clue_hints: number;
  final_complete: boolean; started_at: string | null; completed_at: string | null; active_ms: number; score: number | null; submissions: number; detail: Detail;
};
type Sheet = { rooms: string[]; finalRoom: string; rows: { team: string; id: string; codes: string[] }[] };
type Guide = {
  route: { round: number; room: string; next: string | null; puzzle: string }[]; key: string[][];
  puzzles: { round: number; title: string; to: string; layout: string[]; sequence: string[]; solution: string; why: string[]; hint: string; wrong: string; success: string }[];
  round4: { questions: { q: string; code: string; blanks: string; note: string }[]; note: string[][] };
  round5: { steps: string[][]; profiles: string[]; statement: string[][]; lock: string };
  round1: { warmup: { n: number; title: string; concept: string; code: string; answer: string; hint: string }[]; audit: { expression: string; result: string; why: string }; reasons: { id: string; text: string; correct: boolean }[] };
  round2: { task: string; code: string; record: string }[];
  round3: { id: string; label: string; title: string; sql: string; result: string }[];
};
type Status = "all" | "not started" | "investigating" | "paused" | "completed";
const statusOf = (r: Row): Exclude<Status, "all"> => r.final_complete ? "completed" : !r.started_at ? "not started" : r.paused ? "paused" : "investigating";
const TABS = ["Overview", "Teams & Progress", "Round-entry Codes", "Answer Guide"] as const;

export default function Admin() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [at, setAt] = useState(0);
  const [err, setErr] = useState("");
  const [, tick] = useState(0);
  const load = useCallback(async () => {
    const r = await api<{ teams: Row[] }>("/api/admin/teams");
    if (r.status === 401) return go("/access/organizer");
    if (!r.ok) return setErr("Could not refresh team progress. Retrying automatically.");
    setErr(""); setRows(r.data.teams); setAt(Date.now());
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, [load]);
  useEffect(() => { const id = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(id); }, []);
  const time = (r: Row) => (!r.started_at ? "—" : clock(r.active_ms + (statusOf(r) === "investigating" ? Date.now() - at : 0)));
  const leave = async () => { await api("/api/logout", {}); go("/", "Signed out"); };

  return (
    <main className="mx-auto max-w-[1440px] px-5 py-8 md:px-8">
      <header className="no-print flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="serif text-[clamp(2.2rem,4vw,3.2rem)] font-light leading-none">Organizer dashboard</h1><p className="mt-2 text-sm text-graphite">The Malhotra Case · live view, refreshes every few seconds.</p></div>
        <div className="flex gap-3"><button className="btn-ghost" onClick={load}>Refresh</button><button className="btn" onClick={leave}>Log out</button></div>
      </header>
      {err && <p role="alert" className="no-print mt-4 border-l-2 border-wine bg-wine/5 px-3 py-2 text-sm">{err}</p>}
      <nav role="tablist" aria-label="Dashboard sections" className="no-print mt-6 flex flex-wrap gap-1 border-b border-ink/20">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-4 py-2.5 text-[15px] ${tab === t ? "border-wine font-semibold" : "border-transparent text-graphite hover:text-ink"}`}>{t}</button>)}
      </nav>
      <div className="mt-6">
        {tab === "Overview" && <Overview rows={rows} />}
        {tab === "Teams & Progress" && <Teams rows={rows} time={time} reload={load} />}
        {tab === "Round-entry Codes" && <Codes />}
        {tab === "Answer Guide" && <GuideTab />}
      </div>
    </main>
  );
}

function Overview({ rows }: { rows: Row[] | null }) {
  if (!rows) return <p className="text-graphite">Loading teams…</p>;
  const n = (s: Status) => rows.filter((r) => statusOf(r) === s).length;
  const cards: [string, number, string][] = [["Total teams", rows.length, ""], ["Investigating", n("investigating"), "Timer running"], ["Paused", n("paused"), "Between rooms, timer paused"], ["Completed", n("completed"), "Case closed"], ["Not started", n("not started"), "Round 1 code not used yet"]];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map(([k, v, d]) => <div key={k} className="border border-ink/15 bg-bone p-5"><p className="text-sm text-graphite">{k}</p><p className="mono mt-2 text-4xl">{v}</p>{d && <p className="mt-1 text-[12px] text-graphite">{d}</p>}</div>)}
    </div>
  );
}

function Teams({ rows, time, reload }: { rows: Row[] | null; time: (r: Row) => string; reload: () => void }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<Status>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [reset, setReset] = useState<Row | null>(null);
  const [msg, setMsg] = useState("");
  const list = useMemo(() => (rows ?? []).filter((r) => (f === "all" || statusOf(r) === f) && `${r.name} ${r.code}`.toLowerCase().includes(q.toLowerCase())), [rows, q, f]);
  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <div><label htmlFor="tq" className="label">Search teams</label><input id="tq" className="field !py-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Team name or ID" /></div>
        <div><label htmlFor="tf" className="label">Status</label><select id="tf" className="field !py-2" value={f} onChange={(e) => setF(e.target.value as Status)}>{(["all", "investigating", "paused", "completed", "not started"] as Status[]).map((s) => <option key={s}>{s}</option>)}</select></div>
        <p className="pb-2 text-sm text-graphite">{list.length} of {rows?.length ?? 0} teams</p>
      </div>
      {msg && <p role="status" className="mt-4 border-l-2 border-slate bg-slate/10 px-3 py-2 text-sm">{msg}</p>}
      <div className="mt-4 overflow-x-auto border border-ink/20 bg-bone">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-graphite text-bone"><tr>{["Team", "Current Round", "Status", "Active Time", "Hints", "Penalty", "Actions"].map((h) => <th key={h} className="px-4 py-3 text-[12px] font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {list.map((r) => (
              <Fragment key={r.code}>
                <tr className="border-b border-ink/10 align-middle">
                  <td className="px-4 py-3"><span className="font-medium">{r.name}</span><span className="mono block text-[11px] text-ink/55">{r.code}</span></td>
                  <td className="px-4 py-3"><span className="mono">{r.current_round}</span><span className="block text-[12px] text-ink/60">{r.room}{r.next_room ? ` → ${r.next_room}` : ""}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${statusOf(r) === "completed" ? "bg-slate" : statusOf(r) === "paused" ? "bg-sand" : statusOf(r) === "investigating" ? "bg-wine" : "bg-ink/25"}`} />{statusOf(r)}</span><span className="block text-[12px] text-ink/60">{r.stage}</span></td>
                  <td className="mono px-4 py-3">{time(r)}</td>
                  <td className="mono px-4 py-3">{r.hints_used}</td>
                  <td className="mono px-4 py-3 text-wine">+{r.penalty}</td>
                  <td className="px-4 py-3"><div className="flex gap-3"><button className="text-[13px] underline underline-offset-4" aria-expanded={open === r.code} onClick={() => setOpen(open === r.code ? null : r.code)}>{open === r.code ? "Hide details" : "Details"}</button><button className="text-[13px] text-wine underline underline-offset-4" onClick={() => setReset(r)}>Reset…</button></div></td>
                </tr>
                {open === r.code && (
                  <tr className="border-b border-ink/10 bg-paper/60"><td colSpan={7} className="px-4 py-4">
                    <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-5">
                      <div><p className="text-[12px] font-semibold text-graphite">Rounds</p><p className="mono mt-1">{r.completed.map((c, i) => `R${i + 1} ${c ? "✓" : "·"}`).join("  ")}{r.final_complete ? "  Case closed" : ""}</p><p className="mt-1 text-[12px] text-graphite">Wrong tries {r.wrong_attempts} · clue tries {r.clue_wrong} · score {r.score ?? "—"}</p></div>
                      <div><p className="text-[12px] font-semibold text-graphite">Round 1 warm-up</p><p className="mt-1">{r.detail.r1.correct}/10 correct · {r.detail.r1.questionsAttempted}/10 questions attempted · {r.detail.r1.attempts} submissions · {r.detail.r1.hints} hints</p><p className="text-[13px]">Audit {r.detail.r1.auditSolved ? "solved" : r.detail.r1.auditUnlocked ? "unlocked" : "locked"}</p></div>
                      <div><p className="text-[12px] font-semibold text-graphite">Round 2 tasks</p>{r.detail.r2.map((x) => <p key={x.task} className="text-[13px]">{x.done ? "✓" : "·"} {x.task} <span className="text-ink/50">({x.tries} checks)</span></p>)}</div>
                      <div><p className="text-[12px] font-semibold text-graphite">Round 3 SQL</p>{r.detail.r3.map((x) => <p key={x.q} className="text-[13px]">{x.done ? "✓" : "·"} {x.q} <span className="text-ink/50">({x.tries} checks)</span></p>)}</div>
                      <div><p className="text-[12px] font-semibold text-graphite">Round 4 log questions</p><p className="text-[13px]">{r.detail.r4.questions}/4 answered</p><p className="mt-2 text-[12px] font-semibold text-graphite">Round 5 evidence file</p>{r.detail.r5.map((x) => <p key={x.step} className="text-[13px]">{x.done ? "✓" : "·"} {x.step}</p>)}</div>
                    </div>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {!rows && <p className="p-6 text-graphite">Loading teams…</p>}
      </div>
      {reset && <ResetDialog r={reset} onClose={() => setReset(null)} onDone={(m) => { setReset(null); setMsg(m); reload(); }} />}
    </div>
  );
}

/* Destructive action, separated and confirmed by typing the team ID. Entry codes are never touched. */
function ResetDialog({ r, onClose, onDone }: { r: Row; onClose: () => void; onDone: (m: string) => void }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go2 = async () => {
    setBusy(true); setErr("");
    const x = await api("/api/admin/reset", { code: r.code });
    setBusy(false);
    if (!x.ok) return setErr("Reset failed. Check the connection and try again.");
    onDone(`${r.name} (${r.code}) was reset. Its five entry codes are unchanged.`);
  };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="rs-t" className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/60 px-4">
      <div className="w-full max-w-md bg-paper p-6 shadow-2xl">
        <h2 id="rs-t" className="serif text-2xl">Reset {r.name}?</h2>
        <p className="mt-3 text-sm">This erases <b>{r.name}</b>’s progress, warm-up answers, task progress, hints and submissions. It cannot be undone. Entry codes stay the same.</p>
        <label htmlFor="rs-in" className="label mt-5">Type <span className="mono font-semibold">{r.code}</span> to confirm</label>
        <input id="rs-in" className="field mono" autoFocus value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} />
        {err && <p role="alert" className="mt-3 text-sm text-wine">{err}</p>}
        <div className="mt-6 flex justify-end gap-3"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn !bg-wine" disabled={typed !== r.code || busy} onClick={go2}>{busy ? "Resetting…" : `Reset ${r.code}`}</button></div>
      </div>
    </div>
  );
}

function Codes() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [copied, setCopied] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { api<Sheet>("/api/admin/codes").then((r) => (r.ok ? setSheet(r.data) : setErr("Could not load the code sheet. Refresh to retry."))); }, []);
  const copy = async (text: string, key: string) => { try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1500); } catch { setErr("Copy is not available in this browser. Select the code instead."); } };
  const csv = () => {
    if (!sheet) return;
    const head = ["Team", ...sheet.rooms.map((room, i) => `Round ${i + 1}/${room}`)];
    const lines = [head, ...sheet.rows.map((r) => [r.team, ...r.codes])].map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(","));
    const url = URL.createObjectURL(new Blob([lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "malhotra-case-entry-codes.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="code-sheet" aria-labelledby="cs-t">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 id="cs-t" className="serif text-3xl font-light">Round-entry codes</h2><p className="mt-1 max-w-2xl text-sm text-graphite">Give each team the code for the room they have just reached, and only once they arrive. Round 5, the final statement and the treasure lock all happen in {sheet?.finalRoom ?? "the Round 5 room"}; there is no sixth code. Codes are fixed; viewing or resetting never changes them.</p></div>
        <div className="no-print flex gap-3"><button className="btn-ghost" disabled={!sheet} onClick={() => window.print()}>Print</button><button className="btn-ghost" disabled={!sheet} onClick={csv}>Download CSV</button></div>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-wine">{err}</p>}
      <div className="mt-5 overflow-x-auto border border-ink/25 bg-bone">
        <table className="w-full min-w-[860px] text-left">
          <thead className="bg-graphite text-bone"><tr><th className="px-4 py-3 text-[13px] font-medium">Team</th>{(sheet?.rooms ?? []).map((room, i) => <th key={i} className="px-4 py-3 text-[13px] font-medium">Round {i + 1} · {room}{i === 4 ? " (+ verdict and treasure)" : ""}</th>)}</tr></thead>
          <tbody>{sheet?.rows.map((r) => (
            <tr key={r.id} className="border-b border-ink/10"><td className="px-4 py-3 font-medium">{r.team}<span className="mono block text-[11px] text-ink/55">{r.id}</span></td>
              {r.codes.map((c, i) => <td key={i} className="px-4 py-3"><span className="mono text-[15px] tracking-[0.08em]">{c}</span><button className="no-print ml-2 text-[12px] underline underline-offset-2" aria-label={`Copy ${r.team} Round ${i + 1} code`} onClick={() => copy(c, `${r.id}-${i}`)}>{copied === `${r.id}-${i}` ? "Copied" : "Copy"}</button></td>)}
            </tr>
          ))}</tbody>
        </table>
        {!sheet && !err && <p className="p-6 text-graphite">Loading codes…</p>}
      </div>
    </section>
  );
}

function GuideTab() {
  const [g, setG] = useState<Guide | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api<Guide>("/api/admin/guide").then((r) => (r.ok ? setG(r.data) : setErr("Could not load the answer guide. Refresh to retry."))); }, []);
  if (err) return <p role="alert" className="text-wine">{err}</p>;
  if (!g) return <p className="text-graphite">Loading the guide…</p>;
  const S = ({ title, children }: { title: string; children: React.ReactNode }) => <details className="border border-ink/15 bg-bone"><summary className="cursor-pointer px-5 py-4 serif text-xl">{title}</summary><div className="border-t border-ink/10 px-5 py-4 text-[15px]">{children}</div></details>;
  const Pre = ({ children }: { children: string }) => <pre className="mono mt-1 overflow-x-auto bg-paper p-3 text-[13px]">{children}</pre>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-graphite">Organizer-only. Keep it away from students. A printable version of the route, puzzles and Rounds 4–5 is at <a className="underline" href="/admin/guide">/admin/guide</a>.</p>
      <S title="Answer key, all rounds"><table className="w-full text-left"><tbody>{g.key.map(([k, v]) => <tr key={k} className="border-b border-ink/10"><td className="py-2 pr-4 font-medium align-top">{k}</td><td className="py-2">{v}</td></tr>)}</tbody></table></S>
      <S title="Round 1 · Python warm-up (10 questions, 8 needed)">
        <div className="space-y-4">{g.round1.warmup.map((q) => <div key={q.n}><p className="font-semibold">Q{q.n} · {q.title} <span className="font-normal text-graphite">({q.concept})</span></p><Pre>{q.code}</Pre><p className="mt-1">Answer:</p><Pre>{q.answer}</Pre><p className="text-[13px] text-graphite">Hint: {q.hint}</p></div>)}</div>
      </S>
      <S title="Round 1 · Audit and file"><p>Expression <span className="mono">{g.round1.audit.expression}</span> = <b>{g.round1.audit.result}</b>. {g.round1.audit.why}</p><p className="mt-3 font-semibold">Supporting reason options</p><ul className="mt-1 list-disc pl-5">{g.round1.reasons.map((r) => <li key={r.id}>{r.correct ? <b>Correct: </b> : "Incorrect: "}{r.text}</li>)}</ul></S>
      <S title="Round 2 · Guided Python tasks">{g.round2.map((t) => <div key={t.task} className="mb-4"><p className="font-semibold">{t.task}</p><Pre>{t.code}</Pre><p className="mt-1">{t.record}</p></div>)}<p>Finding: 501; ACC9001, ACC9002, ACC9003, ACC9004 in any order.</p></S>
      <S title="Round 3 · SQL questions">{g.round3.map((q) => <div key={q.id} className="mb-4"><p className="font-semibold">{q.label} · {q.title}</p><Pre>{q.sql}</Pre><p className="mt-1 text-[13px] text-graphite">Expected result:</p><Pre>{q.result}</Pre></div>)}<p>Equivalent queries are accepted: results are compared, not query text. Questions 1–2 must include ORDER BY. Finding: 450000000; 50000000; BOTH.</p></S>
      <S title="Round 4 · Log questions and incident note">{g.round4.questions.map((q) => <div key={q.q} className="mb-4"><p className="font-semibold">{q.q}</p><Pre>{q.code}</Pre><p className="mt-1 text-[14px]">Blanks: <span className="mono">{q.blanks}</span>. {q.note}</p></div>)}<table className="w-full text-left text-sm"><tbody>{g.round4.note.map(([k, v]) => <tr key={k} className="border-b border-ink/10"><td className="py-1.5 pr-4">{k}</td><td className="mono py-1.5">{v}</td></tr>)}</tbody></table></S>
      <S title="Round 5 · The Last Sealed File and the treasure lock"><ol className="list-decimal space-y-1 pl-5">{g.round5.steps.map(([k, v]) => <li key={k}><b>{k}.</b> {v}</li>)}</ol><p className="mt-3 font-semibold">Reference profiles</p><ul className="list-disc pl-5">{g.round5.profiles.map((x) => <li key={x}>{x}</li>)}</ul><p className="mt-3 font-semibold">Final statement</p><table className="w-full text-left text-sm"><tbody>{g.round5.statement.map(([k, v]) => <tr key={k} className="border-b border-ink/10"><td className="py-1.5 pr-4">{k}</td><td className="mono py-1.5">{v}</td></tr>)}</tbody></table><p className="mono mt-3 border-l-2 border-wine pl-3">{g.round5.lock}</p></S>
      <S title="Route and navigation puzzles"><table className="w-full text-left text-sm"><tbody>{g.route.map((r) => <tr key={r.round} className="border-b border-ink/10"><td className="py-1.5 pr-4">Round {r.round}</td><td className="mono py-1.5 pr-4">{r.room}</td><td className="py-1.5 pr-4">{r.puzzle}</td><td className="mono py-1.5">{r.next ? `→ ${r.next}` : "stay"}</td></tr>)}</tbody></table>
        <div className="mt-4 space-y-4">{g.puzzles.map((c) => <div key={c.round}><p className="font-semibold">After Round {c.round}: {c.title} (→ {c.to})</p><p className="mono mt-1 border-l-2 border-wine pl-3">{c.solution}</p><ul className="mt-1 list-disc pl-5 text-[14px]">{c.why.map((w) => <li key={w}>{w}</li>)}</ul><p className="text-[13px] text-graphite">Hint (free): {c.hint}</p></div>)}</div>
      </S>
    </div>
  );
}
