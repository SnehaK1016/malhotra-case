import { serializePost } from "@/lib/server/mutation";
import { body, bad, json } from "@/lib/server/http";
import { clientKey, limited, setTeamCookie } from "@/lib/server/auth";
import { store, normaliseCode } from "@/lib/server/store";
import { enter } from "@/lib/server/game";

/* Teams sign in only with a round-entry code from a coordinator. Internal labels such as TEAM01 are not codes. */
async function handlePost(req: Request) {
  // ten teams usually share one campus IP, so the per-IP allowance is generous; codes have ~10^12 combinations
  if (limited("login:" + clientKey(req), 60, 60_000)) return bad("Too many attempts. Wait a minute and try again.", 429);
  const code = normaliseCode((await body(req)).code);
  const entry = code.length === 8 ? await store.findEntryCode(code) : null;
  if (!entry) return json({ error: "Entry code not recognised. Check it with the coordinator in this room.", kind: "invalid" }, 401);
  const team = await store.getTeam(entry.team_id);
  if (!team) return json({ error: "Entry code not recognised. Check it with the coordinator in this room.", kind: "invalid" }, 401);
  const p = await store.getProgress(team.id);
  const r = enter(p, entry.round);
  if (!r.ok) return json({ error: r.error, kind: r.kind }, 403);
  if (JSON.stringify(r.progress) !== JSON.stringify(p)) await store.saveProgress(r.progress);
  setTeamCookie(team.team_code);
  return json({ ok: true, mode: r.mode, round: r.round });
}

export const POST = serializePost(handlePost);
