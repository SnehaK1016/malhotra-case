import { serializePost } from "@/lib/server/mutation";
import { bad, body, json } from "@/lib/server/http";
import { clean, currentTeam, limited } from "@/lib/server/auth";
import { store } from "@/lib/server/store";
import { isUnlocked, completed, buildState, pauseClock } from "@/lib/server/game";
import { check } from "@/lib/server/solutions";
import { ROUNDS } from "@/lib/server/content";
import { randomUUID } from "crypto";
import { warmupUnlocked } from "@/lib/server/round1";
import { tasksDone } from "@/lib/server/round2";
import { sqlDone } from "@/lib/server/round3";

async function handlePost(req: Request) {
  const team = await currentTeam();
  if (!team) return bad("Not signed in", 401);
  if (limited("submit:" + team.id, 40, 60_000)) return bad("Too many submissions in a minute. Take a breath and review the data.", 429);
  const b = await body(req);
  const round = Number(b.round);
  if (!Number.isInteger(round) || round < 1 || round > 6) return bad("No such round", 404);
  /* Round 5 now contains the Final Verdict and is verified step by step through /api/finale. */
  if (round >= 5) return bad("Round 5 is completed through the evidence file, not this form.", 410);
  const raw = (b.answer && typeof b.answer === "object" ? b.answer : {}) as Record<string, unknown>;
  const answer: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw).slice(0, 8)) answer[clean(k, 30)] = clean(Array.isArray(v) ? v.join(",") : v, 200);

  let p = await store.getProgress(team.id);
  const done = completed(p);
  if (!isUnlocked(p, round)) return bad("This stage is locked.", 403);
  if (round === 4 && (p.stages.r4 ?? 0) < 4) return bad("Answer all four log questions before filing the incident note.", 403);

  const alreadyDone = done[round - 1];
  /* prerequisites inside Rounds 1–4 are enforced here too, not only by disabled buttons */
  if (!alreadyDone) {
    if (round === 1 && (!warmupUnlocked(p.stages.r1) || !p.stages.r1?.audit)) return bad("Complete the warm-up and the audit before filing the finding.", 403);
    if (round === 1 && !p.stages.r1?.inspected?.includes(5)) return bad("Inspect the transaction evidence file before filing your finding.", 403);
    if (round === 2 && !tasksDone(p.stages.r2)) return bad("Complete the three analysis tasks before filing the finding.", 403);
    if (round === 3 && !sqlDone(p.stages.r3)) return bad("Verify the SQL questions before filing the finding.", 403);
  }
  const ok = check(round, answer);
  await store.addSubmission({ id: randomUUID(), team_id: team.id, round, answer: JSON.stringify(answer), correct: ok, submitted_at: new Date().toISOString() });

  if (!ok) {
    if (!alreadyDone) await store.saveProgress({ ...p, wrong_attempts: p.wrong_attempts + 1 });
    return json({ correct: false, message: "EVIDENCE DOES NOT MATCH.", detail: "Review the dataset and investigate again." });
  }
  if (!alreadyDone) {
    const now = new Date();
    /* Round saved, clock paused at once. It stays paused through the navigation puzzle, the walk and sign-in. */
    p = pauseClock({ ...p, [`round_${round}_complete`]: true, current_round: round } as typeof p, now);
    await store.saveProgress(p);
  }
  const state = await buildState(team);
  const r = ROUNDS.find((x) => x.n === round);
  return json({ correct: true, message: "EVIDENCE VERIFIED", detail: null, lines: r?.lines ?? null, state });
}

export const POST = serializePost(handlePost);
