import { serializePost } from "@/lib/server/mutation";
import { bad, body, json } from "@/lib/server/http";
import { clean, currentTeam, limited } from "@/lib/server/auth";
import { store } from "@/lib/server/store";
import { isUnlocked } from "@/lib/server/game";
import { WARMUP, matches, warmupUnlocked, checkAudit, round1View } from "@/lib/server/round1";

/* Round 1 warm-up answers, free method hints, and the audit result. The timer keeps running throughout. */
async function handlePost(req: Request) {
  const team = await currentTeam();
  if (!team) return bad("Not signed in", 401);
  if (limited("r1:" + team.id, 90, 60_000)) return bad("Too many attempts in a minute.", 429);
  const b = await body(req);
  let p = await store.getProgress(team.id);
  if (!isUnlocked(p, 1)) return bad("Round locked", 403);
  const r1 = { answers: {}, hints: [], ...(p.stages.r1 ?? {}) };
  const save = async () => { p = { ...p, stages: { ...p.stages, r1 } }; await store.saveProgress(p); };
  const view = () => round1View(r1, p.round_1_complete);

  if (b.action === "answer") {
    const n = Number(b.q);
    const q = WARMUP.find((x) => x.n === n);
    if (!q) return bad("No such question", 404);
    const v = String(b.answer ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/g, "").trim().slice(0, 300);
    if (!v.trim()) return bad("Type your predicted output first.", 400);
    const prev = r1.answers![n];
    if (prev?.ok) return json({ correct: true, message: "Already correct. Each question earns one point.", view: view() });
    const ok = matches(n, String(b.answer ?? "").slice(0, 300)); // compare the raw text (line breaks matter for the tokeniser only as spacing)
    r1.answers![n] = { v, ok, tries: (prev?.tries ?? 0) + 1 };
    await save();
    return json({ correct: ok, message: ok ? "Correct." : `Not quite. Revisit the concept: ${q.concept.toLowerCase()}. Trace the code line by line and try again.`, view: view() });
  }
  if (b.action === "hint") {
    const n = Number(b.q);
    if (!WARMUP.some((x) => x.n === n)) return bad("No such question", 404);
    if (!r1.hints!.includes(n)) { r1.hints = [...r1.hints!, n]; await save(); }
    return json({ view: view() });
  }
  if (b.action === "audit") {
    if (!p.round_1_complete && !warmupUnlocked(r1)) return bad("Answer 8 warm-up questions correctly to unlock the audit.", 403);
    if (r1.audit) return json({ correct: true, view: view() });
    const ok = checkAudit(b.result);
    r1.audit = ok || undefined; r1.auditTries = (r1.auditTries ?? 0) + 1;
    await save();
    return json({ correct: ok, message: ok ? "Audit index recovered: 05." : "That result does not match the audit. Check the order of operations.", view: view() });
  }
  return bad("Unknown action", 400);
}

export const POST = serializePost(handlePost);
