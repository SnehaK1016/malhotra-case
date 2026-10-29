"use client";
import { useEffect, useState } from "react";
import DataExplorer from "./DataExplorer";
import { useScrollLock, useFocusTrap } from "@/components/handoff/shared";
import { useRef } from "react";
import type { Cell } from "@/lib/client";

/* Column meanings and units, shown beside the real tables (no figures are pre-calculated here). */
export const COLUMNS: Record<string, Record<string, string>> = {
  transactions: {
    transaction_id: "Unique payment reference", date: "Payment date (YYYY-MM-DD)", time: "Time of payment (24-hour HH:MM)", hour: "Hour of the payment, 0–23",
    sender_account: "Account the money left", receiver_account: "Account that received the money", amount: "Payment value in rupees (₹)",
    transaction_type: "Transfer method (NEFT, RTGS, UPI, IMPS)", reference: "Narration on the payment", initiated_by: "Employee or system that started it",
  },
  account_registry: {
    account_id: "Bank account identifier", account_holder: "Registered owner of the account", account_type: "Kind of account",
    branch: "Bank branch where it is held", opened_on: "Date the account was opened", status: "Current account status",
  },
  company_connections: {
    company_name: "Company named in the recovered documents", person_name: "Person recorded against that company", role: "Their recorded role",
  },
};
const LABEL: Record<string, string> = { transactions: "Transactions", account_registry: "Account Registry", company_connections: "Company Connections" };

export default function TableBrowser({ round, tables, highlight }: { round: number; tables: string[]; highlight?: (r: Cell[], c: string[]) => boolean }) {
  const [t, setT] = useState(tables[0]);
  const [big, setBig] = useState(false);
  const layer = useRef<HTMLDivElement>(null);
  useScrollLock(big);
  useFocusTrap(layer, big);
  useEffect(() => {
    if (!big) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setBig(false); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [big]);
  const body = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {tables.length > 1 ? (
          <div role="tablist" aria-label="Source tables" className="flex flex-wrap gap-1">
            {tables.map((x) => <button key={x} role="tab" aria-selected={t === x} onClick={() => setT(x)} className={`px-3 py-1.5 text-[13px] ${t === x ? "bg-bone text-ink" : "border border-bone/25 text-bone/80 hover:border-bone/60"}`}>{LABEL[x]}</button>)}
          </div>
        ) : <span className="mono text-xs tracking-[0.14em] text-bone/70">{t}</span>}
        <button className="text-[13px] underline underline-offset-4 hover:text-sand" onClick={() => setBig(!big)} aria-expanded={big}>{big ? "Close enlarged view" : "Enlarge table"}</button>
      </div>
      <p className="mono mt-3 text-[12px] text-bone/60">SQL / dataframe name: <span className="text-sand">{t}</span></p>
      <details className="mt-2 text-[13px]" open={big}>
        <summary className="cursor-pointer text-bone/80">Column descriptions</summary>
        <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)]">
          {Object.entries(COLUMNS[t] ?? {}).map(([c, d]) => <div key={c} className="contents"><dt className="mono text-sand">{c}</dt><dd className="text-bone/75">{d}</dd></div>)}
        </dl>
      </details>
      <div className="mt-3"><DataExplorer key={t} round={round} table={t} file="" skin="terminal" maxH={big ? "max-h-[68vh]" : "max-h-[460px]"} highlight={highlight} /></div>
    </div>
  );
  if (!big) return body;
  return (
    <div ref={layer} role="dialog" aria-modal="true" aria-label={`${LABEL[t]} table, enlarged`} className="dark-surface fixed inset-0 z-[75] overflow-y-auto bg-[#121214] px-4 py-6 text-bone md:px-10">{body}</div>
  );
}
