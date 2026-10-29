"use client";
import { useEffect, useState } from "react";
import { api, Cell } from "@/lib/client";

/* exact column names: students type them in SQL and pandas */
const pretty = (c: string) => c;
type Resp = { columns: string[]; rows: Cell[][]; total: number; page: number; size: number; grouped?: boolean; facets: Record<string, string[]>; error?: string };

/* Searchable, sortable, filterable data sheet backed by the server. `highlight` can dim every row except the ones that matter. */
export default function DataExplorer({ round, table, file, groupOptions = [], lateToggle = false, minAmount = false, highlight, dimOthers = false, skin = "sheet", maxH = "max-h-[460px]" }: {
  round: number; table: string; file: string; groupOptions?: string[]; lateToggle?: boolean; minAmount?: boolean;
  highlight?: (r: Cell[], cols: string[]) => boolean; dimOthers?: boolean; skin?: "sheet" | "terminal"; maxH?: string;
}) {
  const [q, setQ] = useState(""); const [min, setMin] = useState(""); const [late, setLate] = useState(false);
  const [col, setCol] = useState(""); const [val, setVal] = useState(""); const [group, setGroup] = useState("");
  const [sort, setSort] = useState(""); const [dir, setDir] = useState<"asc" | "desc">("asc"); const [page, setPage] = useState(0);
  const [d, setD] = useState<Resp | null>(null);
  const [facets, setFacets] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const t = setTimeout(async () => {
      const p = new URLSearchParams({ round: String(round), table, page: String(page) });
      if (q) p.set("q", q); if (min) p.set("min", min); if (late) p.set("late", "1"); if (col && val) { p.set("col", col); p.set("val", val); }
      if (group) p.set("group", group); if (sort) { p.set("sort", sort); p.set("dir", dir); }
      const r = await api<Resp>(`/api/dataset?${p}`);
      if (r.ok) { setD(r.data); if (Object.keys(r.data.facets ?? {}).length) setFacets(r.data.facets); }
    }, 220);
    return () => clearTimeout(t);
  }, [round, table, q, min, late, col, val, group, sort, dir, page]);

  const reset = () => { setQ(""); setMin(""); setLate(false); setCol(""); setVal(""); setGroup(""); setSort(""); setPage(0); };
  const pages = d ? Math.max(1, Math.ceil(d.total / d.size)) : 1;
  const dark = skin === "terminal";
  const ctl = dark ? "border-bone/25 bg-[#0d0f11] text-bone placeholder:text-bone/35" : "border-black/25 bg-[#f4f1e8] text-ink placeholder:text-black/35";
  const fmt = (c: string, v: Cell) => (v === null ? "NULL" : typeof v === "number" && /amount|total/.test(c) ? v.toLocaleString("en-IN") : String(v));

  return (
    <div className={dark ? "text-bone" : "text-ink"}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="mono mr-2 text-xs opacity-70">{file}</span>
        <input aria-label="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search any field" className={`mono w-44 border px-2.5 py-1.5 text-xs ${ctl}`} />
        {minAmount && <input aria-label="Minimum amount" inputMode="numeric" value={min} onChange={(e) => { setMin(e.target.value.replace(/\D/g, "")); setPage(0); }} placeholder="Min amount" className={`mono w-32 border px-2.5 py-1.5 text-xs ${ctl}`} />}
        {lateToggle && <label className="mono flex cursor-pointer items-center gap-1.5 text-xs"><input type="checkbox" checked={late} onChange={(e) => { setLate(e.target.checked); setPage(0); }} className="accent-[#6e1f2b]" />After 20:00 only</label>}
        {Object.keys(facets).length > 0 && (
          <span className="flex items-center gap-1">
            <select aria-label="Filter column" value={col} onChange={(e) => { setCol(e.target.value); setVal(""); setPage(0); }} className={`mono border px-1.5 py-1.5 text-xs ${ctl}`}><option value="">Filter by</option>{Object.keys(facets).map((c) => <option key={c} value={c}>{pretty(c)}</option>)}</select>
            {col && <select aria-label="Filter value" value={val} onChange={(e) => { setVal(e.target.value); setPage(0); }} className={`mono border px-1.5 py-1.5 text-xs ${ctl}`}><option value="">any</option>{(facets[col] ?? []).map((v) => <option key={v}>{v}</option>)}</select>}
          </span>
        )}
        {groupOptions.length > 0 && <select aria-label="Group by" value={group} onChange={(e) => { setGroup(e.target.value); setPage(0); }} className={`mono border px-1.5 py-1.5 text-xs ${ctl}`}><option value="">No grouping</option>{groupOptions.map((c) => <option key={c} value={c}>Group by {pretty(c)}</option>)}</select>}
        <button className="mono text-xs underline underline-offset-4 opacity-70 hover:opacity-100" onClick={reset}>Clear</button>
        <span className="mono ml-auto text-xs opacity-70">{d ? `${d.total.toLocaleString("en-IN")} ${d.grouped ? "groups" : "records"}` : "…"}</span>
      </div>
      <div className={`overflow-auto border ${maxH} ${dark ? "border-bone/20 bg-[#0d0f11]" : "border-black/30 bg-[#f6f3ea]"}`}>
        <table className="mono w-full border-collapse text-[12px]">
          <thead><tr>{d?.columns.map((c) => (
            <th key={c} className={`sticky top-0 whitespace-nowrap px-3 py-2 text-left font-semibold ${dark ? "bg-[#1b1e22] text-bone" : "bg-[#2b2b2e] text-bone"} ${d.grouped ? "" : "cursor-pointer select-none hover:bg-wine"}`}
              onClick={() => { if (d.grouped) return; if (sort === c) setDir(dir === "asc" ? "desc" : "asc"); else { setSort(c); setDir("asc"); } setPage(0); }}>
              {pretty(c)}{sort === c && !d.grouped ? (dir === "asc" ? " ▲" : " ▼") : ""}
            </th>))}</tr></thead>
          <tbody>
            {d?.rows.map((r, i) => {
              const hi = highlight?.(r, d.columns) ?? false;
              const dim = dimOthers && !hi;
              return (
                <tr key={i} className={`transition-opacity duration-700 ${dim ? "opacity-20" : ""} ${hi ? (dark ? "bg-wine/35" : "bg-wine/15") : i % 2 ? (dark ? "bg-white/[.03]" : "bg-black/[.035]") : ""}`}>
                  {r.map((v, j) => <td key={j} className={`whitespace-nowrap border-b px-3 py-1.5 ${dark ? "border-bone/10" : "border-black/10"} ${typeof v === "number" ? "text-right" : ""} ${v === null ? "opacity-35" : ""}`}>{fmt(d.columns[j], v)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
        {d && !d.rows.length && <p className="p-4 text-sm opacity-60">No records match these filters.</p>}
      </div>
      {d && !d.grouped && (
        <div className="mono mt-2 flex items-center justify-end gap-3 text-xs">
          <button className="underline underline-offset-4 disabled:opacity-30" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
          <span>{page + 1} / {pages}</span>
          <button className="underline underline-offset-4 disabled:opacity-30" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
