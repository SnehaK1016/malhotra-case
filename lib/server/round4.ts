import "server-only";
import { tables, inr, inrShort } from "./datasets";
import type { Row } from "./engine";

/* Round 4: four fill-in-the-blank pandas filters. Student input is never executed: each blank is parsed as a
 * Python literal, checked on its own, and the fixed filter for that question is applied to the real table. */

const INCIDENT_DATE = "2026-03-14";
const LOG_COLS = ["log_date", "login_time", "employee_id", "action", "access_point", "status"];
const TX_COLS = ["transaction_id", "date", "time", "sender_account", "receiver_account", "amount", "reference", "initiated_by"];

type Q = {
  n: number; frame: "access_logs" | "case_day" | "transactions"; op: ">=" | "==";
  scenario: string; question: string; template: string[]; dfNote: string; after: string;
};
/* Student-facing question text. The answers live separately in ANSWERS below and are never sent. */
export const QUESTIONS: Q[] = [
  {
    n: 1, frame: "access_logs", op: ">=",
    scenario: "The security team wants to find employees who accessed company systems at or after 8:00 PM.",
    question: "Filter the access logs to display records where the hour is 20 or greater.",
    template: ["df[df[", "] >= ", "]"],
    dfNote: "df is the access-log dataframe. Its hour column holds the login hour (0 to 23).",
    after: "After-hours activity isolated. Several people stayed late across three nights, so lateness alone proves nothing.",
  },
  {
    n: 2, frame: "access_logs", op: "==",
    scenario: "Investigators know that the incident occurred on March 14, 2026.",
    question: "Filter the access logs to display records from March 14, 2026 only.",
    template: ["case_day = df[df[", "] == ", "]"],
    dfNote: "This filters the full access-log dataframe by date, not the after-hours result. It is an incident-date view.",
    after: "Every other date has been set aside. These are all access-log records from the day of the incident.",
  },
  {
    n: 3, frame: "case_day", op: "==",
    scenario: "Investigators want to examine activity at terminal TRSY-T07.",
    question: "Filter the incident-date records to display only entries where the access point is TRSY-T07.",
    template: ["terminal_logs = case_day[\n    case_day[", "] == ", "\n]"],
    dfNote: "case_day is the incident-date result from Question 2.",
    after: "Two employees used the same terminal within minutes: EMP_001 at 21:41 and EMP_002 at 21:47. Both records matter, but using a terminal does not, on its own, prove wrongdoing.",
  },
  {
    n: 4, frame: "transactions", op: "==",
    scenario: "Investigators have identified a treasury payment worth ₹25,00,000 and want to locate its transaction record.",
    question: "Filter the transaction dataset to display the transaction whose amount equals ₹25,00,000.",
    template: ["result = df[df[", "] == ", "]"],
    dfNote: "From this question on, df refers to the transaction dataframe, not the access logs.",
    after: "The payment is on the ledger: ₹25,00,000 to ACC7710, initiated under EMP_002 at 21:47 on 14 March. It is a separate incident record from the ₹50 crore four-account pattern.",
  },
];
const ANSWERS: Record<number, [string, string | number]> = {
  1: ["hour", 20],
  2: ["log_date", INCIDENT_DATE],
  3: ["access_point", "TRSY-T07"],
  4: ["amount", 2_500_000],
};

/* ---------- parsing a blank as a Python literal ---------- */
type Lit = { ok: true; kind: "str" | "num"; value: string | number } | { ok: false };
export function literal(raw: unknown): Lit {
  const t = String(raw ?? "").trim().slice(0, 60);
  const q = /^(["'])(.*)\1$/.exec(t);
  if (q) return { ok: true, kind: "str", value: q[2] };
  if (/^-?\d+(_\d+)*(\.\d+)?$/.test(t)) return { ok: true, kind: "num", value: Number(t.replace(/_/g, "")) };
  return { ok: false };
}

function frameRows(frame: Q["frame"]): { rows: Row[]; columns: string[] } {
  const T = tables();
  if (frame === "transactions") return { rows: T.transactions.rows, columns: T.transactions.columns };
  const logs = T.access_logs;
  if (frame === "case_day") return { rows: logs.rows.filter((r) => r.log_date === INCIDENT_DATE), columns: logs.columns };
  return { rows: logs.rows, columns: logs.columns };
}

export type BlankCheck = { ok: boolean; note?: string };
export type QResult = { columns: string[]; rows: (string | number | null)[][]; total: number; before: number; error?: string };

/* Applies the question's fixed filter with the student's (parsed) column and value: what their code would show. */
function run(q: Q, col: Lit, val: Lit): QResult {
  const { rows, columns } = frameRows(q.frame);
  const view = q.frame === "transactions" ? TX_COLS : LOG_COLS;
  const empty = (error: string): QResult => ({ columns: view, rows: [], total: 0, before: rows.length, error });
  if (!col.ok || col.kind !== "str") return empty("A column name must be written as text in quotes, for example \"name\".");
  if (!columns.includes(String(col.value))) return empty(`KeyError: '${col.value}'. There is no column with that name.`);
  if (!val.ok) return empty("The value is not valid Python. Text needs quotes; numbers do not.");
  const c = String(col.value);
  const hit = rows.filter((r) => {
    const x = r[c];
    if (x === null || x === undefined) return false;
    if (q.op === ">=") return typeof x === "number" && val.kind === "num" ? x >= Number(val.value) : false;
    return typeof x === "number" ? val.kind === "num" && x === val.value : val.kind === "str" && String(x) === val.value;
  });
  const shown = view.includes(c) ? view : [...view, c];
  return { columns: shown, rows: hit.slice(0, 60).map((r) => shown.map((k) => (r[k] ?? null) as string | number | null)), total: hit.length, before: rows.length };
}

export function check(n: number, blanks: unknown[]): { blanks: BlankCheck[]; correct: boolean; result: QResult } | null {
  const q = QUESTIONS.find((x) => x.n === n);
  if (!q) return null;
  const [ac, av] = ANSWERS[n];
  const col = literal(blanks[0]), val = literal(blanks[1]);
  const b1: BlankCheck = col.ok && col.kind === "str" && col.value === ac ? { ok: true }
    : !col.ok && String(blanks[0] ?? "").trim() === ac ? { ok: false, note: "Right column, but a column name goes inside quotes." }
    : { ok: false };
  const wantNum = typeof av === "number";
  const b2: BlankCheck = val.ok && (wantNum ? val.kind === "num" && val.value === av : val.kind === "str" && val.value === av) ? { ok: true }
    : wantNum && val.ok && val.kind === "str" && Number(val.value) === av ? { ok: false, note: "This column holds numbers, so the value should not be in quotes." }
    : !wantNum && !val.ok && String(blanks[1] ?? "").trim() === av ? { ok: false, note: "Text values go inside quotes." }
    : { ok: false };
  return { blanks: [b1, b2], correct: b1.ok && b2.ok, result: run(q, col, val) };
}

/* The canonical result of a solved question, recomputed from the data when a team reloads the page. */
export const solvedResult = (n: number) => run(QUESTIONS[n - 1], { ok: true, kind: "str", value: ANSWERS[n][0] }, typeof ANSWERS[n][1] === "number" ? { ok: true, kind: "num", value: ANSWERS[n][1] } : { ok: true, kind: "str", value: ANSWERS[n][1] });

/* Evidence visible before the questions: the incident-day log and the matching transaction, read from the datasets. */
export function incidentEvidence() {
  const T = tables();
  const day = T.access_logs.rows.filter((r) => r.log_date === INCIDENT_DATE).sort((a, b) => String(a.login_time).localeCompare(String(b.login_time)));
  const critical = day.find((r) => r.action === "TRANSFER_APPROVE" && r.status === "DELEGATED_SESSION")!;
  /* the session on the same terminal immediately before the critical one (21:41), not an earlier routine visit */
  const before = day.filter((r) => r.access_point === critical.access_point && r.employee_id !== critical.employee_id && String(r.login_time) < String(critical.login_time)).pop()!;
  const tx = T.transactions.rows.find((r) => r.transaction_id === critical.transaction_id)!;
  return {
    date: INCIDENT_DATE,
    log: day.map((r) => ({ time: String(r.login_time), employee: String(r.employee_id), action: String(r.action), point: String(r.access_point), result: String(r.status), key: r === critical || r === before })),
    card: { time: String(critical.login_time), amount: Number(tx.amount), amountText: inr(Number(tx.amount)), employee: String(critical.employee_id), related: String(before.employee_id), relatedTime: String(before.login_time), terminal: String(critical.access_point), receiver: String(tx.receiver_account), reference: String(tx.reference), transaction_id: String(tx.transaction_id) },
    columns: { access_logs: T.access_logs.columns, transactions: T.transactions.columns },
  };
}

/* The reconstruction of the earlier verified trail: computed from the transaction records, grouped by real sender and receiver. */
export function financialFlow() {
  const T = tables();
  const holder = new Map(T.account_registry.rows.map((r) => [String(r.account_id), String(r.account_holder)]));
  const dest = ["ACC9001", "ACC9002", "ACC9003", "ACC9004"];
  const m = new Map<string, { from: string; to: string; count: number; total: number }>();
  for (const r of T.transactions.rows) {
    const to = String(r.receiver_account);
    if (!dest.includes(to)) continue;
    const key = `${r.sender_account}>${to}`;
    const e = m.get(key) ?? { from: String(r.sender_account), to, count: 0, total: 0 };
    e.count++; e.total += Number(r.amount); m.set(key, e);
  }
  const links = [...m.values()].sort((a, b) => a.to.localeCompare(b.to)).map((l) => ({ ...l, totalText: inr(l.total), short: inrShort(l.total), holder: holder.get(l.to) ?? "" }));
  const sources = [...new Set(links.map((l) => l.from))].map((id) => ({ id, holder: holder.get(id) ?? "" }));
  const grand = links.reduce((s, l) => s + l.total, 0);
  return { sources, links, total: grand, totalText: inr(grand), short: inrShort(grand), transfers: links.reduce((s, l) => s + l.count, 0) };
}

export function round4View(done: number) {
  return {
    done,
    questions: QUESTIONS.map((q) => ({ n: q.n, scenario: q.scenario, question: q.question, template: q.template, dfNote: q.dfNote, frame: q.frame })),
    results: QUESTIONS.filter((q) => q.n <= done).map((q) => ({ n: q.n, result: solvedResult(q.n), after: q.after, answer: ANSWERS[q.n].map((v) => (typeof v === "number" ? String(v) : `"${v}"`)) })),
    flow: done >= 4 ? financialFlow() : null,
    evidence: incidentEvidence(),
  };
}
export const afterText = (n: number) => QUESTIONS[n - 1]?.after ?? "";
export const answerText = (n: number) => ANSWERS[n].map((v) => (typeof v === "number" ? String(v) : `"${v}"`));
