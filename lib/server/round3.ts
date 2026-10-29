import "server-only";
import { tables, inr, inrShort } from "./datasets";
import { runSQL, Result, AnalysisError } from "./engine";
import type { R3 } from "./store";

/* Round 3: students write complete SELECT queries. Every query runs against the real tables; checking compares the
 * team's own result with the result of the organiser's reference query. No keyword matching, no canned output. */
export const PERMITTED = ["transactions", "account_registry", "company_connections"];
export const QUESTIONS = [
  { id: "q1", label: "Question 1", title: "Which companies own the accounts?", tables: ["account_registry"],
    scenario: "Your team identified four receiving accounts in Round 2: ACC9001, ACC9002, ACC9003 and ACC9004.\n\nThe bank’s account_registry table contains their ownership details.\n\nWrite a query to display account_id, account_holder and branch for these four accounts only. Arrange the results in ascending order of account_id.\n\nUse account_id to select the four account records.",
    hint: "Choose the requested columns. Use WHERE with IN to select the four account IDs, then ORDER BY to arrange them.", after: null as string | null, needs: [] as string[] },
  { id: "q2", label: "Question 2", title: "Who is connected to these companies?", tables: ["company_connections"],
    scenario: "The account records identify RK Holdings Pvt Ltd and Iyer Traders.\n\nInvestigators digitized the recovered director and proprietor documents into company_connections.\n\nWrite a query to display company_name, person_name and role for these two companies only. Arrange the results alphabetically by company_name.\n\nCompare the output with the recovered documents.",
    hint: "Retrieve the requested columns. Filter company_name to the two companies using WHERE and IN.", after: null, needs: ["q1"] },
  { id: "q3a", label: "Question 3 · Task A", title: "RK Holdings", tables: ["transactions"],
    scenario: "RK Holdings Pvt Ltd owns ACC9001 and ACC9002.\n\nAdd the amount values for all payments received by these two accounts. Return one combined total named total_received.",
    hint: "Use SUM(amount), filter receiver_account to the relevant accounts and name the result using AS.", after: null, needs: ["q2"] },
  { id: "q3b", label: "Question 3 · Task B", title: "Iyer Traders", tables: ["transactions"],
    scenario: "Iyer Traders owns ACC9003 and ACC9004.\n\nAdd the amount values for all payments received by these two accounts. Return one combined total named total_received.",
    hint: "Use SUM(amount), filter receiver_account to the relevant accounts and name the result using AS.", after: null, needs: ["q2"] },
];
/* Organiser reference solutions: server-only. Their results are what a team's own query is compared against. */
const REFERENCE: Record<string, string> = {
  q1: "SELECT account_id, account_holder, branch FROM account_registry WHERE account_id IN ('ACC9001', 'ACC9002', 'ACC9003', 'ACC9004') ORDER BY account_id ASC",
  q2: "SELECT company_name, person_name, role FROM company_connections WHERE company_name IN ('RK Holdings Pvt Ltd', 'Iyer Traders') ORDER BY company_name ASC",
  q3a: "SELECT SUM(amount) AS total_received FROM transactions WHERE receiver_account IN ('ACC9001', 'ACC9002')",
  q3b: "SELECT SUM(amount) AS total_received FROM transactions WHERE receiver_account IN ('ACC9003', 'ACC9004')",
};

export function execute(sql: string): Result | { error: string } {
  const q = String(sql ?? "").trim();
  if (!q) return { error: "Write a query first." };
  if (q.length > 1500) return { error: "Query too long." };
  if (!/^select\b/i.test(q)) return { error: "Only SELECT queries can be run here. The database is read-only." };
  if (/;\s*\S/.test(q)) return { error: "Run one query at a time." };
  const m = /\bfrom\s+([A-Za-z_]\w*)/i.exec(q);
  if (!m) return { error: "Missing FROM clause: which table should the query read?" };
  const name = m[1].toLowerCase();
  if (!PERMITTED.includes(name)) return { error: `No table named ${m[1]}. Available: ${PERMITTED.join(", ")}.` };
  if (/\bjoin\b/i.test(q) || /\(\s*select\b/i.test(q)) return { error: "Joins and subqueries are not needed for this round." };
  try { return runSQL(q.replace(/;\s*$/, ""), tables()[name]); }
  catch (e) { return { error: e instanceof AnalysisError ? e.message : "That query could not run." }; }
}

const same = (a: Result, b: Result) => a.kind === "table" && b.kind === "table"
  && a.columns.length === b.columns.length && a.columns.every((c, i) => c.toLowerCase() === b.columns[i].toLowerCase())
  && a.rows.length === b.rows.length && a.rows.every((r, i) => r.every((v, j) => v === b.rows[i][j]));

export function check(id: string, sql: string): { ok: boolean; message: string; result?: Result } {
  const r = execute(sql);
  if ("error" in r) return { ok: false, message: r.error };
  const ref = execute(REFERENCE[id]) as Result;
  /* the stored order can match by accident, so where an order is requested the query must ask for it */
  if ((id === "q1" || id === "q2") && !/\border\s+by\b/i.test(sql)) return { ok: false, message: "Arrange the results as the question asks, using ORDER BY.", result: r };
  if (same(r, ref)) return { ok: true, message: "Result verified against the database.", result: r };
  if (r.kind !== "table") return { ok: false, message: "The query did not return a table.", result: r };
  const wantCols = (ref as { columns: string[] }).columns;
  if (r.columns.map((c) => c.toLowerCase()).join() !== wantCols.join()) return { ok: false, message: `The result should have exactly these columns, in this order: ${wantCols.join(", ")}.`, result: r };
  if (r.rows.length !== (ref as { rows: unknown[] }).rows.length) return { ok: false, message: "The columns are right, but the number of rows is not. Check your filter.", result: r };
  return { ok: false, message: id.startsWith("q3") ? "The total does not match the payments received by these two accounts. Check the filter." : "The rows are not right yet. Check the filter and the requested order.", result: r };
}

export const unlocked = (r: R3 | undefined, id: string) => (QUESTIONS.find((q) => q.id === id)?.needs ?? []).every((n) => r?.q?.[n]?.ok);
export const sqlDone = (r: R3 | undefined) => !!(r?.q?.q3a?.ok && r?.q?.q3b?.ok);

/* Evidence summary and visual sections are built only from questions the team has verified. */
export function round3View(r: R3 | undefined, complete: boolean) {
  const ok = (id: string) => complete || !!r?.q?.[id]?.ok;
  const T = tables();
  const total = (accs: string[]) => T.transactions.rows.filter((x) => accs.includes(String(x.receiver_account))).reduce((s, x) => s + Number(x.amount), 0);
  const companies = [
    { accounts: ["ACC9001", "ACC9002"], company: "RK Holdings Pvt Ltd", person: "Ranveer K.", short: "RANVEER", task: "q3a" },
    { accounts: ["ACC9003", "ACC9004"], company: "Iyer Traders", person: "Meera Iyer", short: "MEERA", task: "q3b" },
  ];
  const summary = companies.map((c) => ({
    accounts: c.accounts.join(", "),
    company: ok("q1") ? c.company : null,
    person: ok("q2") ? c.person : null,
    total: ok(c.task) ? { full: inr(total(c.accounts)), short: inrShort(total(c.accounts)) } : null,
  }));
  const visuals = ok("q3a") && ok("q3b") ? companies.map((c) => ({ company: c.company, person: c.short, total: total(c.accounts), full: inr(total(c.accounts)), short: inrShort(total(c.accounts)) })) : null;
  return {
    tables: PERMITTED,
    questions: QUESTIONS.map((q) => ({ id: q.id, label: q.label, title: q.title, scenario: q.scenario, hint: q.hint, tables: q.tables,
      draft: r?.q?.[q.id]?.draft ?? "", ok: ok(q.id), open: complete || unlocked(r, q.id), out: r?.q?.[q.id]?.ok ? r.q[q.id].out ?? null : null })),
    lifted: complete ? ["acc-rk", "acc-iy", "dir-rk", "dir-iy"] : r?.lifted ?? [],
    summary, visuals, sqlDone: complete || sqlDone(r),
  };
}

/* organiser guide only */
export const round3Guide = () => QUESTIONS.map((q) => ({ id: q.id, label: q.label, title: q.title, sql: REFERENCE[q.id], result: (() => { const r = execute(REFERENCE[q.id]); return "error" in r || r.kind !== "table" ? "" : r.rows.map((x) => x.join(" | ")).join("\n"); })() }));
