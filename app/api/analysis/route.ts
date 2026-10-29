import { serializePost } from "@/lib/server/mutation";
import { bad, body, json } from "@/lib/server/http";
import { currentTeam, limited } from "@/lib/server/auth";
import { store } from "@/lib/server/store";
import { isUnlocked } from "@/lib/server/game";
import { ROUNDS } from "@/lib/server/content";
import { tables, openCabinet } from "@/lib/server/datasets";
import { warmupUnlocked } from "@/lib/server/round1";
import { runPython, runSQL, AnalysisError } from "@/lib/server/engine";
import { runLead } from "@/lib/server/guided";
import { chart } from "@/lib/server/charts";

async function handlePost(req: Request) {
  const team = await currentTeam();
  if (!team) return bad("Not signed in", 401);
  if (limited("run:" + team.id, 150, 60_000)) return bad("Too many runs in a minute.", 429);
  const b = await body(req);
  const n = Number(b.round);
  const r = ROUNDS.find((x) => x.n === n);
  if (!r) return bad("No such round", 404);
  if (!isUnlocked(await store.getProgress(team.id), n)) return bad("Round locked", 403);
  const kind = String(b.kind);
  const T = tables();

  /* the old "calculation path" endpoint is gone: teams now calculate the audit result themselves (/api/r1) */
  if (kind === "openfile" && n === 1) {
    const p1 = await store.getProgress(team.id);
    if (!p1.round_1_complete && !warmupUnlocked(p1.stages.r1)) return bad("The archive is locked until the warm-up is complete.", 403);
    if (!p1.round_1_complete && !p1.stages.r1?.audit) return bad("Recover the audit index before inspecting files.", 403);
    const file = Number(b.file);
    const out = openCabinet(file, p1.round_1_complete || !!p1.stages.r1?.audit);
    if (out && !p1.round_1_complete) {
      const r1 = p1.stages.r1 ?? {};
      await store.saveProgress({ ...p1, stages: { ...p1.stages, r1: { ...r1, lastFile: file, inspected: [...new Set([...(r1.inspected ?? []), file])] } } });
    }
    return out ? json(out) : bad("No such file");
  }
  if (kind === "guided") {
    try {
      const out = runLead(n, String(b.lead));
      return out ? json(out) : bad("Unknown lead");
    } catch { return json({ error: "That lead could not be run." }); }
  }
  if (kind === "chart") {
    const c = r.charts.find((x) => x.id === b.chart);
    const data = c ? chart(c.id) : null;
    return data ? json(data) : bad("Chart not available in this round");
  }
  if (kind === "sql" || kind === "python") {
    const name = String(b.table || r.tables[0]);
    if (!r.tables.includes(name)) return bad("Table not available in this round", 403);
    const code = String(b.code ?? "");
    try {
      if (kind === "sql") return json({ results: [runSQL(code, T[name])] });
      return json({ results: runPython(code, r.tables.map((t) => T[t]), T[name]) });
    } catch (e) {
      if (e instanceof AnalysisError) return json({ error: (kind === "sql" ? "SQL error: " : "Error: ") + e.message });
      return json({ error: "That cell could not be run. Check the syntax and try again." });
    }
  }
  return bad("Unknown analysis type");
}

export const POST = serializePost(handlePost);
