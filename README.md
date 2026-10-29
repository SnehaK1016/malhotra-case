# The Malhotra Case: Data Detective Investigation

A team-based murder-mystery data investigation for college students. Next.js 14 (App Router), React, TypeScript, Tailwind, GSAP + ScrollTrigger, Lenis smooth scroll.

## Run it

```bash
npm install
cp .env.example .env.local     # set SESSION_SECRET (and ADMIN_PASSWORD if you want to change it)
npm run dev                    # http://localhost:3000
```

Production: `npm run build && npm start`.

## What changed in the staged redesign

| Area | Now |
|---|---|
| Homepage | One opening scene: title, office image, introduction, **Enter Investigation**, **Organizer Login**, fiction disclaimer. |
| Team Access (`/access`) | One field: the round-entry code. Errors distinguish an unknown code, a room that is not open yet, and a room already left. A previous code reopens a paused handoff. |
| Organizer Access (`/access/organizer`) | Existing passphrase and session, with Show/Hide. |
| Round 1 | Ten "predict the output" Python checks (8 correct unlock the audit; free method hints; points do not affect the score) → teams calculate the audit result themselves → inspect the cabinet → choose the file and a supporting reason. |
| Round 2 | Three code-completion tasks run on the real 1,000 transactions (hour counts, recurring amounts, combined filter = 501). The money-flow figure appears after the finding is verified. |
| Round 3 | Registry and redactions (now saved per team) → three-table database with a new `company_connections` table digitised from the existing records → Questions 1, 2 and 3 (Tasks A and B) written as complete SQL → company totals and relationship board → finding. |
| Organizer dashboard (`/admin`) | Overview, Teams & Progress (search, status filter, per-team detail including Round 4 questions and Round 5 steps, reset confirmed by typing the team ID), Round-entry Codes (copy, print, CSV), Answer Guide (collapsible, organizer-only, all rounds and puzzles). |

Then, from the combined Round 4 / Round 5 / navigation-puzzle prompt: the route became C4 → Lab → B2 → B1 → B3, the four room clues became short navigation puzzles (cup shuffle, backwards sign, follow the robot, mini-grid), Round 4 became four guided pandas log questions, and Round 5 became the forensic finale with the Final Verdict and the 021 treasure lock inside it. Entry-code values, story, evidence, datasets, scoring, hint costs and timer rules are unchanged.

### Hints

- **Free method hints:** the warm-up, the Round 2 tasks and the Round 3 questions each have one, and they never add a penalty.
- **Paid hints:** the existing two per round, at +5 and then +10, unchanged. Their cost is shown before a team confirms, and the wording now refers to the new tasks.

### Validation rules

- **Warm-up answers** are compared as printed output, without `eval`.
  - Ignored: spacing, line endings, quote style inside lists, and spaces after commas in lists.
  - Must match: order, letter case, `05` versus `5`, `True`/`False` versus numbers, and `7` versus `7.0`.
- **Round 2 tasks** insert only names or whole numbers into the fixed template and run it on the project's restricted pandas engine. Amounts may be typed comma-, space- or semicolon-separated, in plain, Indian or international digit grouping.
- **Round 3 queries** run on the real tables as single read-only `SELECT` statements; joins and subqueries are refused.
  - A team's result is compared with the result of the organizer's reference query, so any equivalent query passes.
  - Questions 1–2 must use `ORDER BY`, because the stored order already matches.
  - Answer-only selects such as `SELECT 450000000 …` are rejected.

## The physical route

| Round | Room | After the round |
|---|---|---|
| 1 Data Decoder | C4 | Cup shuffle → Lab |
| 2 Transaction Analysis | Lab | The backwards sign → B2 |
| 3 Financial Connections | B2 | Follow the robot → B1 |
| 4 The Access Logs | B1 | Complete the mini-grid → B3 |
| 5 The Last Sealed File (includes the Final Verdict) | B3 | No travel: the treasure is collected in B3 |

The route lives in one place, `lib/server/rooms.ts`. Pages, puzzles, validation, the code sheet and the organiser guide all read from it.

### Entry codes

- Each team has five round-entry codes (50 in total), shown on the organiser desk under **Coordinator code sheet**, with **Print** and **Download CSV**. Columns: Round 1/C4, Round 2/Lab, Round 3/B2, Round 4/B1, Round 5/B3.
- Codes are generated once and never regenerated: not on refresh, restart, redeploy or team reset. `TEAM01`…`TEAM10` are internal labels, not codes.
- A code only opens its own round. Later-room codes are refused. A next-room code is refused until the navigation puzzle is solved. A code for a room already left stops working.
- There is no sixth code. Round 5 contains the Final Verdict and the treasure lock.

### What a coordinator does at each room

1. Teams start in C4 with their Round 1 code.
2. When a team arrives at Lab, B2, B1 or B3, read it that room's code from the code sheet. Entering it unlocks the round and restarts the timer.
3. In B3, after the lock opens, the team shows its "Case closed" screen and collects the treasure from you.

### Timer and scoring

- A correct final answer in Rounds 1–4 saves the round and pauses the timer at once. It stays paused through the navigation puzzle, the walk and sign-in.
- The Round 4 questions and the Round 5 evidence steps do not pause it. Round 5's timer stops only when the 021 lock opens, and it never restarts afterwards.
- Score = 1000 − hint penalties − one point per active minute (paused time excluded). Navigation-puzzle hints are free. Technical hints still cost +5 then +10.

### Recovery

- **Browser closed during a navigation break:** the previous code reopens the paused puzzle (solved or not) on any laptop.
- **Laptop changed mid-round:** the current round's code restores everything, including Round 4 question progress and Round 5 evidence steps.
- **Sign-in page:** it never enters a previous team's session automatically.

### Organiser pages

- **`/access`:** choose "I am running this session" and enter the passphrase (`ADMIN_PASSWORD`).
- **`/admin`:** live team table (round, room, stage including Round 4 questions and Round 5 step, paused status, active time) and the code sheet. **Reset** keeps codes.
- **`/admin/guide`:** answers for all four navigation puzzles, the Round 4 code solutions, the incident note, every Round 5 step, the final statement, 021 and B3 collection. Server-rendered for organisers only.

## Storage

- **Default (no config):** progress and codes are written to `.data/store.json` (or `DATA_DIR/store.json`). Works for local use or a single always-on server with a persistent disk. The app refuses to start if that file exists but cannot be read, rather than overwriting it.
- **Supabase (for Vercel or any serverless host):**
  - **New database:** run `supabase/schema.sql`.
  - **Existing live database from an earlier version:** run `supabase/migration-room-route.sql` and `supabase/migration-staged-redesign.sql` **before** deploying (both are additive and safe to re-run). It only adds the `entry_codes` table and new `progress` columns; nothing is deleted.
  - Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

Do not deploy the file store to Vercel: its filesystem does not persist.

### Upgrading a live event without losing data

Existing teams keep their progress, hints, penalties, submissions and codes:

- Completed teams stay complete, with the same score.
- Teams that had finished the old CCTV Round 5, or were in the old verdict room, continue into the new Round 5 finale with their paused time still excluded.
- Teams paused between rooms keep their credit, and a transfer they had already verified now points to the corrected room.
- An old room clue a team had not solved becomes the new puzzle, with no penalty.

Never copy a local `.data` folder over the production one.

## Deploying (HTTPS)

**Vercel + Supabase (recommended):**
1. Create a Supabase project and run the schema, or the migration if upgrading.
2. Import this folder into Vercel.
3. Set `SESSION_SECRET` (a long random string), `ADMIN_PASSWORD`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy. Vercel serves it over HTTPS.

**Single server (VM, Railway, Render with a persistent disk):** `npm ci && npm run build && npm start` behind HTTPS. Set `SESSION_SECRET`, `ADMIN_PASSWORD` and `DATA_DIR` pointing at the persistent disk. Run one instance only with the file store.

Session cookies are `Secure` in production, so the site must be served over HTTPS (localhost is fine for testing).

## Security model

- Every answer key is in `lib/server/solutions.ts` (technical rounds) and `lib/server/rooms.ts` (room clues), imported only by API routes and the server-rendered organiser guide. Round 4 answers live in `lib/server/round4.ts` and the Round 5 finale in `lib/server/finale.ts`. A production build was checked: no entry codes or answer keys appear in the client bundle.
- Datasets are generated server-side (`lib/server/datasets.ts`) and served only to teams that have unlocked that round.
- Round locking (entry code entered, previous round and room clue complete) is enforced on the server for datasets, analysis, hints, submissions and clue checks, not just in the UI.
- Sessions are HMAC-signed httpOnly cookies. Login, admin login, submissions, hints and analysis runs are rate-limited. All inputs are length-limited, stripped of control characters and `<>`, and normalised before comparison.
- The "Python" and "SQL" workspaces run on a purpose-built safe engine (`lib/server/engine.ts`). Nothing is `eval`'d and there is no filesystem, network or process access.

## How the game works

| Round | Workspace | Finding |
|---|---|---|
| 1 Data Decoder | Decoder workbench | expression + file |
| 2 Transaction Analysis | SQL + pandas over 1,000 transactions | suspicious count + account IDs |
| 3 Financial Connections | registry + SQL | totals for two suspects + who benefited |
| 4 The Access Logs | four fill-in-the-blank pandas filters on the real logs, then the incident note | employee, time, amount, related employee |
| 5 The Last Sealed File | forensic finale and Final Verdict | final statement, then the 021 lock |

Hints: 2 per round, costing +5 then +10. Score = 1000 minus penalties minus one point per active minute (paused handoffs excluded).

### Decisions I made where the brief was open

- **Suspicious rule (Round 2):** a transfer of ₹500,000 or more is reportable. The brief's totals (501 transfers, ₹450M + ₹50M) hold exactly under this rule.
- **Wrong answers** carry no penalty; they are counted and shown to the organiser. Incorrect feedback never says which field was wrong.
- **Dataset decoys:** transactions linked to KABIR/NAINA are routine; EMP_005 has a failed 21:47 login on another date; several other wire authorisations exist in office hours.

## Where to edit things

- Story, tasks, hints, form fields: `lib/server/content.ts`
- Answer keys and accepted formats: `lib/server/solutions.ts`
- Datasets and encoded evidence: `lib/server/datasets.ts`
- Landing page scroll choreography: `app/page.tsx`
- Rooms, room-clue stories, hints and solutions: `lib/server/rooms.ts`
- Organiser guide text: `lib/server/guide.ts`
- Room-clue screens: `components/handoff/`
- Entry codes, clock state and storage: `lib/server/store.ts`, `lib/server/game.ts`

Imagery: the office photograph is `public/images/office.jpg` (reused and re-cropped across the landing, access, verdict and completion screens).

Motion respects `prefers-reduced-motion`; pinned and horizontal sections fall back to a simple stacked layout on mobile.
