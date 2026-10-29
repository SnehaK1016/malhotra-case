import { serializePost } from "@/lib/server/mutation";
import { bad, body, json } from "@/lib/server/http";
import { clean, isAdmin } from "@/lib/server/auth";
import { store } from "@/lib/server/store";
/* Resets one team's progress, hints and submissions. Its five entry codes are never changed. */
async function handlePost(req: Request) {
  if (!isAdmin()) return bad("Access denied.", 401);
  const code = clean((await body(req)).code, 16).toUpperCase();
  const t = await store.getTeamByCode(code);
  if (!t) return bad("Unknown team", 404);
  await store.resetTeam(t.id);
  return json({ ok: true });
}

export const POST = serializePost(handlePost);
