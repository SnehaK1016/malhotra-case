import { bad, json } from "@/lib/server/http";
import { isAdmin } from "@/lib/server/auth";
import { GUIDE_PUZZLES, GUIDE_ROUTE, GUIDE_TEXT, ROUND4_GUIDE, INCIDENT_NOTE, ROUND5_GUIDE, ANSWER_KEY } from "@/lib/server/guide";
import { warmupGuide, AUDIT_EXPRESSION, REASONS, CORRECT_REASON } from "@/lib/server/round1";
import { round2Guide } from "@/lib/server/round2";
import { round3Guide } from "@/lib/server/round3";

/* Answer guide for the organizer dashboard. Organizer session only; nothing here is in a student bundle. */
export async function GET() {
  if (!isAdmin()) return bad("Access denied.", 401);
  return json({
    route: GUIDE_ROUTE, text: GUIDE_TEXT, puzzles: GUIDE_PUZZLES, key: ANSWER_KEY,
    round1: { warmup: warmupGuide(), audit: { expression: AUDIT_EXPRESSION, result: "5", why: "Round brackets: 9 − 3 = 6 and 8 − 2 = 6. Power: 4² = 16. Then 144 ÷ 6 = 24 and 5 × 6 = 30. Square bracket: 24 + 30 − 16 = 38. Finally 38 ÷ 2 − 14 = 19 − 14 = 5. FILE 05." }, reasons: REASONS.map((r) => ({ ...r, correct: r.id === CORRECT_REASON })) },
    round2: round2Guide(),
    round3: round3Guide(),
    round4: { questions: ROUND4_GUIDE, note: INCIDENT_NOTE },
    round5: ROUND5_GUIDE,
  });
}
