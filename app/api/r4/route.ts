import { serializePost } from "@/lib/server/mutation";
import { bad, body, json } from "@/lib/server/http";
import { currentTeam, limited } from "@/lib/server/auth";
import { store } from "@/lib/server/store";
import { isUnlocked } from "@/lib/server/game";
import { check, afterText, answerText, financialFlow } from "@/lib/server/round4";

/* Round 4 questions. Unlocked one at a time; a question can be re-run once solved, never skipped. */
async function handlePost(req: Request) {
  const team = await currentTeam();
  if (!team) return bad("Not signed in", 401);
  if (limited("r4:" + team.id, 60, 60_000)) return bad("Too many runs in a minute.", 429);
  const b = await body(req);
  const n = Number(b.q);
  let p = await store.getProgress(team.id);
  if (!isUnlocked(p, 4)) return bad("Round locked", 403);
  const done = p.stages.r4 ?? 0;
  if (!Number.isInteger(n) || n < 1 || n > 4) return bad("No such question", 404);
  if (n > done + 1) return bad("Answer the earlier questions first.", 403);
  const blanks = Array.isArray(b.blanks) ? b.blanks.slice(0, 2) : [];
  const r = check(n, blanks);
  if (!r) return bad("No such question", 404);
  if (r.correct && n === done + 1) {
    p = { ...p, stages: { ...p.stages, r4: n } };
    await store.saveProgress(p);
  }
  const now = p.stages.r4 ?? 0;
  return json({
    q: n, correct: r.correct, blanks: r.blanks, result: r.result, done: now,
    after: r.correct ? afterText(n) : null, answer: r.correct ? answerText(n) : null,
    flow: r.correct && now >= 4 ? financialFlow() : null,
  });
}

export const POST = serializePost(handlePost);
