import { serializePost } from "@/lib/server/mutation";
import { bad, body, json } from "@/lib/server/http";
import { clean, currentTeam, limited } from "@/lib/server/auth";
import { store } from "@/lib/server/store";
import { isUnlocked } from "@/lib/server/game";
import { ROUNDS } from "@/lib/server/content";
import { buildState } from "@/lib/server/game";
import { TASKS, run, check, round2View } from "@/lib/server/round2";

/* Round 2 tasks: run the completed code, or check it together with the team's observation. Drafts are saved on every run. */
async function handlePost(req: Request) {
  const team = await currentTeam();
  if (!team) return bad("Not signed in", 401);
  if (limited("r2:" + team.id, 90, 60_000)) return bad("Too many runs in a minute.", 429);
  const b = await body(req);
  let p = await store.getProgress(team.id);
  if (!isUnlocked(p, 2)) return bad("Round locked", 403);
  const i = TASKS.findIndex((t) => t.id === b.task);
  if (i < 0) return bad("Unknown task", 404);
  const r2 = { tasks: {}, ...(p.stages.r2 ?? {}) };
  if (i > 0 && !r2.tasks![TASKS[i - 1].id]?.done && !p.round_2_complete) return bad("Complete the previous task first.", 403);
  const blanks = (Array.isArray(b.blanks) ? b.blanks : []).slice(0, 16).map((x: unknown) => String(x ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 40));
  const prev = r2.tasks![TASKS[i].id] ?? { blanks: [] };
  const save = async (t: typeof prev) => { r2.tasks![TASKS[i].id] = t; p = { ...p, stages: { ...p.stages, r2 } }; await store.saveProgress(p); };

  if (b.action === "hint") {
    if (!prev.hinted) {
      const costs = ROUNDS.find(r => r.n === 2)!.hints;
      const cost = costs[Math.min(i, costs.length - 1)]?.cost ?? 0;
      if (b.confirm !== true) return json({ confirm: true, cost });
      const fresh = await store.addHint({ team_id: team.id, round: 2, hint_no: 101 + i, used_at: new Date().toISOString() });
      await save({ ...prev, hinted: true });
      if (fresh) { const q = await store.getProgress(team.id); await store.saveProgress({ ...q, hints_used: q.hints_used + 1, penalty: q.penalty + cost }); }
    }
    return json({ ok: true, view: round2View((await store.getProgress(team.id)).stages.r2, p.round_2_complete), state: await buildState(team) });
  }
  if (b.action === "run") {
    const r = run(TASKS[i].id, blanks);
    await save({ ...prev, blanks, output: "error" in r ? undefined : r.results });
    return "error" in r ? json({ ok: false, error: r.error }) : json({ ok: true, code: r.code, results: r.results });
  }
  if (b.action === "check") {
    const obs = clean(b.obs, 120);
    if (prev.done) return json({ ok: true, message: "Already confirmed.", view: round2View(r2, p.round_2_complete) });
    const c = check(TASKS[i].id, blanks, obs);
    await save({ ...prev, blanks, obs, done: c.ok || undefined, tries: (prev.tries ?? 0) + 1 });
    return json({ ok: c.ok, message: c.message, view: round2View(r2, p.round_2_complete) });
  }
  return bad("Unknown action", 400);
}

export const POST = serializePost(handlePost);
