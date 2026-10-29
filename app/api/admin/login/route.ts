import { serializePost } from "@/lib/server/mutation";
import { bad, body, json } from "@/lib/server/http";
import { clientKey, limited, passwordMatches, setAdminCookie } from "@/lib/server/auth";
async function handlePost(req: Request) {
  if (limited("admin:" + clientKey(req), 8, 5 * 60_000)) return bad("Too many attempts. Try again in a few minutes.", 429);
  const b = await body(req);
  if (typeof b.password !== "string" || !passwordMatches(b.password.slice(0, 100))) return bad("Access denied.", 401);
  setAdminCookie();
  return json({ ok: true });
}

export const POST = serializePost(handlePost);
