import "server-only";
import type { Row, Table } from "./engine";

/* Deterministic fictional datasets, generated on the server only. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];
function shuffle<T>(r: () => number, a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
const hm = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
export const inrShort = (n: number) => (n >= 1e7 ? `₹${+(n / 1e7).toFixed(2)} Crore` : `₹${+(n / 1e5).toFixed(2)} Lakh`);

/* ---------------- Transactions (Rounds 2, 3, 4) ---------------- */
let specialTxn = "";
function buildTransactions(): Table {
  const r = rng(90210);
  const rows: Row[] = [];
  const add = (o: Partial<Row> & { date: string; time: string; receiver_account: string; amount: number }) =>
    rows.push({ transaction_id: "", hour: Number(o.time.slice(0, 2)), sender_account: "ACC0001", transaction_type: "NEFT", reference: "", initiated_by: "SYS_AUTO", ...o });

  // 501 transfers that share a pattern: late, repeated amounts, four destination accounts
  const rk = shuffle(r, [...Array(106).fill(1_000_000), ...Array(170).fill(1_200_000), ...Array(100).fill(1_400_000)]) as number[];
  const iy = shuffle(r, [...Array(30).fill(300_000), ...Array(65).fill(400_000), ...Array(30).fill(500_000)]) as number[];
  const recv = [...Array(188).fill("ACC9001"), ...Array(188).fill("ACC9002"), ...Array(63).fill("ACC9003"), ...Array(62).fill("ACC9004")] as string[];
  const amts = [...rk, ...iy];
  for (let i = 0; i < 501; i++) {
    const day = 10 + Math.floor(r() * 5);
    const hour = r() < 0.15 ? 23 : 20 + Math.floor(r() * 3);
    const rkSide = i < 376;
    add({
      date: `2026-03-${pad(day)}`, time: `${pad(hour)}:${pad(Math.floor(r() * 60))}`, receiver_account: recv[i], amount: amts[i],
      transaction_type: pick(r, ["RTGS", "RTGS", "NEFT"]),
      reference: pick(r, rkSide ? ["Advisory retainer", "Project mobilisation"] : ["Logistics settlement", "Consultancy fee"]),
      initiated_by: "TREASURY_BATCH",
    });
  }
  // 498 routine payments
  const refs = ["Invoice settlement", "Vendor payment", "Utilities", "Courier charges", "Maintenance contract", "Travel reimbursement", "Stationery order", "Software licence"];
  for (let i = 0; i < 498; i++) {
    add({
      date: `2026-03-${pad(10 + Math.floor(r() * 5))}`, time: `${pad(9 + Math.floor(r() * 9))}:${pad(Math.floor(r() * 60))}`,
      receiver_account: `ACC${2001 + Math.floor(r() * 60)}`,
      amount: 4000 + Math.floor(r() * 39600) * 10 + 1 + Math.floor(r() * 9),
      transaction_type: pick(r, ["NEFT", "UPI", "IMPS", "NEFT", "RTGS"]),
      reference: pick(r, refs),
      initiated_by: pick(r, ["EMP_004", "EMP_004", "EMP_006", "EMP_001", "SYS_AUTO"]),
    });
  }
  // the one treasury release on the night itself
  add({ date: "2026-03-14", time: "21:47", receiver_account: "ACC7710", amount: 2_500_000, transaction_type: "RTGS", reference: "Treasury release, sign-off pending", initiated_by: "EMP_002" });
  rows.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  rows.forEach((row, i) => { row.transaction_id = `TX${pad(i + 1, 4)}`; if (row.amount === 2_500_000) specialTxn = String(row.transaction_id); });
  return { name: "transactions", columns: ["transaction_id", "date", "time", "hour", "sender_account", "receiver_account", "amount", "transaction_type", "reference", "initiated_by"], rows };
}

/* ---------------- Access logs (Round 4) ---------------- */
export const EMPLOYEES: Record<string, string> = {
  EMP_001: "Finance Controller", EMP_002: "Treasury Analyst", EMP_003: "Internal Audit", EMP_004: "Accounts Payable",
  EMP_005: "IT Administrator", EMP_006: "Procurement", EMP_007: "Legal Counsel", EMP_008: "Facilities",
};
function buildAccessLogs(txns: Table): Table {
  const r = rng(4417);
  const rows: Row[] = [];
  const ids = Object.keys(EMPLOYEES);
  const terminal = (e: string) => (e === "EMP_001" ? "TRSY-T07" : e === "EMP_002" ? "TRSY-T03" : `FL11-T0${ids.indexOf(e) + 1}`);
  const add = (log_date: string, e: string, inMin: number, outMin: number, system: string, access_point: string, action: string, extra: Partial<Row> = {}) =>
    rows.push({ log_date, employee_id: e, login_time: hm(inMin), logout_time: hm(outMin), hour: Math.floor(inMin / 60), system, access_point, action, transaction_id: null, amount: null, status: "SUCCESS", ...extra });
  for (const d of ["2026-03-12", "2026-03-13", "2026-03-14"]) {
    for (const e of ids) {
      add(d, e, 500 + Math.floor(r() * 80), 1030 + Math.floor(r() * 80), "BADGE_SYSTEM", "HQ-GATE-B", "DOOR_ENTRY");
      const n = 2 + Math.floor(r() * 2);
      for (let k = 0; k < n; k++) {
        const s = 540 + Math.floor(r() * 400);
        add(d, e, s, s + 10 + Math.floor(r() * 80), pick(r, ["ERP_LEDGER", "DOC_VAULT", "TREASURY_PORTAL", "HR_PORTAL"]), terminal(e), pick(r, ["FILE_ACCESS", "REPORT_EXPORT", "LEDGER_VIEW"]), { status: r() < 0.05 ? "FAILED" : "SUCCESS" });
      }
    }
  }
  // routine approvals that match real routine payments
  const cands = txns.rows.filter((t) => String(t.initiated_by).startsWith("EMP_") && Number(t.hour) >= 9 && Number(t.hour) <= 16).slice(0, 400);
  for (let k = 0; k < 14; k++) {
    const t = cands[Math.floor(r() * cands.length)];
    const [h, m] = String(t.time).split(":").map(Number);
    add(String(t.date), String(t.initiated_by), h * 60 + m, h * 60 + m + 6, "TREASURY_PORTAL", terminal(String(t.initiated_by)), "TRANSFER_APPROVE", { transaction_id: t.transaction_id, amount: t.amount });
  }
  // after-hours noise that is harmless
  add("2026-03-12", "EMP_005", 21 * 60 + 47, 21 * 60 + 49, "ERP_LEDGER", "FL11-T05", "LEDGER_VIEW", { status: "FAILED" });
  add("2026-03-13", "EMP_003", 22 * 60 + 15, 22 * 60 + 52, "DOC_VAULT", "FL11-T03", "FILE_ACCESS");
  add("2026-03-12", "EMP_004", 20 * 60 + 30, 20 * 60 + 58, "BADGE_SYSTEM", "HQ-GATE-B", "DOOR_ENTRY");
  add("2026-03-13", "EMP_006", 20 * 60 + 10, 20 * 60 + 41, "ERP_LEDGER", "FL11-T06", "REPORT_EXPORT");
  // case night
  add("2026-03-14", "EMP_002", 21 * 60 + 40, 22 * 60 + 2, "BADGE_SYSTEM", "HQ-GATE-B", "DOOR_ENTRY");
  add("2026-03-14", "EMP_001", 21 * 60 + 41, 21 * 60 + 52, "TREASURY_PORTAL", "TRSY-T07", "LEDGER_VIEW");
  add("2026-03-14", "EMP_002", 21 * 60 + 47, 21 * 60 + 53, "TREASURY_PORTAL", "TRSY-T07", "TRANSFER_APPROVE", { transaction_id: specialTxn, amount: 2_500_000, status: "DELEGATED_SESSION" });
  rows.sort((a, b) => `${a.log_date} ${a.login_time}`.localeCompare(`${b.log_date} ${b.login_time}`));
  return { name: "access_logs", columns: ["log_date", "employee_id", "login_time", "logout_time", "hour", "system", "access_point", "action", "transaction_id", "amount", "status"], rows };
}

/* ---------------- Account registry (Round 3) ---------------- */
function buildRegistry(): Table {
  const r = rng(77);
  const rows: Row[] = [];
  const add = (account_id: string, account_holder: string, account_type: string, branch: string, opened_on: string) => rows.push({ account_id, account_holder, account_type, branch, opened_on, status: "ACTIVE" });
  add("ACC0001", "Malhotra Industries Ltd", "Corporate current (operating)", "Nariman Point", "2009-06-15");
  add("ACC0002", "Malhotra Industries Ltd", "Corporate current (payroll)", "Nariman Point", "2009-06-15");
  add("ACC7710", "Malhotra Industries Ltd", "Internal treasury release", "Nariman Point", "2018-02-01");
  add("ACC9001", "RK Holdings Pvt Ltd", "Current", "Lower Parel", "2025-12-09");
  add("ACC9002", "RK Holdings Pvt Ltd", "Current", "Lower Parel", "2025-12-09");
  add("ACC9003", "Iyer Traders", "Current (proprietorship)", "Dadar", "2025-11-21");
  add("ACC9004", "Iyer Traders", "Current (proprietorship)", "Dadar", "2025-11-21");
  const names = ["Apex Stationers", "Metro Logistics", "BlueLeaf Catering", "Kestrel IT Services", "Sundaram Power", "Primo Facilities", "Atlas Couriers", "Greenfield Travel", "Orion Printing", "Linden Legal", "Sahyadri Packaging", "Veda Office Systems"];
  for (let i = 0; i < 60; i++) add(`ACC${2001 + i}`, `${names[i % names.length]}${i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ""}`, "Current", pick(r, ["Andheri", "Powai", "Thane", "Fort", "Bandra"]), `20${pad(10 + Math.floor(r() * 13))}-${pad(1 + Math.floor(r() * 12))}-${pad(1 + Math.floor(r() * 27))}`);
  return { name: "account_registry", columns: ["account_id", "account_holder", "account_type", "branch", "opened_on", "status"], rows };
}

/* ---------------- Case-night event log (Round 5) ---------------- */
function buildTimeline(): Table {
  const r = rng(2147);
  const rows: Row[] = [];
  const mk = (h: number, m: number, s: number, source: string, location: string, tag: string, detail: string) =>
    rows.push({ event_id: "", ts: `${pad(h)}:${pad(m)}:${pad(s)}`, hour: h, minute: m, bucket: `${pad(h)}:${pad(Math.floor(m / 10) * 10)}`, source, location, tag, detail });
  const counts: Record<string, number> = { "19:00": 3, "19:10": 2, "19:20": 4, "19:30": 3, "19:40": 3, "19:50": 4, "20:00": 3, "20:10": 4, "20:20": 5, "20:30": 4, "20:40": 6, "20:50": 5, "21:00": 6, "21:10": 7, "21:20": 8, "21:30": 11 };
  const routine: [string, string, string][] = [["CCTV", "CAM 01 Lobby", "motion"], ["CCTV", "CAM 03 Parking", "vehicle movement"], ["BADGE", "Gate B", "badge-out"], ["CCTV", "CAM 03 Parking", "vehicle exit"], ["BADGE", "Floor 11 door", "badge-in"], ["CCTV", "CAM 01 Lobby", "motion"]];
  for (const [b, n] of Object.entries(counts)) {
    const [h, m0] = b.split(":").map(Number);
    for (let i = 0; i < n; i++) { const [src, loc, tag] = pick(r, routine); mk(h, m0 + Math.floor(r() * 10), Math.floor(r() * 60), src, loc, tag, `${tag} recorded`); }
  }
  mk(21, 40, 12, "BADGE", "Gate B", "EMP_002", "badge-in after hours");
  mk(21, 40, 51, "CCTV", "CAM 01 Lobby", "EMP_002", "person crosses lobby toward lifts");
  mk(21, 41, 3, "CCTV", "CAM 02 Executive Corridor", "unidentified", "figure enters corridor");
  mk(21, 42, 20, "BADGE", "Floor 12 door", "EMP_002", "badge-in");
  mk(21, 43, 30, "CCTV", "CAM 02 Executive Corridor", "EMP_001", "seated at terminal bay, screen unlocked");
  mk(21, 44, 20, "CCTV", "CAM 02 Executive Corridor", "partial badge", "badge partly visible");
  mk(21, 45, 5, "SYSTEM", "TREASURY_PORTAL", "EMP_001", "session extended");
  mk(21, 46, 10, "CCTV", "CAM 04 Lift", "lift", "lift doors open on floor 12");
  mk(21, 47, 5, "SYSTEM", "TREASURY_PORTAL", "EMP_002", "login with delegated session");
  mk(21, 47, 8, "CCTV", "CAM 02 Executive Corridor", "EMP_002", "terminal glow, activity at bay");
  mk(21, 48, 10, "SYSTEM", "TREASURY_PORTAL", "EMP_002", "transfer authorisation submitted");
  mk(21, 49, 2, "CCTV", "CAM 02 Executive Corridor", "unknown", "executive suite door opens");
  mk(21, 49, 30, "CCTV", "CAM 02 Executive Corridor", "figure", "person leaves executive area");
  const extra = 34 - rows.filter((x) => x.bucket === "21:40").length;
  for (let i = 0; i < extra; i++) { const [src, loc, tag] = pick(r, routine); mk(21, 40 + Math.floor(r() * 10), Math.floor(r() * 60), src, loc, tag, `${tag} recorded`); }
  mk(21, 51, 30, "CCTV", "CAM 05 Rear Exit", "motion", "motion recorded");
  mk(21, 52, 10, "BADGE", "Gate B", "badge-out", "badge-out");
  rows.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  rows.forEach((row, i) => (row.event_id = `EV${pad(i + 1, 4)}`));
  return { name: "timeline", columns: ["event_id", "ts", "hour", "minute", "bucket", "source", "location", "tag", "detail"], rows };
}

let cache: Record<string, Table> | null = null;
/* ---------------- Company connections (Round 3) ----------------
 * Digitised from the recovered "Director and proprietor records" document. Same spellings; no new relationships. */
function buildConnections(): Table {
  return { name: "company_connections", columns: ["company_name", "person_name", "role"], rows: [
    { company_name: "RK Holdings Pvt Ltd", person_name: "Ranveer K.", role: "Director" },
    { company_name: "Iyer Traders", person_name: "Meera Iyer", role: "Proprietor" },
  ] };
}

export function tables(): Record<string, Table> {
  if (!cache) {
    const transactions = buildTransactions();
    cache = { transactions, access_logs: buildAccessLogs(transactions), account_registry: buildRegistry(), company_connections: buildConnections(), timeline: buildTimeline() };
  }
  return cache;
}

/* ---------------- Round 1: the damaged audit ---------------- */
const PATHS: Record<string, { result: number; steps: string[] }> = {
  A: { result: 5, steps: ["9 − 3 = 6; 8 − 2 = 6; 4² = 16", "144 ÷ 6 = 24; 5 × 6 = 30", "[24 + 30 − 16] = 38", "38 ÷ 2 − 14 = 19 − 14 = 5"] },
  B: { result: 9, steps: ["Incorrect: interpreting 4² as 4 × 2 gives 8", "[24 + 30 − 8] ÷ 2 − 14 = 46 ÷ 2 − 14 = 9"] },
  C: { result: 32, steps: ["Incorrect: applying the outside division only to the last term", "24 + 30 − (16 ÷ 2) − 14 = 32"] },
};
/* kept for reference only; the Round 1 audit now takes the team's own calculated result */
export function calcPath(path: string) {
  const p = PATHS[path];
  if (!p) return null;
  return { path, result: p.result, steps: p.steps, index: p.result === 5 ? "05" : null };
}

const cabinetText: Record<number, { title: string; lines: string[] }> = {
  2: { title: "Facilities Maintenance Log", lines: ["Lift inspection schedule and cleaning rota, floors 9 to 12.", "Contractor sign-offs attached.", "No connection to the active investigation."] },
  7: { title: "Vendor Compliance Report", lines: ["Annual supplier due-diligence checklist, 14 vendors reviewed.", "All certificates in date.", "No connection to the active investigation."] },
  9: { title: "Archived HR Records", lines: ["Leave balances and appraisal cycles, 2019 to 2022.", "Records archived under retention policy.", "No relevant audit activity."] },
  21: { title: "Historical Tax Documentation", lines: ["Advance tax challans and filing receipts, assessment years 2016 to 2019.", "Reconciled and closed.", "No connection detected."] },
};
export function openCabinet(file: number, auditSolved: boolean) {
  if (file === 5) {
    if (!auditSolved) return { sealed: true, text: "The folder is tied shut with an index tag. Recover the audit index before forcing it open." };
    return {
      relevant: true,
      items: [
        { kind: "statement", title: "Account statement (fragment)", rows: [["01 Mar", "ACC0001 to ACC9•••", "12,00,000"], ["01 Mar", "ACC0001 to ACC9•••", "10,00,000"], ["02 Mar", "ACC0001 to ACC9•••", "14,00,000"], ["02 Mar", "ACC0001 to ACC9•••", "4,00,000"]] },
        { kind: "refs", title: "Account references", lines: ["ACC0001  Malhotra Industries, operating", "ACC9•••  receiving account", "ACC9•••  receiving account", "ACC9•••  receiving account"] },
        { kind: "sheet", title: "Transaction sheet, page 3 of ?", rows: [["TX0412", "20:41", "RTGS", "—"], ["TX0413", "20:44", "RTGS", "—"], ["TX0414", "21:02", "RTGS", "—"], ["TX0415", "21:09", "RTGS", "—"]] },
        { kind: "usb", label: "USB-07", size: "1,000 records" },
        { kind: "note", text: "Follow the money." },
      ],
    };
  }
  const c = cabinetText[file];
  return c ? { relevant: false, title: c.title, lines: c.lines } : null;
}
