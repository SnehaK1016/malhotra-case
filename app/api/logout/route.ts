import { json } from "@/lib/server/http";
import { clearCookies } from "@/lib/server/auth";
export async function POST() { clearCookies(); return json({ ok: true }); }
