"use client";
import { useCallback, useEffect, useState } from "react";

export type RoundStatus = "locked" | "active" | "complete";
export type CaseState = {
  team: { code: string; name: string };
  progress: { current_round: number; completed: boolean[]; final_complete: boolean; hints_used: number; penalty: number; wrong_attempts: number; started_at: string | null; completed_at: string | null };
  clock: { elapsed_ms: number; running: boolean };
  rounds: { n: number; title: string; code: string; tagline: string; status: RoundStatus; room: string | null }[];
  handoff: Handoff | null;
  score: number | null;
  now: string;
};
export type Handoff = {
  round: number; kind: "cups" | "mirror" | "robot" | "grid"; title: string; heading: string; subtitle: string;
  hint: string | null; solved: boolean; destination: string | null; success: string | null; message: string | null;
};
export type QResult = { columns: string[]; rows: Cell[][]; total: number; before: number; error?: string };
export type Flow = { sources: { id: string; holder: string }[]; links: { from: string; to: string; count: number; total: number; totalText: string; short: string; holder: string }[]; total: number; totalText: string; short: string; transfers: number };
export type R4View = {
  done: number;
  questions: { n: number; scenario: string; question: string; template: string[]; dfNote: string; frame: string }[];
  results: { n: number; result: QResult; after: string; answer: string[] }[];
  flow: Flow | null;
  evidence: {
    date: string;
    log: { time: string; employee: string; action: string; point: string; result: string; key: boolean }[];
    card: { time: string; amount: number; amountText: string; employee: string; related: string; relatedTime: string; terminal: string; receiver: string; reference: string; transaction_id: string };
    columns: { access_logs: string[]; transactions: string[] };
  };
};
export type FinaleStep = "open" | "restore" | "inspect" | "reference" | "comparison" | "statement" | "verdict" | "unlock";
export type Finale = {
  drafts?: Record<string, any>;
  steps: Record<FinaleStep, boolean>;
  profiles: { id: string; name: string; role: string; blood: string; ref: string }[];
  classification: { abo: string; rh: string; short: string } | null;
  reference: { ref: string; person: string } | null;
  comparison: { evidence: string; reference: string; person: string; result: string; note: string; markers: string[][] } | null;
  statement: { ref: string; title: string; body: string[]; signed: string } | null;
  lockKey: { group: string[][]; sign: string[][] } | null;
  journal: { group: string; items: string[] }[];
  final: { team: string; activeMs: number; score: number | null; room: string; message: string; lines: string[] } | null;
  messages: { restoreOk: string | null; referenceOk: string | null };
};
export type Field = { key: string; label: string; type: "text" | "select" | "tags" | "time"; options?: string[]; placeholder?: string; help?: string };
export type Lead = { id: string; title: string; table: string; kind: "python" | "sql" | "fn"; code: string };
export type RoundPublic = {
  n: number; code: string; title: string; tagline: string; tables: string[]; charts: { id: string; label: string }[]; modes: ("sql" | "python")[];
  starterSql: string; starterPy: string; fields: Field[]; hintCount: number; leads: Lead[]; evidence: any;
};
export type Recap = { stream: string; items: string[] }[];
export type RoundPayload = { drafts?: Record<string, any>; round: RoundPublic; complete: boolean; hints: { no: number; text: string; cost: number }[]; nextHintCost: number | null; lines: string[] | null; recap: Recap | null; r1?: unknown; r2?: unknown; r3?: unknown; r4?: R4View; finale?: Finale };
export type Cell = string | number | null;
export type Result = { kind: "table"; columns: string[]; rows: Cell[][]; total: number; note?: string } | { kind: "text"; text: string };
export type ChartData = { id: string; title: string; type: "bar" | "line"; labels: string[]; series: { name: string; values: number[] }[]; unit?: string; note?: string };

export async function api<T = any>(url: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const res = await fetch(url, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Network problem. Check your connection and try again." } as T };
  }
}

export function go(href: string, label?: string) {
  window.dispatchEvent(new CustomEvent("mc:go", { detail: { href, label } }));
}

export function useCaseState() {
  const [state, setState] = useState<CaseState | null>(null);
  const [offset, setOffset] = useState(0);
  const refresh = useCallback(async () => {
    const r = await api<CaseState>("/api/state");
    if (r.status === 401) { go("/access"); return null; }
    if (r.ok) { setState(r.data); setOffset(Date.parse(r.data.now) - Date.now()); }
    return r.ok ? r.data : null;
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { state, setState, refresh, offset };
}

export const pad2 = (n: number) => String(n).padStart(2, "0");
export function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`;
}
