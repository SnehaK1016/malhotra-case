"use client";
import type { Cell } from "@/lib/client";
type Res = { kind: "table"; columns: string[]; rows: Cell[][]; total: number } | { kind: "text"; text: string };

/* Renders what the engine actually returned: tables as tables, printed values as text. */
export default function Output({ results }: { results: Res[] }) {
  return (
    <div className="space-y-3">
      {results.map((r, i) => r.kind === "text" ? (
        <pre key={i} className="mono overflow-x-auto bg-black/50 px-3 py-2 text-[13px] text-[#cfd8dc]">{r.text}</pre>
      ) : (
        <div key={i} className="max-h-[320px] overflow-auto border border-bone/15 bg-[#0d0f11]">
          <table className="mono w-full border-collapse text-[12px]">
            <thead><tr>{r.columns.map((c) => <th key={c} className="sticky top-0 whitespace-nowrap bg-[#1b1e22] px-3 py-1.5 text-left font-semibold">{c}</th>)}</tr></thead>
            <tbody>{r.rows.map((row, k) => <tr key={k}>{row.map((v, j) => <td key={j} className={`whitespace-nowrap border-b border-bone/10 px-3 py-1 ${typeof v === "number" ? "text-right" : ""} text-bone/85`}>{v === null ? "NaN" : typeof v === "number" ? v.toLocaleString("en-IN") : String(v)}</td>)}</tr>)}</tbody>
          </table>
          {r.total > r.rows.length && <p className="mono px-3 py-1 text-[11px] text-bone/50">Showing {r.rows.length} of {r.total} rows.</p>}
        </div>
      ))}
    </div>
  );
}
