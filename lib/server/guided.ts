import "server-only";
import { tables, inr, inrShort } from "./datasets";
import { runPython, runSQL, Result, Cell } from "./engine";
import { ROUNDS } from "./content";

type Obj = Record<string, unknown>;

function discovery(id: string): Obj | null {
  const T = tables();
  if (id === "destinations") {
    const m = new Map<string, number>();
    for (const r of T.transactions.rows) m.set(String(r.receiver_account), (m.get(String(r.receiver_account)) ?? 0) + 1);
    const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { accounts: top.map((t) => t[0]).sort(), counts: Object.fromEntries(top), total: top.reduce((s, t) => s + t[1], 0) };
  }
  if (id === "totals") {
    const holder = new Map(T.account_registry.rows.map((r) => [String(r.account_id), String(r.account_holder)]));
    const g = new Map<string, { accounts: Set<string>; transfers: number; total: number }>();
    for (const r of T.transactions.rows) {
      const h = holder.get(String(r.receiver_account));
      if (!h || !/^ACC9/.test(String(r.receiver_account))) continue;
      const e = g.get(h) ?? { accounts: new Set(), transfers: 0, total: 0 };
      e.accounts.add(String(r.receiver_account)); e.transfers++; e.total += Number(r.amount); g.set(h, e);
    }
    return { companies: [...g.entries()].map(([name, e]) => ({ name, accounts: [...e.accounts].sort(), transfers: e.transfers, total: e.total, full: inr(e.total), short: inrShort(e.total) })).sort((a, b) => b.total - a.total) };
  }
  if (id === "match") {
    const logs = T.access_logs.rows.filter((r) => Number(r.hour) >= 20 && r.transaction_id);
    const hit = logs[0];
    const other = T.access_logs.rows.find((r) => r.log_date === hit.log_date && r.access_point === hit.access_point && r.employee_id !== hit.employee_id && Number(r.hour) >= 20);
    return { employee: hit.employee_id, time: hit.login_time, amount: hit.amount, full: inr(Number(hit.amount)), short: inrShort(Number(hit.amount)), related: other?.employee_id ?? null, transaction_id: hit.transaction_id };
  }
  return null;
}

export function runLead(round: number, leadId: string): { results: Result[]; note: string; discovery: Obj | null; chart?: string } | null {
  const r = ROUNDS.find((x) => x.n === round);
  const lead = r?.leads.find((l) => l.id === leadId);
  if (!r || !lead) return null;
  const T = tables();
  let results: Result[];
  if (lead.kind === "sql") results = [runSQL(lead.code, T[lead.table])];
  else if (lead.kind === "python") results = runPython(lead.code, r.tables.map((t) => T[t]), T[lead.table]);
  else {
    const d = discovery(lead.id) as { companies: { name: string; accounts: string[]; transfers: number; total: number; full: string; short: string }[] };
    const rows: Cell[][] = d.companies.map((c) => [c.name, c.accounts.join(", "), c.transfers, c.total, c.short]);
    results = [{ kind: "table", columns: ["company", "accounts", "transfers", "total_received", "in_words"], rows, total: rows.length }];
  }
  return { results, note: lead.note, discovery: discovery(lead.id), chart: lead.chart };
}
