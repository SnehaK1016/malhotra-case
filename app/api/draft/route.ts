import { serializePost } from "@/lib/server/mutation";
import { bad, body, json } from '@/lib/server/http';
import { currentTeam } from '@/lib/server/auth';
import { store } from '@/lib/server/store';
import { isUnlocked } from '@/lib/server/game';
async function handlePost(req: Request) {
  const team = await currentTeam();
  if (!team) return bad('Not signed in', 401);
  const b = await body(req), round = Number(b.round);
  const p = await store.getProgress(team.id);
  if (!isUnlocked(p, round)) return bad('Round locked', 403);
  const key = String(b.key ?? '');
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(key)) return bad('Invalid draft', 400);
  const value = b.value;
  if (JSON.stringify(value ?? null).length > 4000) return bad('Draft too long', 400);
  // Drafts are isolated from earned progress and never count as verified answers.
  const drafts = { ...p.stages.drafts, [round]: { ...p.stages.drafts?.[round], [key]: value } };
  await store.saveProgress({ ...p, stages: { ...p.stages, drafts } });
  return json({ ok: true });
}

export const POST = serializePost(handlePost);
