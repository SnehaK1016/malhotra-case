import "server-only";
import { EMPLOYEES } from "./datasets";

export type Field = { key: string; label: string; type: "text" | "select" | "tags" | "time"; options?: string[]; placeholder?: string; help?: string };
export type Lead = { id: string; title: string; table: string; kind: "python" | "sql" | "fn"; code: string; note: string; chart?: string };
export type RoundContent = {
  n: number; code: string; title: string; tagline: string;
  tables: string[]; charts: { id: string; label: string }[]; modes: ("sql" | "python")[];
  starterSql: string; starterPy: string; fields: Field[]; leads: Lead[];
  hints: { text: string; cost: number }[];
  lines: string[];
  fragment?: { position: number; digit: string };
  evidence: unknown;
  recap?: { stream: string; items: string[] }[];
};

const names: Record<string, string> = { EMP_001: "Anand Rao", EMP_002: "Karan Deshmukh", EMP_003: "Priya Nair", EMP_004: "Imran Qureshi", EMP_005: "Sunil Pillai", EMP_006: "Neha Sharma" };

/* ---- Round 3 registry documents. Redactions carry ids that the client lifts one by one. ---- */
const docs3 = [
  { id: "cert", theme: "certificate", title: "Certificate of Incorporation", sub: "Ministry of Corporate Affairs, Government of India", stamp: "CERTIFIED COPY",
    blocks: [
      { t: "kv", k: "Company name", v: "RK Holdings Private Limited" },
      { t: "kv", k: "Corporate identity no.", v: "U74999MH2025PTC•••••" },
      { t: "kv", k: "Date of incorporation", v: "04 December 2025" },
      { t: "kv", k: "Registered office", v: "Unit 14, Lower Parel, Mumbai" },
      { t: "p", text: "The subscribers to the memorandum are listed in Form DIR-12, filed separately." },
    ] },
  { id: "bank", theme: "bank", title: "Account holder sheet", sub: "Western Mercantile Bank, corporate onboarding", stamp: "RECEIVED",
    blocks: [
      { t: "rows", head: ["Account", "Holder", "Type"], rows: [
        ["ACC9001", { r: "acc-rk", v: "RK Holdings Pvt Ltd" }, "Current"],
        ["ACC9002", { r: "acc-rk", v: "RK Holdings Pvt Ltd" }, "Current"],
        ["ACC9003", { r: "acc-iy", v: "Iyer Traders" }, "Current"],
        ["ACC9004", { r: "acc-iy", v: "Iyer Traders" }, "Current"],
      ] },
      { t: "p", text: "Accounts opened November to December 2025. Specimen signatures on file." },
    ] },
  { id: "dir", theme: "form", title: "Director and proprietor records", sub: "Form DIR-12 extract and shop establishment register", stamp: "VERIFIED",
    blocks: [
      { t: "rows", head: ["Entity", "Role", "Name"], rows: [
        ["RK Holdings Pvt Ltd", "Director", { r: "dir-rk", v: "Ranveer K." }],
        ["Iyer Traders", "Proprietor", { r: "dir-iy", v: "Meera Iyer" }],
      ] },
      { t: "p", text: "Both entities were registered within three weeks of each other." },
    ] },
  { id: "vendor", theme: "form", title: "Vendor profile: Iyer Traders", sub: "Malhotra Industries, Procurement", stamp: "APPROVED",
    blocks: [
      { t: "kv", k: "Vendor ID", v: "V-3381" }, { t: "kv", k: "Category", v: "Logistics and advisory" },
      { t: "kv", k: "Onboarded by", v: "Procurement" }, { t: "kv", k: "Approval", v: "Finance Controller's office" },
      { t: "kv", k: "Due diligence", v: "Waived, urgent engagement" },
    ] },
  { id: "invoice", theme: "invoice", title: "Tax invoice INV-0412", sub: "Iyer Traders to Malhotra Industries Ltd", stamp: "PAID",
    blocks: [
      { t: "rows", head: ["Description", "Amount"], rows: [["Logistics settlement", "₹4,00,000"], ["Service tax", "—"]] },
      { t: "p", text: "Payment instruction: remit to the current account ending 9004." },
    ] },
  { id: "circle", theme: "letter", title: "Inside Malhotra's circle", sub: "Internal relationship note, Legal", stamp: "CONFIDENTIAL",
    blocks: [
      { t: "rows", head: ["Person", "Relationship to A. Malhotra"], rows: [["Ranveer K.", "Business partner since 2014"], ["Meera Iyer", "Treasury adviser, long-standing friend of the family"], ["Kabir S.", "External auditor"], ["Naina R.", "Vendor liaison"]] },
    ] },
];

export const ROUNDS: RoundContent[] = [
  {
    n: 1, code: "THE DAMAGED AUDIT", title: "The Damaged Audit", tagline: "Most of the index was corrupted. One fragment survived.",
    tables: [], charts: [], modes: [], starterSql: "", starterPy: "", leads: [],
    fields: [
      { key: "file", label: "Evidence file", type: "select", options: ["FILE 02", "FILE 05", "FILE 07", "FILE 09", "FILE 21"] },
      { key: "reason", label: "Why this file", type: "select", options: ["worn", "index", "vendor"] },
    ],
    hints: [
      { text: "Not every sign in a sum carries equal weight. Three handwritten notes show three ways to read the audit; only one gives an index that matches a file in the cabinet.", cost: 5 },
      { text: "Evaluate round brackets first, then powers, then × and ÷ left to right, then + and −. Finish the whole square bracket before dividing it. Open the file whose number matches your result and check what it contains before choosing a reason.", cost: 10 },
    ],
    lines: ["EVIDENCE RECOVERED", "FILE 05", "FINANCIAL RECORDS IDENTIFIED", "ROUND COMPLETE"],
    evidence: {
      expression: "[144 ÷ (9 − 3) + 5 × (8 − 2) − 4²] ÷ 2 − 14",
      paths: [
        { id: "A", note: "Finish the round brackets, then powers. Complete the whole square bracket before the final division and subtraction." },
        { id: "B", note: "The tiny raised 2 must mean double the 4. After that, follow the brackets." },
        { id: "C", note: "That final division by 2 applies only to the last term inside the square bracket." },
      ],
      cabinet: [
        { id: 2, label: "FILE 02", tab: "FACILITIES", wear: 1 }, { id: 5, label: "FILE 05", tab: "FIN—R▒▒", wear: 3 },
        { id: 7, label: "FILE 07", tab: "VENDOR", wear: 0 }, { id: 9, label: "FILE 09", tab: "HR ARCH.", wear: 2 }, { id: 21, label: "FILE 21", tab: "TAX HIST.", wear: 1 },
      ],
    },
  },
  {
    n: 2, code: "FOLLOW THE MONEY", title: "Follow the Money", tagline: "Nearly a thousand transactions. Nothing looked unusual.",
    tables: ["transactions"], charts: [{ id: "txn_by_hour", label: "Transactions by hour" }, { id: "receiver_counts", label: "Transfers per receiving account" }],
    modes: ["sql", "python"],
    starterSql: "SELECT * FROM transactions LIMIT 10",
    starterPy: "import pandas as pd\n\ndf = pd.read_csv(\"transactions.csv\")\ndf.head()",
    fields: [],
    leads: [],
    hints: [
      { text: "Task by task: group by the column that holds the hour, count how often each amount appears, then combine the time condition with membership in your list of amounts.", cost: 5 },
      { text: "The pattern starts at 20:00, and six amounts recur hundreds of times. Filtering by time alone also catches one separate payment; the amounts remove it.", cost: 10 },
    ],
    lines: ["PATTERN CONFIRMED", "Four accounts are connected to the missing funds.", "IDENTITY MAPPING REQUIRED.", "ROUND COMPLETE"],
    evidence: { file: "TRANSACTIONS.csv", records: 1000 },
  },
  {
    n: 3, code: "THE CONNECTION", title: "The Connection", tagline: "The accounts were not anonymous.",
    tables: ["transactions", "account_registry", "company_connections"], charts: [], modes: ["sql", "python"],
    starterSql: "SELECT * FROM account_registry LIMIT 10",
    starterPy: "import pandas as pd\n\ndf = pd.read_csv(\"account_registry.csv\")\ndf.head()",
    fields: [{ key: "conclusion", label: "Who is financially connected to the missing funds?", type: "select", options: ["RANVEER", "MEERA", "BOTH", "NEITHER"] }],
    leads: [],
    hints: [
      { text: "Each question names its table and columns. Select exactly those columns, filter with WHERE … IN (…), and sort with ORDER BY where asked.", cost: 5 },
      { text: "For the totals, SUM(amount) over the two accounts each company owns, named with AS total_received. RK Holdings owns ACC9001 and ACC9002; Iyer Traders owns ACC9003 and ACC9004.", cost: 10 },
    ],
    lines: ["FINANCIAL MOTIVE ESTABLISHED", "Your team has connected ₹45 crore to Ranveer’s company and ₹5 crore to Meera’s company. Both are financially connected to the missing money.", "The evidence does not yet establish who committed the murder.", "ROUND COMPLETE"],
    evidence: {
      docs: docs3,
      mapping: [{ company: "RK Holdings", person: "RANVEER", short: "RK" }, { company: "Iyer Traders", person: "MEERA", short: "IT" }],
    },
  },
  {
    n: 4, code: "THE ACCESS LOGS", title: "The Access Logs", tagline: "Who was inside Malhotra's systems that night?",
    tables: ["access_logs", "transactions"], charts: [{ id: "access_activity", label: "After-hours activity by employee" }], modes: ["python", "sql"],
    starterSql: "SELECT * FROM access_logs LIMIT 15",
    starterPy: "import pandas as pd\n\ndf = pd.read_csv(\"access_logs.csv\")\ndf.head()",
    fields: [],
    leads: [],
    hints: [
      { text: "Each blank is either a column name or a value. Column names are text, so they go inside quotes. Look at the column list shown with each question.", cost: 5 },
      { text: "Numbers such as an hour or an amount are written without quotes. Dates and terminal names are text, so they need quotes and must match the data exactly.", cost: 10 },
    ],
    lines: ["DIGITAL ACTIVITY CONFIRMED.", "A session on a terminal does not prove who was sitting at it.", "The money trail is clear. The murder is not.", "ROUND COMPLETE"],
    evidence: { employees: Object.keys(EMPLOYEES).slice(0, 6).map((id) => ({ id, name: names[id], role: EMPLOYEES[id], clearance: id === "EMP_005" ? "L4" : id === "EMP_001" || id === "EMP_002" ? "L3" : "L2" })) },
  },
  {
    n: 5, code: "THE LAST SEALED FILE", title: "The Last Sealed File", tagline: "One laboratory return remains unopened.",
    tables: [], charts: [], modes: [], starterSql: "", starterPy: "", fields: [], leads: [],
    hints: [
      { text: "Restore the report from its corners first: only two fragments carry a top edge, and the seal ring must close into one circle. Then compare the recovered classification with each reference profile.", cost: 5 },
      { text: "For the lock, write the group number as two digits from the archive key, then add the sign digit as the third digit.", cost: 10 },
    ],
    lines: ["CASE CLOSED"],
    evidence: {},
  },
] as RoundContent[];

export const publicRound = (r: RoundContent) => ({
  n: r.n, code: r.code, title: r.title, tagline: r.tagline, tables: r.tables, charts: r.charts, modes: r.modes,
  starterSql: r.starterSql, starterPy: r.starterPy, fields: r.fields, hintCount: r.hints.length,
  leads: r.leads.map((l) => ({ id: l.id, title: l.title, table: l.table, kind: l.kind, code: l.code })),
  evidence: r.evidence,
});
