import "server-only";
/* Technical answer keys for Rounds 1–4 live here, on the server, and are never serialised to the browser.
 * Round 5 (with the merged Final Verdict) is validated step by step in finale.ts. */

const up = (s: unknown) => String(s ?? "").trim().toUpperCase();
const digits = (s: unknown) => String(s ?? "").replace(/[^\d]/g, "");
export const empId = (s: unknown) => {
  const m = /^EMP[\s_-]*0*(\d{1,3})$/.exec(up(s));
  return m ? `EMP_${m[1].padStart(3, "0")}` : up(s);
};
export function rupees(s: unknown): number | null {
  const m = /^[\s₹]*(?:rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(crore|cr|million|mn|m|lakh|lakhs|l)?\s*$/i.exec(String(s ?? "").trim());
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  const u = (m[2] || "").toLowerCase();
  const mult = u === "crore" || u === "cr" ? 1e7 : u === "million" || u === "mn" || u === "m" ? 1e6 : u === "lakh" || u === "lakhs" || u === "l" ? 1e5 : 1;
  return Math.round(n * mult);
}
export function hhmm(s: unknown): string {
  const m = /^\s*(\d{1,2})[:.](\d{2})(?::\d{2})?\s*$/.exec(String(s ?? ""));
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
}
const accounts = (v: unknown) =>
  [...new Set(String(v ?? "").toUpperCase().split(/[^A-Z0-9]+/).filter((x) => /^ACC\d+$/.test(x)))].sort();

type A = Record<string, unknown>;
export function check(round: number, a: A): boolean {
  switch (round) {
    case 1: {
      /* the audit result is verified separately (/api/r1); here: the file and the reason that supports it */
      const file = Number(digits(a.file));
      return file === 5 && String(a.reason ?? "") === "index";
    }
    case 2:
      return Number(digits(a.count)) === 501 && JSON.stringify(accounts(a.accounts)) === JSON.stringify(["ACC9001", "ACC9002", "ACC9003", "ACC9004"]);
    case 3:
      return rupees(a.ranveer) === 450_000_000 && rupees(a.meera) === 50_000_000 && up(a.conclusion) === "BOTH";
    case 4:
      return empId(a.employee) === "EMP_002" && hhmm(a.time) === "21:47" && rupees(a.amount) === 2_500_000 && empId(a.related) === "EMP_001";
  }
  return false;
}
