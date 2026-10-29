import "server-only";
import { tables } from "./datasets";

export type ChartData = { id: string; title: string; type: "bar" | "line"; labels: string[]; series: { name: string; values: number[] }[]; unit?: string; note?: string };

export function chart(id: string): ChartData | null {
  const T = tables();
  switch (id) {
    case "txn_by_hour": {
      const hrs = Array.from({ length: 15 }, (_, i) => 9 + i);
      const c = (h: number) => T.transactions.rows.filter((r) => r.hour === h).length;
      return { id, title: "Transactions by hour of day", type: "bar", labels: hrs.map((h) => `${String(h).padStart(2, "0")}h`), series: [{ name: "Transactions", values: hrs.map(c) }], note: "All 1,000 transfers in the export." };
    }
    case "receiver_counts": {
      const m = new Map<string, number>();
      for (const r of T.transactions.rows) m.set(String(r.receiver_account), (m.get(String(r.receiver_account)) ?? 0) + 1);
      const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      return { id, title: "Transfers per receiving account (top 10)", type: "bar", labels: top.map((t) => t[0]), series: [{ name: "Transfers received", values: top.map((t) => t[1]) }] };
    }
    case "access_activity": {
      const ids = [...new Set(T.access_logs.rows.map((r) => String(r.employee_id)))].sort();
      const c = (e: string) => T.access_logs.rows.filter((r) => r.employee_id === e && Number(r.hour) >= 19).length;
      return { id, title: "Events after 19:00 by employee (all three days)", type: "bar", labels: ids, series: [{ name: "Events", values: ids.map(c) }] };
    }
    case "cctv_timeline": {
      const b = new Map<string, number>();
      for (const r of T.timeline.rows) b.set(String(r.bucket), (b.get(String(r.bucket)) ?? 0) + 1);
      const e = [...b.entries()].sort((a, c) => a[0].localeCompare(c[0]));
      return { id, title: "Events per 10-minute bucket, 14 March", type: "bar", labels: e.map((x) => x[0]), series: [{ name: "Events", values: e.map((x) => x[1]) }], note: "CCTV, badge and system events combined." };
    }
  }
  return null;
}
