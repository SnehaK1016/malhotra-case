"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

export type R1View = {
  inspection: {lastFile:number|null;lastView:any;hasRelevant:boolean};
  required: number; correct: number; unlocked: boolean;
  questions: { n: number; title: string; concept: string; question: string; code: string; hint: string | null }[];
  state: { n: number; status: "unanswered" | "incorrect" | "correct"; tries: number; last: string }[];
  audit: { expression: string; solved: boolean };
  reasons: { id: string; text: string }[];
};

function PythonSyntax({code}:{code:string}) {
  const parts = code.split(/("[^"\n]*"|'[^'\n]*'|#[^\n]*|\b(?:if|else|for|in|not|and|or|def|return|continue|break|lambda|True|False|None)\b|\b\d+\b|\b(?:print|len|int|type|sorted|zip)\b)/g);
  return <>{parts.map((part,i)=>{
    const color = /^['"]/.test(part) ? "#b9c9ae" : /^#/.test(part) ? "#929b98" : /^(if|else|for|in|not|and|or|def|return|continue|break|lambda|True|False|None)$/.test(part) ? "#c1b2ce" : /^\d+$/.test(part) ? "#d5b991" : /^(print|len|int|type|sorted|zip)$/.test(part) ? "#a9c3ce" : undefined;
    return <span key={i} style={{color}}>{part}</span>;
  })}</>;
}

/* Ten "predict the output" routines. No Run button: students reason about the code, the server checks the prediction. */
export default function Warmup({ v, onView }: { v: R1View; onView: (v: R1View) => void }) {
  const [i, setI] = useState(() => Math.max(0, v.state.findIndex((s) => s.status !== "correct")));
  const [draft, setDraft] = useState<Record<number, string>>(() => Object.fromEntries(v.state.map((s) => [s.n, s.last])));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const q = v.questions[i], st = v.state[i];
  useEffect(() => { setMsg(null); }, [i]);

  const check = async () => {
    if (!draft[q.n]?.trim() || busy) return;
    setBusy(true);
    const r = await api<{ correct: boolean; message: string; view: R1View; error?: string }>("/api/r1", { action: "answer", q: q.n, answer: draft[q.n] });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.data.error ?? "That could not be checked." });
    onView(r.data.view); setMsg({ ok: r.data.correct, text: r.data.message });
  };
  const hint = async () => { const r = await api<{ view: R1View }>("/api/r1", { action: "hint", q: q.n }); if (r.ok) onView(r.data.view); };
  const dot = (s: R1View["state"][number]["status"]) => s === "correct" ? "border-[#8fa58a] bg-[#8fa58a] text-ink" : s === "incorrect" ? "border-wine bg-wine/20 text-bone" : "border-bone/30 text-bone/80";
  const label = (s: R1View["state"][number]["status"]) => s === "correct" ? "correct" : s === "incorrect" ? "incorrect" : "unanswered";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-bone/15 bg-[#17191c] px-5 py-4">
        <p className="text-[15px]"><b className="mono text-xl text-sand">{v.correct}</b><span className="text-bone/70"> / 10 correct</span></p>
        <p className={`text-[14px] ${v.unlocked ? "text-[#a9c0a4]" : "text-bone/75"}`} aria-live="polite">{v.unlocked ? "Audit unlocked. Remaining questions stay open if you want to finish them." : `${v.required} correct answers required to unlock the audit.`}</p>
      </div>

      <nav aria-label="Warm-up questions" className="mt-4 flex flex-wrap gap-2">
        {v.state.map((s, k) => (
          <button key={s.n} onClick={() => setI(k)} aria-current={k === i ? "step" : undefined} aria-label={`Question ${s.n}, ${label(s.status)}`}
            className={`mono h-10 w-10 border-2 text-sm font-semibold transition-colors ${dot(s.status)} ${k === i ? "outline outline-2 outline-offset-2 outline-sand" : ""}`}>{s.n}</button>
        ))}
        <span className="ml-1 flex flex-wrap items-center gap-3 text-[12px] text-bone/55"><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-[#8fa58a]" />correct</span><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-wine" />incorrect</span><span><i className="mr-1 inline-block h-2.5 w-2.5 border border-bone/40" />unanswered</span></span>
      </nav>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <p className="mono text-[12px] tracking-[0.14em] text-sand">PYTHON CHECK {q.n} OF 10 · {q.concept.toUpperCase()}</p>
          <h3 className="serif mt-1 text-2xl">{q.title}</h3>
          <pre className="mono mt-4 overflow-x-auto border border-bone/15 bg-black/50 p-4 text-[14px] leading-relaxed text-[#cfd8dc]" aria-label={`Python code for routine ${q.n}`}><code><PythonSyntax code={q.code}/></code></pre>
        </div>
        <div className="min-w-0">
          <label htmlFor={`wq-${q.n}`} className="block text-[15px]">{q.question}</label>
          <p className="mt-1 text-[13px] text-bone/55">Type the output exactly as Python would print it. Use one line per printed line.</p>
          <textarea ref={box} id={`wq-${q.n}`} rows={3} spellCheck={false} autoComplete="off" disabled={st.status === "correct"}
            value={draft[q.n] ?? ""} onChange={(e) => { setDraft({ ...draft, [q.n]: e.target.value }); setMsg(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); check(); } }}
            className="mono mt-3 w-full border-2 border-bone/25 bg-[#111316] p-3 text-[15px] text-bone outline-none focus:border-sand disabled:opacity-70" />
          <div className="mt-3 flex flex-wrap gap-3">
            <button className="btn-light !px-6 !py-3" disabled={busy || st.status === "correct" || !draft[q.n]?.trim()} onClick={check}>{st.status === "correct" ? "Correct" : busy ? "Checking…" : "Check Answer"}</button>
            {!q.hint && <button className="btn-ghost !border-bone/40 !text-bone hover:!bg-bone hover:!text-ink" onClick={hint}>Method Hint</button>}
          </div>
          <p className="mt-2 text-[12px] text-bone/45">Ctrl+Enter also checks. Method hints are free. Attempts on this routine: {st.tries}.</p>
          {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 border-l-2 px-3 py-2 text-[14px] ${msg.ok ? "border-[#8fa58a] bg-[#8fa58a]/10" : "border-wine bg-wine/15"}`}>{msg.text}</p>}
          {q.hint && <p className="mt-3 border-l-2 border-sand bg-sand/10 px-3 py-2 text-[14px]"><span className="font-semibold">Method hint.</span> {q.hint}</p>}
          <div className="mt-6 flex justify-between gap-3">
            <button className="btn-ghost !border-bone/30 !text-bone hover:!bg-bone hover:!text-ink" disabled={i === 0} onClick={() => setI(i - 1)}>← Previous</button>
            <button className="btn-ghost !border-bone/30 !text-bone hover:!bg-bone hover:!text-ink" disabled={i === 9} onClick={() => setI(i + 1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
