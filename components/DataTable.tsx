import type { Cell } from "@/lib/client";
export default function DataTable({ columns, rows, maxH = "max-h-[420px]" }: { columns: string[]; rows: Cell[][]; maxH?: string }) {
  return (
    <div className={`overflow-auto border border-ink/15 bg-bone ${maxH}`}>
      <table className="dtable">
        <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j} className={v === null ? "nil" : typeof v === "number" ? "num" : ""}>{v === null ? "NULL" : String(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="p-4 text-sm text-ink/60">No rows matched.</p>}
    </div>
  );
}
