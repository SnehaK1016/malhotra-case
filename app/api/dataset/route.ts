import { bad, json } from "@/lib/server/http";
import { currentTeam } from "@/lib/server/auth";
import { store } from "@/lib/server/store";
import { isUnlocked } from "@/lib/server/game";
import { ROUNDS } from "@/lib/server/content";
import { tables } from "@/lib/server/datasets";

const FACETS: Record<string, string[]> = { transactions: ["transaction_type", "initiated_by"], access_logs: ["employee_id", "action", "status", "access_point"], timeline: ["source", "location"], account_registry: ["branch"] };
const cmp = (a: unknown, b: unknown) => (typeof a === "number" && typeof b === "number" ? a - b : String(a ?? "").localeCompare(String(b ?? "")));

export async function GET(req: Request) {
  const team = await currentTeam();
  if (!team) return bad("Not signed in", 401);
  const u = new URL(req.url);
  const g = (k: string) => u.searchParams.get(k) ?? "";
  const n = Number(g("round"));
  const r = ROUNDS.find((x) => x.n === n);
  if (!r) return bad("No such round", 404);
  if (!isUnlocked(await store.getProgress(team.id), n)) return bad("Round locked", 403);
  const name = g("table") || r.tables[0];
  if (!r.tables.includes(name)) return bad("Table not available in this round", 403);
  const t = tables()[name];
  let rows = t.rows;

  const q = g("q").toLowerCase().slice(0, 60);
  if (q) rows = rows.filter((x) => t.columns.some((c) => String(x[c] ?? "").toLowerCase().includes(q)));
  const min = Number(g("min"));
  if (min > 0 && t.columns.includes("amount")) rows = rows.filter((x) => Number(x.amount) >= min);
  if (g("late") === "1" && t.columns.includes("hour")) rows = rows.filter((x) => Number(x.hour) >= 20);
  const col = g("col"), val = g("val").toLowerCase();
  if (col && val && t.columns.includes(col)) rows = rows.filter((x) => String(x[col] ?? "").toLowerCase() === val);

  const facets: Record<string, string[]> = {};
  for (const c of FACETS[name] ?? []) facets[c] = [...new Set(t.rows.map((x) => String(x[c] ?? "")).filter(Boolean))].sort().slice(0, 14);

  const group = g("group");
  if (group && t.columns.includes(group)) {
    const m = new Map<string, { n: number; sum: number }>();
    for (const x of rows) { const k = String(x[group]); const e = m.get(k) ?? { n: 0, sum: 0 }; e.n++; e.sum += Number(x.amount) || 0; m.set(k, e); }
    const hasAmt = t.columns.includes("amount");
    const list = [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 40);
    return json({ table: name, grouped: true, columns: hasAmt ? [group, "records", "total_amount"] : [group, "records"], total: m.size, page: 0, size: 40, rows: list.map(([k, e]) => (hasAmt ? [k, e.n, e.sum] : [k, e.n])), facets });
  }

  const sort = g("sort");
  if (sort && t.columns.includes(sort)) { const d = g("dir") === "desc" ? -1 : 1; rows = rows.slice().sort((a, b) => d * cmp(a[sort], b[sort])); }
  const page = Math.max(0, Number(g("page")) || 0);
  const size = 25;
  return json({ table: name, columns: t.columns, total: rows.length, page, size, rows: rows.slice(page * size, page * size + size).map((x) => t.columns.map((c) => x[c])), facets });
}
