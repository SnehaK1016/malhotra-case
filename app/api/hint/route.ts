import { serializePost } from "@/lib/server/mutation";
import { bad, body, json } from "@/lib/server/http";
import { currentTeam, limited } from "@/lib/server/auth";
import { store } from "@/lib/server/store";
import { isUnlocked } from "@/lib/server/game";
import { ROUNDS } from "@/lib/server/content";

async function handlePost(req: Request) {
  const team = await currentTeam();
  if (!team) return bad("Not signed in", 401);
  if (limited("hint:" + team.id, 30, 60_000)) return bad("Slow down.", 429);
  const n = Number((await body(req)).round);
  const r = ROUNDS.find((x) => x.n === n);
  if (!r) return bad("No such round", 404);
  const p = await store.getProgress(team.id);
  if (!isUnlocked(p, n)) return bad("Round locked", 403);
  const used = (await store.listHints(team.id)).filter((h) => h.round === n);
  const next = used.length + 1;
  if (next > r.hints.length) return bad("No more hints are available for this round.", 409);
  const h = r.hints[next - 1];
  const fresh = await store.addHint({ team_id: team.id, round: n, hint_no: next, used_at: new Date().toISOString() });
  if (fresh) {
    const cur = await store.getProgress(team.id);
    await store.saveProgress({ ...cur, hints_used: cur.hints_used + 1, penalty: cur.penalty + h.cost });
  }
  const after = await store.getProgress(team.id);
  return json({ no: next, text: h.text, cost: h.cost, penalty: after.penalty, hints_used: after.hints_used, nextHintCost: r.hints[next]?.cost ?? null });
}

export const POST = serializePost(handlePost);
