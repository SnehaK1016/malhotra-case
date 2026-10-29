"use client";
import { useState } from "react";
import { api, Lead, Result, ChartData } from "@/lib/client";
import { ResultView } from "@/components/Notebook";
import Chart from "@/components/Chart";
import { useEffect } from "react";

type Out = { results: Result[]; note: string; discovery: Record<string, any> | null; chart?: string; error?: string };

function LeadChart({ round, id }: { round: number; id: string }) {
  const [c, setC] = useState<ChartData | null>(null);
  useEffect(() => { api<ChartData>("/api/analysis", { round, kind: "chart", chart: id }).then((r) => r.ok && setC(r.data)); }, [round, id]);
  return c ? <Chart data={c} /> : null;
}

/* Guided investigation leads, executed one after another in an analysis terminal. Each reveals a little more. */
export default function Leads({ round, leads, onResult, title = "ANALYSIS TERMINAL", lang }: { round: number; leads: Lead[]; onResult?: (id: string, o: Out) => void; title?: string; lang: "python" | "sql" }) {
  const [done, setDone] = useState<Record<string, Out>>({});
  const [busy, setBusy] = useState("");
  const idx = leads.findIndex((l) => !done[l.id]);
  const run = async (l: Lead) => {
    setBusy(l.id);
    const r = await api<Out>("/api/analysis", { round, kind: "guided", lead: l.id });
    setBusy("");
    if (r.ok && !r.data.error) { setDone((d) => ({ ...d, [l.id]: r.data })); onResult?.(l.id, r.data); }
  };
  return (
    <div className="overflow-hidden border border-bone/20 bg-[#0d0f11] text-bone shadow-2xl">
      <div className="flex items-center justify-between border-b border-bone/15 bg-[#17191c] px-4 py-2"><span className="mono text-xs tracking-[0.2em]">{title}</span><span className="mono text-[11px] text-bone/45">{lang === "python" ? "Python 3 · pandas" : "SQL console"}</span></div>
      <div className="space-y-px">
        {leads.map((l, i) => {
          const o = done[l.id]; const active = i === idx; const locked = i > idx && idx !== -1;
          return (
            <div key={l.id} className={`border-b border-bone/10 p-5 transition-opacity ${locked ? "opacity-30" : ""}`}>
              <p className="text-[15px] text-bone/80">{l.title}</p>
              <div className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-start">
                <pre className="mono min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap bg-black/50 px-3 py-2.5 text-[13px] leading-relaxed text-[#cfd8dc]"><span className="select-none text-sand">{l.kind === "sql" || lang === "sql" ? "sql> " : `In [${i + 1}]: `}</span>{l.code}</pre>
                <button className="btn-light shrink-0 !px-5 !py-2.5 !text-[11px]" disabled={locked || busy === l.id || (!!o)} onClick={() => run(l)}>{o ? "Done" : busy === l.id ? "Running" : active ? "Run" : "Locked"}</button>
              </div>
              {o && (
                <div className="mt-4 min-w-0 space-y-4">
                  {o.results.map((r, k) => <div key={k} className="min-w-0 bg-[#f1eee6] p-3 text-ink"><ResultView r={r} /></div>)}
                  {o.chart && <LeadChart round={round} id={o.chart} />}
                  <p className="font-hand text-[26px] leading-tight text-sand">{o.note}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
