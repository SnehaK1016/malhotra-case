"use client";
import { useState } from "react";
import { api, Result } from "@/lib/client";
import DataTable from "./DataTable";

type CellState = { id: number; code: string; out: Result[] | null; err: string | null; running: boolean };

export function ResultView({ r }: { r: Result }) {
  if (r.kind === "text") return <pre className="mono whitespace-pre-wrap px-4 py-3 text-[13px]">{r.text}</pre>;
  return (
    <div>
      <DataTable columns={r.columns} rows={r.rows} maxH="max-h-[320px]" />
      <p className="mono px-1 pt-1.5 text-[11px] text-ink/60">{r.total} row{r.total === 1 ? "" : "s"} {r.note ? `. ${r.note}` : ""}</p>
    </div>
  );
}

/* Notebook-style cells for pandas and an SQL console, both executed by the server's safe analysis engine. */
export default function Notebook({ round, kind, table, starter }: { round: number; kind: "sql" | "python"; table: string; starter: string }) {
  const [cells, setCells] = useState<CellState[]>([{ id: 1, code: starter, out: null, err: null, running: false }]);
  const [next, setNext] = useState(2);
  const [count, setCount] = useState(0);

  const patch = (id: number, p: Partial<CellState>) => setCells((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const run = async (c: CellState) => {
    patch(c.id, { running: true, err: null });
    const r = await api<{ results?: Result[]; error?: string }>("/api/analysis", { round, kind, table, code: c.code });
    setCount((n) => n + 1);
    if (!r.ok || r.data.error) patch(c.id, { running: false, out: null, err: r.data.error ?? "Could not run." });
    else patch(c.id, { running: false, out: r.data.results ?? [], err: null });
  };

  return (
    <div className="space-y-4">
      {cells.map((c, i) => (
        <div key={c.id} className="border border-ink/20 bg-bone">
          <div className="flex items-center justify-between border-b border-ink/15 bg-stone/40 px-3 py-1.5">
            <span className="mono text-[11px] text-graphite">{kind === "python" ? `In [${i + 1}]` : `Query ${i + 1}`} <span className="text-ink/45">on {table}</span></span>
            <div className="flex gap-2">
              {cells.length > 1 && <button className="text-xs underline underline-offset-4 hover:text-wine" onClick={() => setCells(cells.filter((x) => x.id !== c.id))}>Remove</button>}
              <button className="btn !px-4 !py-1.5 !text-[11px]" disabled={c.running || !c.code.trim()} onClick={() => run(c)}>{c.running ? "Running" : "Run analysis"}</button>
            </div>
          </div>
          <textarea
            aria-label={kind === "python" ? "Python cell" : "SQL query"}
            value={c.code} spellCheck={false} rows={Math.min(10, Math.max(3, c.code.split("\n").length + 1))}
            onChange={(e) => patch(c.id, { code: e.target.value })}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(c); } }}
            className="mono block w-full resize-y bg-ink px-4 py-3 text-[13px] leading-relaxed text-bone caret-sand focus:outline-none"
          />
          {(c.err || c.out) && (
            <div className="border-t border-ink/15 p-3">
              {c.err && <p role="alert" className="mono whitespace-pre-wrap border-l-2 border-wine bg-wine/5 px-3 py-2 text-[13px] text-wine">{c.err}</p>}
              {c.out && <div className="space-y-3"><p className="mono text-[11px] text-ink/50">{kind === "python" ? `Out [${i + 1}]` : "Result"}</p>{c.out.map((r, k) => <ResultView key={k} r={r} />)}</div>}
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={() => { setCells([...cells, { id: next, code: "", out: null, err: null, running: false }]); setNext(next + 1); }}>Add {kind === "python" ? "cell" : "query"}</button>
        <span className="text-xs text-ink/50">Ctrl + Enter runs the focused cell. {count} run{count === 1 ? "" : "s"} this session.</span>
      </div>
      <p className="text-xs leading-relaxed text-ink/60">
        {kind === "python"
          ? "This workspace understands common pandas: df.head(), df[df.col >= n], df.groupby('c')['x'].sum(), value_counts(), sort_values(), len(), shape and more. Assign variables across lines."
          : "Supported: SELECT with COUNT/SUM/AVG/MIN/MAX, WHERE with AND/OR/IN/LIKE/BETWEEN, GROUP BY, ORDER BY and LIMIT."}
      </p>
    </div>
  );
}
