"use client";
import { useState } from "react";
import Notebook from "@/components/Notebook";
import type { RoundPublic } from "@/lib/client";

/* Open analysis workspace: real pandas-style cells and an SQL console against the round's tables. */
export default function FreeTerminal({ round, label = "Open the free analysis terminal" }: { round: RoundPublic; label?: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"python" | "sql">(round.modes[0] === "sql" ? "sql" : "python");
  const [table, setTable] = useState(round.tables[0]);
  if (!round.tables.length) return null;
  const starter = mode === "sql" ? round.starterSql.replace(/FROM \w+/i, `FROM ${table}`) : round.starterPy.replace(/"[\w]+\.csv"/, `"${table}.csv"`);
  return (
    <div className="mt-10">
      <button className="btn-ghost !border-bone/40 !text-bone hover:!bg-bone hover:!text-ink" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Close free terminal" : label}</button>
      {open && (
        <div className="mt-5 bg-paper p-5 text-ink md:p-7">
          <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-ink/15 pb-4">
            <div className="flex border border-ink/25">{(["python", "sql"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 text-xs font-semibold ${mode === m ? "bg-graphite text-bone" : ""}`}>{m === "sql" ? "SQL" : "Python"}</button>)}</div>
            {round.tables.length > 1 && <select aria-label="Table" className="mono border border-ink/25 bg-bone px-2 py-1.5 text-xs" value={table} onChange={(e) => setTable(e.target.value)}>{round.tables.map((t) => <option key={t}>{t}</option>)}</select>}
            <span className="mono text-xs text-ink/55">In Python, the table is loaded as <b>df</b>.</span>
          </div>
          <Notebook key={`${mode}-${table}`} round={round.n} kind={mode} table={table} starter={starter} />
        </div>
      )}
    </div>
  );
}
