import "server-only";
import { NextResponse } from "next/server";
export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const bad = (message: string, status = 400) => json({ error: message }, status);
export async function body(req: Request): Promise<Record<string, unknown>> {
  try { const t = await req.text(); if (t.length > 20_000) return {}; const j = JSON.parse(t); return j && typeof j === "object" ? j : {}; } catch { return {}; }
}
