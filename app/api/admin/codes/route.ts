import { bad, json } from "@/lib/server/http";
import { isAdmin } from "@/lib/server/auth";
import { store, displayCode } from "@/lib/server/store";
import { ROUTE, FINAL_ROOM } from "@/lib/server/rooms";

/* Coordinator code sheet. Organiser session only. */
export async function GET() {
  if (!isAdmin()) return bad("Access denied.", 401);
  const [teams, codes] = await Promise.all([store.listTeams(), store.listEntryCodes()]);
  const rows = teams.map((t) => ({
    team: t.team_name, id: t.team_code,
    codes: [1, 2, 3, 4, 5].map((n) => { const c = codes.find((x) => x.team_id === t.id && x.round === n); return c ? displayCode(c.code) : ""; }),
  }));
  return json({ rooms: ROUTE.map((r) => r.room), finalRoom: FINAL_ROOM, rows });
}
