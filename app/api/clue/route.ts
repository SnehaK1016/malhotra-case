import { serializePost } from "@/lib/server/mutation";
import { bad, body, json } from "@/lib/server/http";
import { currentTeam, limited } from "@/lib/server/auth";
import { store } from "@/lib/server/store";
import { buildState, handoffRound, clueSolved } from "@/lib/server/game";
import { NAV, verifyNav } from "@/lib/server/rooms";

/* Navigation puzzle after Rounds 1–4: verify an answer, or open the free hint. The clock stays paused either way. */
async function handlePost(req: Request) {
  const team = await currentTeam();
  if (!team) return bad("Not signed in", 401);
  if (limited("clue:" + team.id, 60, 60_000)) return bad("Too many attempts in a minute. Take another look at the puzzle.", 429);
  const b = await body(req);
  let p = await store.getProgress(team.id);
  const k = handoffRound(p);
  if (!k || Number(b.round) !== k) return bad("There is no navigation puzzle open for your team.", 409);

  if (b.action === "hint") {
    if (!p.clue_hints.includes(k)) { p = { ...p, clue_hints: [...p.clue_hints, k] }; await store.saveProgress(p); }
    return json({ hint: NAV[k].hint, state: await buildState(team) });
  }
  if (clueSolved(p, k)) return json({ correct: true, state: await buildState(team) });

  const input = b.input && typeof b.input === "object" ? (b.input as Record<string, unknown>) : {};
  if (!verifyNav(k, input)) {
    await store.saveProgress({ ...p, clue_wrong: p.clue_wrong + 1 }); // round stays complete, clock stays paused
    return json({ correct: false, message: NAV[k].wrong });
  }
  await store.saveProgress({ ...p, clues_solved: [...p.clues_solved, k] });
  return json({ correct: true, state: await buildState(team) });
}

export const POST = serializePost(handlePost);
