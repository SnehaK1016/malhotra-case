# The Malhotra Case: delivery notes

This build is the staged redesign (homepage, logins, Round 1 warm-up, Round 2 guided Python, Round 3 SQL, organizer dashboard), with the combined Round 4 / Round 5 / navigation-puzzle prompt (`Malhotra_Final_Implementation_Prompt_1.txt`) applied on top. The git history shows every step:

- **Checkpoint 0:** the original upload.
- **Stages 1–6:** the staged redesign.
- **Final commit:** the combined prompt, tagged `before-r4r5-route` at its starting point.

## Install and run

```bash
npm ci
cp .env.example .env.local    # set SESSION_SECRET; set ADMIN_PASSWORD to change the passphrase
npm run build && npm start    # http://localhost:3000
```

**Environment variable names:**
- `SESSION_SECRET`: required.
- `ADMIN_PASSWORD`: optional, changes the organizer passphrase.
- `DATA_DIR`: optional, where the file store is kept.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: Supabase only.

**Existing Supabase database:** run `supabase/migration-room-route.sql` and `supabase/migration-staged-redesign.sql` first. Both are additive.

## Route and code associations

Existing code values are kept; only their room labels changed.

| Round | Room | Puzzle afterwards | Answer | Leads to |
|---|---|---|---|---|
| 1 | C4 | Cup shuffle | right cup | Lab |
| 2 | Lab | Backwards sign | flip left to right | B2 |
| 3 | B2 | Follow the robot | A4 → C4 → C2 → B2 → B1 | B1 |
| 4 | B1 | Mini-grid | Triangle | B3 |
| 5 | B3 | None | final statement, then lock 021 | stay in B3 for the treasure |

All other answers are in the dashboard's **Answer Guide** tab and at `/admin/guide`.

## Conflicts between the two briefs, and how they were resolved

- **Route and room clues.** The staged brief kept the B5 route and its clues; the combined prompt replaces both. The combined prompt is the newer instruction, so it wins.
- **Warm-up Question 6.** Its Python snippet uses `"B5"`, `"B1"` and `"P2"` as dictionary keys. That is code content, not routing, so it is unchanged, following the prompt's "apply replacements by meaning".
- **Round 3 story message.** Kept. Its final line now reads "ROUND COMPLETE", because a navigation puzzle follows.
- **Case-seal digits.** Removed from Rounds 1–3. They would have revealed parts of the 021 lock.
- **Suspect names.** The project's existing Kabir S. and Naina R. replace "Aarav" and "Kavya", and the existing "A. Malhotra" replaces "Rajiv". The project has no portrait files, so drawn portraits are used.

## Tests actually run (production build, local, Chromium)

| Suite | Result |
|---|---|
| Stages 1–2: logins and typed errors, warm-up, audit, file + reason; ends at the cup shuffle | 36/36 |
| Stage 3: Round 2 guided tasks on the real ledger; ends at the backwards sign | 21/21 |
| Stage 4: Round 3 SQL on the real tables; ends at the robot puzzle | 27/27 |
| Robot → Round 4 questions and incident note → mini-grid → Round 5 finale → 021 → case closed | 57/57 |
| Migration of teams saved by the staged (B5-route) build | 7/7 |

**Browser run, C4 to Case closed, with real clicks, keyboard and drag:**
- No page errors.
- No horizontal overflow at 1440 px or 390 px.
- Dashboard tabs, team details and the printable guide all checked.

**Student bundle:** no entry codes, passphrase or answer keys.

## Limitations

- **Supabase not tested.** The file store was fully tested.
- **Browsers.** Only Chromium was tested.
- **No hosted preview.** Nothing was deployed.
- **Fonts mocked during the test build.** Google Fonts could not be reached here; your normal build fetches the real fonts.
