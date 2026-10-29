import "server-only";
import type { FinaleStep, Progress } from "./store";
import { tables, inrShort } from "./datasets";
import { rupees } from "./solutions";
import { FINAL_ROOM, FINISH_MESSAGE } from "./rooms";

/* Round 5, "The Last Sealed File": the forensic finale, the merged Final Verdict and the treasure lock.
 * Every step is gated and checked here; the browser only ever receives what the team has already earned.
 * All forensic documents and the statement below are fictional game evidence written for this round. */

export const STEPS: FinaleStep[] = ["open", "restore", "inspect", "reference", "comparison", "statement", "verdict", "unlock"];

/* Suspect reference profiles. Names and roles are the ones already established in the Round 3 registry;
 * blood groups and reference IDs are new fictional game evidence. */
export const PROFILES = [
  { id: "RANVEER", name: "Ranveer K.", role: "Business partner since 2014", blood: "B+", ref: "R-01" },
  { id: "MEERA", name: "Meera Iyer", role: "Treasury adviser, long-standing friend of the family", blood: "A+", ref: "R-02" },
  { id: "KABIR", name: "Kabir S.", role: "External auditor", blood: "O+", ref: "R-03" },
  { id: "NAINA", name: "Naina R.", role: "Vendor liaison", blood: "AB+", ref: "R-04" },
];

/* The torn report: slot → fragment. Only this arrangement joins the border corners, ruled lines and the seal. */
const ARRANGEMENT: Record<string, string> = { tl: "F3", tr: "F1", bl: "F4", br: "F2" };
const COMPATIBLE = "R-01";
const LOCK = "021";

export const MSG = {
  restoreWrong: "The page does not align yet. Check the seal and the lines crossing the torn edges.",
  restoreOk: "Report restored. One sample entry is still concealed.",
  referenceWrong: "The selected reference is not compatible with the recovered classification. Recheck both records.",
  referenceOk: "Compatible reference found. A blood group is shared by many people. Individual comparison is still required.",
  verdictWrong: "Some conclusions are not supported by the verified evidence. Review your journal and try again.",
  unlockWrong: "The lock remains closed. Recheck the confirmed profile and the archive key.",
};

type Input = Record<string, unknown>;
const up = (v: unknown) => String(v ?? "").trim().toUpperCase();

export function checkRestore(a: Input) {
  const arr = (a.arrangement && typeof a.arrangement === "object" ? a.arrangement : {}) as Record<string, unknown>;
  return Object.entries(ARRANGEMENT).every(([slot, frag]) => up(arr[slot]) === frag) && Object.keys(arr).length === 4;
}
export const checkReference = (a: Input) => up(a.ref) === COMPATIBLE;
export function checkVerdict(a: Input) {
  return up(a.murderer) === "RANVEER" && up(a.fraud) === "MEERA"
    && rupees(a.ranveer) === 450_000_000 && rupees(a.meera) === 50_000_000 && rupees(a.total) === 500_000_000
    && String(a.evidence ?? "") === "comparison" && String(a.meera_role ?? "") === "financial";
}
/* the leading zero matters: "21" or 21 is not the code */
export const checkLock = (a: Input) => typeof a.code === "string" && a.code.trim() === LOCK;

export const stepsOf = (p: Progress) => (p.stages.r5 ?? {}) as Partial<Record<FinaleStep, boolean>>;
/* a step is allowed only when every earlier step is done */
export function allowed(p: Progress, step: FinaleStep) {
  const s = stepsOf(p);
  return STEPS.slice(0, STEPS.indexOf(step)).every((x) => s[x]);
}

function companyTotals() {
  const T = tables();
  const holder = new Map(T.account_registry.rows.map((r) => [String(r.account_id), String(r.account_holder)]));
  const sum = (h: string) => T.transactions.rows.filter((r) => /^ACC9/.test(String(r.receiver_account)) && holder.get(String(r.receiver_account)) === h).reduce((t, r) => t + Number(r.amount), 0);
  const rk = sum("RK Holdings Pvt Ltd"), iy = sum("Iyer Traders");
  return { rk: inrShort(rk), iy: inrShort(iy), total: inrShort(rk + iy) };
}

/* What the team has earned so far. Nothing in here appears before its step is complete. */
export function finaleView(p: Progress, team: { name: string }, extra: { activeMs: number; score: number | null }) {
  /* teams that closed the case under the previous version keep their completion and can read the whole file */
  const s = p.final_complete ? (Object.fromEntries(STEPS.map((k) => [k, true])) as Record<FinaleStep, boolean>) : stepsOf(p);
  const f = companyTotals();
  const journal: { group: string; items: string[] }[] = [];
  if (p.round_3_complete) journal.push({ group: "Financial", items: [`Ranveer’s company: ${f.rk.replace("Crore", "crore")}.`, `Meera’s company: ${f.iy.replace("Crore", "crore")}.`, `Total traced: ${f.total.replace("Crore", "crore")}.`] });
  const forensic: string[] = [];
  if (s.restore) forensic.push("Blade sample K-01A: A. Malhotra.");
  if (s.inspect) forensic.push("Separate handle trace K-01B: B+.");
  if (s.reference) forensic.push("Compatible reference: R-01 / Ranveer.");
  if (s.comparison) forensic.push("Individual comparison: DNA match.");
  if (forensic.length) journal.push({ group: "Forensic", items: forensic });
  if (s.statement) journal.push({ group: "Statement", items: ["Ranveer acknowledges the attack.", "Meera’s established involvement concerns the financial fraud."] });

  return {
    drafts: p.stages.drafts?.[5] ?? {},
    steps: STEPS.reduce((o, k) => ({ ...o, [k]: !!s[k] }), {} as Record<FinaleStep, boolean>),
    profiles: PROFILES.map(({ id, name, role, blood, ref }) => ({ id, name, role, blood, ref })),
    classification: s.inspect ? { abo: "B", rh: "Positive", short: "B+" } : null,
    reference: s.reference ? { ref: "R-01", person: "Ranveer" } : null,
    comparison: s.comparison ? {
      evidence: "K-01B", reference: "R-01", person: "Ranveer", result: "Match",
      note: "This connects Ranveer to the biological trace. It does not, by itself, establish how the knife was used.",
      markers: [["M-2", "11", "11"], ["M-5", "8 · 14", "8 · 14"], ["M-9", "17", "17"], ["M-12", "6 · 9", "6 · 9"], ["M-16", "13", "13"]],
    } : null,
    statement: s.statement ? {
      ref: "MC/ADD/0412",
      title: "Verified Statement / Case Addendum",
      body: [
        "I, Ranveer K., make this statement freely.",
        "On the night of 14 March, A. Malhotra confronted me in his office about the money that had left the company accounts. He said he would go to the auditors the next morning.",
        "The argument became violent. I attacked him with the knife from his desk. My hand was cut on the handle during the struggle.",
        "Meera Iyer helped move money through her company. She was not in the office that night and had no part in the attack.",
      ],
      signed: "Ranveer K.",
    } : null,
    lockKey: s.verdict ? { group: [["A", "01"], ["B", "02"], ["AB", "03"], ["O", "04"]], sign: [["Positive (+)", "1"], ["Negative (-)", "0"]] } : null,
    journal,
    final: p.final_complete ? {
      team: team.name, activeMs: extra.activeMs, score: extra.score, room: FINAL_ROOM, message: FINISH_MESSAGE,
      lines: ["Ranveer committed the murder.", "Meera assisted in the financial fraud.", "Your team reconstructed the evidence and completed the investigation."],
    } : null,
    messages: { restoreOk: s.restore ? MSG.restoreOk : null, referenceOk: s.reference ? MSG.referenceOk : null },
  };
}
