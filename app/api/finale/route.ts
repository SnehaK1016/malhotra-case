import { serializePost } from "@/lib/server/mutation";
import { bad, body, json } from "@/lib/server/http";
import { clean, currentTeam, limited } from "@/lib/server/auth";
import { store, FinaleStep } from "@/lib/server/store";
import { isUnlocked, activeMs, score, buildState } from "@/lib/server/game";
import { STEPS, MSG, allowed, stepsOf, checkRestore, checkReference, checkVerdict, checkLock, finaleView } from "@/lib/server/finale";
import { randomUUID } from "crypto";

/* Round 5: each action is accepted only after every earlier step. The timer keeps running until the lock opens. */
async function handlePost(req: Request) {
  const team = await currentTeam();
  if (!team) return bad("Not signed in", 401);
  if (limited("finale:" + team.id, 60, 60_000)) return bad("Too many attempts in a minute.", 429);
  const b = await body(req);
  const step = String(b.action) as FinaleStep;
  if (!STEPS.includes(step)) return bad("Unknown action", 400);
  let p = await store.getProgress(team.id);
  if (!isUnlocked(p, 5)) return bad("Round locked", 403);
  const view = async () => { const q = await store.getProgress(team.id); return { finale: finaleView(q, { name: team.team_name }, { activeMs: activeMs(q), score: q.final_complete ? score(q) : null }), state: await buildState(team) }; };
  if (p.final_complete) return json({ ok: true, ...(await view()) });
  if (!allowed(p, step)) return bad("Complete the earlier evidence steps first.", 403);
  if (stepsOf(p)[step]) return json({ ok: true, ...(await view()) });

  const input = b.input && typeof b.input === "object" ? (b.input as Record<string, unknown>) : {};
  const mark = async (extra: Partial<typeof p> = {}) => {
    p = { ...p, ...extra, stages: { ...p.stages, r5: { ...stepsOf(p), [step]: true } } };
    await store.saveProgress(p);
  };
  const log = (correct: boolean, answer: unknown) => store.addSubmission({ id: randomUUID(), team_id: team.id, round: 5, answer: JSON.stringify({ step, answer }).slice(0, 2000), correct, submitted_at: new Date().toISOString() });

  switch (step) {
    case "restore":
      if (!checkRestore(input)) return json({ ok: false, message: MSG.restoreWrong });
      break;
    case "reference":
      if (!checkReference(input)) return json({ ok: false, message: MSG.referenceWrong });
      break;
    case "verdict": {
      const ans: Record<string, string> = {};
      for (const k of ["murderer", "fraud", "ranveer", "meera", "total", "evidence", "meera_role"]) ans[k] = clean(input[k], 60);
      const ok = checkVerdict(ans);
      await log(ok, ans);
      if (!ok) { await store.saveProgress({ ...p, wrong_attempts: p.wrong_attempts + 1 }); return json({ ok: false, message: MSG.verdictWrong }); }
      break;
    }
    case "unlock": {
      const code = typeof input.code === "string" ? input.code.slice(0, 6) : "";
      const ok = checkLock({ code });
      await log(ok, code);
      if (!ok) { await store.saveProgress({ ...p, wrong_attempts: p.wrong_attempts + 1 }); return json({ ok: false, message: MSG.unlockWrong }); }
      /* the only place the game completes: exactly once, and the clock freezes here */
      const now = new Date().toISOString();
      await mark({ round_5_complete: true, final_complete: true, completed_at: now, paused_at: null });
      return json({ ok: true, ...(await view()) });
    }
  }
  await mark();
  return json({ ok: true, ...(await view()) });
}

export const POST = serializePost(handlePost);
