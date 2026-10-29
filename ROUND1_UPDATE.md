# Round 1 update

Applied the attached ten-question core-Python warm-up brief to the latest project, which already includes the eight-question Round 2.

## Round 1 experience

Python system checks → original audit calculation → inspect original files → submit original finding → existing cup-shuffle room clue leading to Lab.

- Ten original Python snippets, one question at a time, with titles, concepts, syntax highlighting, Previous/Next, numbered status navigation, output fields and method hints.
- Warm-up duration guidance of 12–15 minutes and a four-stage navigation strip.
- Eight correct answers unlock the audit. Remaining questions stay available. A verified question cannot earn duplicate points; warm-up does not change existing leaderboard scoring or penalties.
- Submitted wrong and correct answers restore on refresh or another authenticated session, with meaningful line breaks preserved.
- Server-side output parsing accepts harmless whitespace, Windows line endings, equivalent list quotes and optional enclosing quotes around plain printed output. It preserves list order, output order, string content, leading zeros and Boolean/numeric distinctions. No student code is executed.
- Existing hints and answers remain server-backed, and the existing organizer guide remains protected. Organizer team details now distinguish the number of questions attempted from the total submissions.
- Audit and file actions enforce the 8/10 prerequisite on the server. File inspection additionally requires the audit result, and the final finding requires inspection of the relevant evidence file. Previously completed Round 1 teams remain exempt from new prerequisites.
- The last inspected file and its contents restore from authenticated server state. Original document content, correct result 5, File 05 and supporting reason remain unchanged.
- Timer continues during warm-up and audit/file activities. Only existing full-round completion pauses it for the navigation puzzle and travel.

## Scope

No changes to font configuration, global styles, homepage, login pages, room destinations, code values, transaction records or Round 2–5 components. Supporting changes are scoped to Round 1 validation, inspection-state fields, Round 1 API branches, the organizer's Round 1 detail counter and tests. The eight-question Round 2 update remains included.

## Verified

- Production build and TypeScript validation: PASS.
- Round 1 pure-validator and legacy-completion checks: 39 PASS (`node scripts/verify-round1.cjs`).
- Complete production HTTP rehearsal: 198 PASS (`python3 scripts/verify-event.py`). Includes wrong-answer recovery, seven/eight gating, duplicate-point protection, cross-session restoration, audit/file prerequisites, original finding, navigation, all eight Round 2 tasks, other rounds, final lock, team isolation, stable codes and frozen completion timer.
- ZIP comparison with the prior Round 2 delivery confirmed unchanged fonts, shared CSS and other round components.
- `git diff --check`: PASS.

Browser layout/animation checks and a live Supabase run were not completed in this environment. The cross-device requirement was exercised with a fresh authenticated HTTP session, not a second physical laptop. Existing local run instructions and database migrations continue to apply.

Keep your current DATA_DIR/.data contents or Supabase database when installing this update so live team codes and progress are preserved. Do not overwrite your environment settings or event data with a clean installation. No live team data or actual environment secrets are bundled.
