import { bad, json } from "@/lib/server/http";
import { currentTeam } from "@/lib/server/auth";
import { store } from "@/lib/server/store";
import { isUnlocked, completed } from "@/lib/server/game";
import { ROUNDS, publicRound } from "@/lib/server/content";
import { round1View } from "@/lib/server/round1";
import { round2View } from "@/lib/server/round2";
import { round3View } from "@/lib/server/round3";
import { round4View } from "@/lib/server/round4";
import { finaleView } from "@/lib/server/finale";
import { activeMs, score } from "@/lib/server/game";

export async function GET(_: Request, { params }: { params: { n: string } }) {
  const team = await currentTeam();
  if (!team) return bad("Not signed in", 401);
  const n = Number(params.n);
  const r = ROUNDS.find((x) => x.n === n);
  if (!r) return bad("No such round", 404);
  const p = await store.getProgress(team.id);
  if (!isUnlocked(p, n)) return bad("This folder is sealed. Sign in with this room's entry code to open it.", 403);
  const used = (await store.listHints(team.id)).filter((h) => h.round === n && h.hint_no < 100).sort((a, b) => a.hint_no - b.hint_no);
  return json({
    round: publicRound(r),
    drafts: p.stages.drafts?.[n] ?? {},
    complete: completed(p)[n - 1],
    hints: used.map((h) => ({ no: h.hint_no, text: r.hints[h.hint_no - 1]?.text, cost: r.hints[h.hint_no - 1]?.cost })),
    nextHintCost: r.hints[used.length]?.cost ?? null,
    lines: completed(p)[n - 1] ? r.lines : null,
    recap: completed(p)[n - 1] ? r.recap ?? null : null,
    /* activity progress, restored on refresh or another laptop; contains no answer keys */
    r1: n === 1 ? round1View(p.stages.r1, p.round_1_complete) : undefined,
    r2: n === 2 ? round2View(p.stages.r2, p.round_2_complete) : undefined,
    r3: n === 3 ? round3View(p.stages.r3, p.round_3_complete) : undefined,
    /* round-specific progress, restored on refresh or on another laptop */
    r4: n === 4 ? round4View(p.stages.r4 ?? 0) : undefined,
    finale: n === 5 ? finaleView(p, { name: team.team_name }, { activeMs: activeMs(p), score: p.final_complete ? score(p) : null }) : undefined,
  });
}
