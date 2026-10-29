import { serializePost } from "@/lib/server/mutation";
import { bad, json } from "@/lib/server/http";
import { clearCookies, currentTeam } from "@/lib/server/auth";
import { store } from "@/lib/server/store";
import { handoffRound, clueSolved } from "@/lib/server/game";

/* "Seal this round and go to room sign-in": records the seal and signs this laptop out. The clock remains paused. */
async function handlePost(_req: Request) {
  const team = await currentTeam();
  if (!team) return bad("Not signed in", 401);
  const p = await store.getProgress(team.id);
  const k = handoffRound(p);
  if (!k || !clueSolved(p, k)) return bad("Solve the navigation puzzle before sealing this round.", 409);
  if (p.sealed_round !== k) await store.saveProgress({ ...p, sealed_round: k });
  clearCookies();
  return json({ ok: true });
}

export const POST = serializePost(handlePost);
