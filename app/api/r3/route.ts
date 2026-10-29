import { serializePost } from "@/lib/server/mutation";
import { bad, body, json } from "@/lib/server/http";
import { currentTeam, limited } from "@/lib/server/auth";
import { store } from "@/lib/server/store";
import { isUnlocked } from "@/lib/server/game";
import { QUESTIONS, execute, check, unlocked, round3View } from "@/lib/server/round3";

const REDACTIONS = ["acc-rk", "acc-iy", "dir-rk", "dir-iy"];

/* Round 3: run a query, check a question, save a draft, or record a lifted redaction. */
async function handlePost(req: Request) {
  const team = await currentTeam();
  if (!team) return bad("Not signed in", 401);
  if (limited("r3:" + team.id, 120, 60_000)) return bad("Too many queries in a minute.", 429);
  const b = await body(req);
  let p = await store.getProgress(team.id);
  if (!isUnlocked(p, 3)) return bad("Round locked", 403);
  const r3 = { q: {}, lifted: [], ...(p.stages.r3 ?? {}) };
  const save = async () => { p = { ...p, stages: { ...p.stages, r3 } }; await store.saveProgress(p); };
  const view = () => round3View(r3, p.round_3_complete);

  if (b.action === "lift") {
    const id = String(b.id);
    if (REDACTIONS.includes(id) && !r3.lifted!.includes(id)) { r3.lifted = [...r3.lifted!, id]; await save(); }
    return json({ lifted: r3.lifted });
  }
  const q = QUESTIONS.find((x) => x.id === b.q);
  if (!q) return bad("Unknown question", 404);
  if (!p.round_3_complete && !unlocked(r3, q.id)) return bad("Verify the earlier question first.", 403);
  const sql = String(b.sql ?? "").slice(0, 1500);
  const prev = r3.q![q.id] ?? { draft: "" };

  if (b.action === "draft") { r3.q![q.id] = { ...prev, draft: sql }; await save(); return json({ ok: true }); }
  if (b.action === "run") {
    r3.q![q.id] = { ...prev, draft: sql }; await save();
    const r = execute(sql);
    return "error" in r ? json({ ok: false, error: r.error }) : json({ ok: true, result: r });
  }
  if (b.action === "check") {
    if (prev.ok) return json({ ok: true, message: "Already verified.", view: view() });
    const c = check(q.id, sql);
    r3.q![q.id] = { ...prev, draft: sql, ok: c.ok || undefined, tries: (prev.tries ?? 0) + 1, out: c.ok ? c.result : undefined };
    await save();
    return json({ ok: c.ok, message: c.message, result: c.result ?? null, view: view() });
  }
  return bad("Unknown action", 400);
}

export const POST = serializePost(handlePost);
