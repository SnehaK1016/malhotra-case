import { json } from "@/lib/server/http";
import { currentTeam, isAdmin } from "@/lib/server/auth";
import { buildState } from "@/lib/server/game";
export async function GET() {
  const team = await currentTeam();
  if (!team) return json({ team: null, admin: isAdmin() }, 401);
  return json(await buildState(team));
}
