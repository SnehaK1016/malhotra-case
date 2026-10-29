import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { store, Team } from "./store";

const secret = () => {
  const value = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && (!value || value.length < 32 || value.startsWith("change-me"))) throw new Error("Set SESSION_SECRET to a random value of at least 32 characters.");
  return value || "dev-only-secret-change-me";
};
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");
const safeEq = (a: string, b: string) => {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
};
export const adminPassword = () => process.env.ADMIN_PASSWORD || "pooja";
export const passwordMatches = (input: string) => {
  const h = (s: string) => createHmac("sha256", "pw").update(s).digest();
  return timingSafeEqual(h(input), h(adminPassword()));
};

const base = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export function setTeamCookie(code: string) {
  cookies().set("mc_team", `${code}.${sign("team:" + code)}`, { ...base, maxAge: 60 * 60 * 24 * 7 });
}
export function setAdminCookie() {
  const exp = Date.now() + 12 * 3600_000;
  cookies().set("mc_admin", `${exp}.${sign("admin:" + exp)}`, { ...base, maxAge: 12 * 3600 });
}
export function clearCookies() {
  cookies().delete("mc_team");
  cookies().delete("mc_admin");
}
export async function currentTeam(): Promise<Team | null> {
  const v = cookies().get("mc_team")?.value;
  if (!v) return null;
  const [code, sig] = v.split(".");
  if (!code || !sig || !safeEq(sig, sign("team:" + code))) return null;
  return store.getTeamByCode(code);
}
export function isAdmin(): boolean {
  const v = cookies().get("mc_admin")?.value;
  if (!v) return false;
  const [exp, sig] = v.split(".");
  return !!exp && !!sig && Number(exp) > Date.now() && safeEq(sig, sign("admin:" + exp));
}

/* tiny in-memory rate limiter */
const hits = new Map<string, number[]>();
export function limited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}
export const clientKey = (req: Request) => (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();

export const clean = (s: unknown, max = 200) =>
  String(s ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
