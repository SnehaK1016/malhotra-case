import { bad, json } from "@/lib/server/http";
import { isAdmin } from "@/lib/server/auth";
import { store } from "@/lib/server/store";
import { completed, score, activeMs, handoffRound, clueSolved } from "@/lib/server/game";
import { r1Correct, warmupUnlocked } from "@/lib/server/round1";
import { TASKS } from "@/lib/server/round2";
import { QUESTIONS } from "@/lib/server/round3";
import { ROOM_OF_ROUND, navDestination } from "@/lib/server/rooms";
import { STEPS, stepsOf } from "@/lib/server/finale";

const FINALE_LABEL: Record<string, string> = { open: "envelope opened", restore: "report restored", inspect: "label inspected", reference: "reference selected", comparison: "comparison opened", statement: "statement read", verdict: "final statement verified", unlock: "treasure unlocked" };

export async function GET() {
  if (!isAdmin()) return bad("Access denied.", 401);
  const teams = await store.listTeams();
  const now = Date.now();
  const rows = await Promise.all(teams.map(async (t) => {
    const p = await store.getProgress(t.id);
    const done = completed(p);
    const k = handoffRound(p);
    const r5 = stepsOf(p);
    const lastR5 = [...STEPS].reverse().find((x) => r5[x]);
    const stage = p.final_complete ? "Case closed" : !p.entered_round ? "Not started"
      : k ? (clueSolved(p, k) ? (p.sealed_round === k ? "Travelling" : "Puzzle solved") : "Navigation puzzle")
      : p.entered_round === 4 ? `Round 4, questions ${p.stages.r4 ?? 0}/4`
      : p.entered_round === 5 ? `Round 5, ${lastR5 ? FINALE_LABEL[lastR5] : "envelope sealed"}`
      : `Round ${p.entered_round}`;
    return {
      code: t.team_code, name: t.team_name,
      current_round: p.final_complete ? "Done" : p.entered_round || "-",
      room: p.entered_round ? ROOM_OF_ROUND[p.entered_round] : "-",
      next_room: k ? navDestination(k) : null,
      stage, paused: !!p.paused_at && !p.final_complete,
      completed: done, completed_count: done.filter(Boolean).length, hints_used: p.hints_used, penalty: p.penalty, wrong_attempts: p.wrong_attempts,
      clue_wrong: p.clue_wrong, clue_hints: p.clue_hints.length,
      final_complete: p.final_complete, started_at: p.started_at, completed_at: p.completed_at,
      active_ms: activeMs(p, now), score: p.final_complete ? score(p) : null,
      submissions: await store.countSubmissions(t.id),
      /* activity detail for the Teams & Progress panel */
      detail: {
        r1: { questionsAttempted: Object.keys(p.stages.r1?.answers ?? {}).length, correct: r1Correct(p.stages.r1), attempts: Object.values(p.stages.r1?.answers ?? {}).reduce((s, a) => s + a.tries, 0), hints: (p.stages.r1?.hints ?? []).length, auditUnlocked: p.round_1_complete || warmupUnlocked(p.stages.r1), auditSolved: p.round_1_complete || !!p.stages.r1?.audit },
        r2: TASKS.map((x) => ({ task: x.title, done: p.round_2_complete || !!p.stages.r2?.tasks?.[x.id]?.done, tries: p.stages.r2?.tasks?.[x.id]?.tries ?? 0 })),
        r3: QUESTIONS.map((x) => ({ q: x.label, done: p.round_3_complete || !!p.stages.r3?.q?.[x.id]?.ok, tries: p.stages.r3?.q?.[x.id]?.tries ?? 0 })),
        r4: { questions: p.round_4_complete ? 4 : p.stages.r4 ?? 0 },
        r5: STEPS.map((x) => ({ step: FINALE_LABEL[x], done: p.final_complete || !!stepsOf(p)[x] })),
      },
    };
  }));
  return json({ teams: rows, now: new Date(now).toISOString() });
}
