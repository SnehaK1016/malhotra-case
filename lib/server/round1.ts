import "server-only";
import { openCabinet } from "./datasets";
import type { R1 } from "./store";

/* Round 1 Python warm-up. Question text is sent to students; ANSWERS never leave the server. */
export const WARMUP_REQUIRED = 8;
export const WARMUP = [
  { n: 1, title: "The overwritten audit label", concept: "Variables and type conversion", question: "What does this print?",
    code: `audit_id = "05"\nbackup_id = audit_id\naudit_id = int(audit_id) + 2\nprint(backup_id, audit_id, type(audit_id).__name__)`,
    hint: "Reassigning one variable does not change the value already held by another." },
  { n: 2, title: "Recover the filename", concept: "Strings and slicing", question: "What two values are printed?",
    code: `filename = "  audit_FILE_05.csv  "\nclean = filename.strip().lower()\nparts = clean.split("_")\nprint(parts[1], parts[2][:-4])`,
    hint: "Apply the operations in order; negative slicing positions count from the end." },
  { n: 3, title: "Original versus backup", concept: "References, copying, equality and identity", question: "Write the three output lines.",
    code: `original = ["File02", "File05"]\nbackup = original\nseparate = original.copy()\nbackup.append("File09")\nprint(original == separate)\nprint(original is backup)\nprint(len(separate))`,
    hint: "Assignment can share a list. copy() creates a different list." },
  { n: 4, title: "Which records survive?", concept: "Slicing and comprehensions", question: "What does this print?",
    code: `records = [12, 5, 18, 7, 20, 9]\nselected = [\n    value\n    for value in records[1:5]\n    if value % 2 == 0\n]\nprint(selected)`,
    hint: "Find the slice first, excluding its ending index, then apply the condition." },
  { n: 5, title: "Compare the evidence", concept: "Sets", question: "Write the two output lines.",
    code: `archive = {"F02", "F05", "F07", "F09"}\nverified = {"F05", "F09", "F12"}\nprint(sorted(archive & verified))\nprint(sorted(verified - archive))`,
    hint: "Intersection keeps shared values; difference removes values found in the right-hand set." },
  { n: 6, title: "Update the access log", concept: "Dictionaries and loops", question: "What does this print?",
    code: `access = {"B5": 2, "B1": 1}\nfor room in ["B5", "P2", "B5"]:\n    access[room] = access.get(room, 0) + 1\nprint(access["B5"], access["P2"], len(access))`,
    hint: "Track each update. len() counts dictionary keys." },
  { n: 7, title: "Decide whether to unlock", concept: "Boolean logic and nested conditions", question: "What does this print?",
    code: `role = "analyst"\nattempts = 2\nblocked = False\nif role in ("analyst", "auditor") and not blocked:\n    if attempts < 2:\n        status = "OPEN"\n    else:\n        status = "REVIEW"\nelse:\n    status = "DENIED"\nprint(status)`,
    hint: "Evaluate the outer condition, then check whether the inner comparison includes equality." },
  { n: 8, title: "Stop at the damaged record", concept: "continue and break", question: "What does this print?",
    code: `total = 0\nfor value in [4, -1, 6, 0, 9]:\n    if value < 0:\n        continue\n    if value == 0:\n        break\n    total += value\nprint(total)`,
    hint: "continue skips one iteration; break stops the loop." },
  { n: 9, title: "Local change or permanent change?", concept: "Functions, scope and unpacking", question: "What does this print?",
    code: `attempts = 3\ndef check(value, limit=3):\n    value += 1\n    return value, value <= limit\nupdated, allowed = check(attempts)\nprint(attempts, updated, allowed)`,
    hint: "Separate the local parameter from the outer variable and inspect both returned values." },
  { n: 10, title: "Rank the recovered files", concept: "zip(), comprehensions and sorting", question: "What does this print?",
    code: `files = ["F02", "F05", "F09"]\nscores = [6, 9, 9]\nevidence = {\n    name: score\n    for name, score in zip(files, scores)\n    if score >= 8\n}\nranked = sorted(\n    evidence,\n    key=lambda name: (-evidence[name], name)\n)\nprint(ranked)`,
    hint: "Filter the dictionary first. Sort by descending score, then ascending name for ties." },
];
const ANSWERS: Record<number, string> = {
  1: "05 7 int", 2: "file 05", 3: "False\nTrue\n2", 4: "[18, 20]", 5: "['F05', 'F09']\n['F12']",
  6: "4 1 3", 7: "REVIEW", 8: "10", 9: "3 4 False", 10: "['F05', 'F09']",
};

/* Turns printed output into a token sequence without evaluating it.
 * Harmless differences disappear (spacing, line breaks, Windows line endings, ' versus " inside lists, spaces after
 * commas in lists). Meaningful ones stay: order, case, 05 versus 5, True versus 1, quoted versus unquoted list items. */
export function tokens(src: string): string[] | null {
  const s = String(src ?? "").replace(/\r\n?/g, "\n").slice(0, 400);
  const out: string[] = [];
  let i = 0;
  const ws = () => { while (i < s.length && /[\s]/.test(s[i])) i++; };
  const item = (): string | null => {
    ws();
    const c = s[i];
    if (c === "'" || c === '"') {
      const end = s.indexOf(c, i + 1);
      if (end < 0) return null;
      const v = s.slice(i + 1, end); i = end + 1; return `'${v}'`;
    }
    let j = i;
    while (j < s.length && !/[\s,\[\]]/.test(s[j])) j++;
    if (j === i) return null;
    const v = s.slice(i, j); i = j; return v;
  };
  while (i < s.length) {
    ws(); if (i >= s.length) break;
    if (s[i] === ",") { i++; continue; } // a stray comma between printed values is harmless
    if (s[i] === "[") {
      i++; const els: string[] = [];
      for (;;) {
        ws();
        if (s[i] === "]") { i++; break; }
        const v = item(); if (v === null) return null;
        els.push(v); ws();
        if (s[i] === ",") { i++; continue; }
        if (s[i] === "]") { i++; break; }
        return null;
      }
      out.push(`[${els.join(", ")}]`);
      continue;
    }
    const v = item(); if (v === null) return null;
    out.push(v);
  }
  return out;
}
export const matches = (n: number, answer: string) => {
  let candidate = String(answer).trim();
  // Quotes around a plain printed output are presentation only. Never unwrap list elements.
  if (!ANSWERS[n]?.trim().startsWith("[") && candidate.length >= 2 && ((candidate[0] === '"' && candidate.at(-1) === '"') || (candidate[0] === "'" && candidate.at(-1) === "'"))) candidate = candidate.slice(1, -1);
  const a = tokens(candidate), e = tokens(ANSWERS[n]);
  return !!a && !!e && a.length === e.length && a.every((x, k) => x === e[k]);
};

export const r1Correct = (r: R1 | undefined) => Object.values(r?.answers ?? {}).filter((a) => a.ok).length;
export const warmupUnlocked = (r: R1 | undefined) => r1Correct(r) >= WARMUP_REQUIRED;

/* Nested brackets, exponent and equal-precedence operations; result remains 5. */
export const AUDIT_EXPRESSION = "[144 ÷ (9 − 3) + 5 × (8 − 2) − 4²] ÷ 2 − 14";
export const checkAudit = (v: unknown) => /^\s*5(\.0+)?\s*$/.test(String(v ?? ""));

/* Supporting reasons for the file choice, built only from evidence already in the cabinet. */
export const REASONS = [
  { id: "worn", text: "Its folder tab is the most worn, so it must have been opened most often." },
  { id: "index", text: "Its number matches the recovered audit index, and it holds the transaction records: the account statement, the transaction sheet and USB-07." },
  { id: "vendor", text: "Its tab reads VENDOR, which matches the supplier payments under audit." },
];
export const CORRECT_REASON = "index";

export function round1View(r: R1 | undefined, complete: boolean) {
  const answers = r?.answers ?? {};
  return {
    required: WARMUP_REQUIRED,
    inspection: {
      lastFile: r?.lastFile ?? null,
      lastView: r?.lastFile ? openCabinet(r.lastFile, complete || !!r?.audit) : null,
      hasRelevant: !!r?.inspected?.includes(5),
    },
    questions: WARMUP.map((q) => ({ ...q, hint: (r?.hints ?? []).includes(q.n) ? q.hint : null })),
    state: WARMUP.map((q) => {
      const a = answers[q.n];
      return { n: q.n, status: !a ? "unanswered" : a.ok ? "correct" : "incorrect", tries: a?.tries ?? 0, last: a?.v ?? "" };
    }),
    correct: r1Correct(r),
    unlocked: complete || warmupUnlocked(r),
    audit: { expression: AUDIT_EXPRESSION, solved: complete || !!r?.audit },
    reasons: REASONS.map(({ id, text }) => ({ id, text })),
  };
}

/* organiser guide only */
export const warmupGuide = () => WARMUP.map((q) => ({ n: q.n, title: q.title, concept: q.concept, code: q.code, answer: ANSWERS[q.n], hint: q.hint }));
