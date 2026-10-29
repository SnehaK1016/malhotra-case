# Review and fixes — all five rounds

The supplied V2 source contains the requested five-round redesign. Current character names are retained as requested.

| Round | Confirmed implementation |
| --- | --- |
| 1 | Ten Python output questions, 8/10 gate, original audit, File 05 and evidence-based reason; cup shuffle leads to Lab. |
| 2 | Three guided Python activities on the 1,000-row ledger, calculated results, recurring amounts and combined filter; final answer 501 and ACC9001–ACC9004; mirror puzzle leads to B2. |
| 3 | Registry and recoverable redactions; three browsable SQL tables; Q1 ownership, Q2 people, Q3 two SUM tasks; financial comparison, relationship board and final finding unlock in the intended order; robot puzzle leads to B1. |
| 4 | Four sequential Pandas filters, actual output rows, access evidence, reconstructed earlier financial trail and final incident note; symbol puzzle leads to B3. |
| 5 | Sealed envelope, report restoration, concealed classification, compatible reference, individual comparison, supporting statement, seven-part final finding and 021 lock; completion and treasure collection remain in B3. |

## Corrections made in this review

- Added authenticated, server-backed draft saving for unfinished final findings in Rounds 1–5, the Round 1 audit result, Round 2 Python blanks/observations, Round 4 Pandas blanks and Round 5 report arrangement.
- Draft values are stored separately from verification flags. Saving a draft cannot mark a question or round complete.
- Added same-process serialization of mutation requests, including the handoff seal, so simultaneous draft writes and submissions do not overwrite each other's progress in the supported single-server setup.
- Fixed Round 3 comparison bars to use a common 18-column scale: 18 blocks versus 2 blocks, maintaining the 9:1 ratio at smaller widths.
- Fixed the cup puzzle's resize handler to use the current positions, rather than its original positions.
- Bundled the existing four font families through local font packages, removing Google Fonts build/runtime fetches.
- Updated Next.js within the existing 14.x series to 14.2.35 and updated the lockfile.
- Production signing requires a non-placeholder SESSION_SECRET of at least 32 characters. Existing organizer credential behavior is retained; set ADMIN_PASSWORD before the event.
- Added scripts/verify-event.py: a reproducible production HTTP rehearsal using temporary data and temporary credentials. It never resets event teams or changes event codes.

## Setup

1. Install Node.js 20 or newer and Python 3 for the rehearsal script.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local`. Replace SESSION_SECRET with a random secret of at least 32 characters and set your organizer ADMIN_PASSWORD.
4. Run `npm run build` and `npm start` for production, or `npm run dev` for local development.
5. Open http://localhost:3000 on the server computer. For student laptops, use the actual server's reachable LAN address and configure HTTPS for production secure session cookies. An internal preview hostname is not an event hosting address.
6. Keep the existing DATA_DIR contents or existing Supabase database when updating, otherwise new installations generate a new code sheet. No live event data is included in this ZIP.
7. If using Supabase, apply the provided migrations to your own database before use. Drafts use the existing stages JSON field; no extra draft column is needed.

## Actual verification and limits

- Production build and TypeScript validation: PASS (Next.js 14.2.35).
- Final production HTTP rehearsal: PASS, 123 checks.
- `git diff --check`: PASS.
- Production HTTP rehearsal checks all ten Round 1 outputs, warm-up gate, original audit, Round 2 analyses, four SQL submissions, visualization gating, four Pandas questions, incident finding, each navigation solution, forensic prerequisites, statement, leading-zero lock, paused/resumed/frozen timers, two-team isolation, cross-session draft recovery, concurrent draft writes and code stability.
- No browser layout/animation rehearsal was independently completed in this review. The managed preview launcher supplies Vite flags that Next.js does not accept. This does not affect the successful Next.js production build or production HTTP checks.
- Supabase integration was inspected but not tested against a live database; no credentials were supplied.
- File-backed hosting and the mutation queue support a single Node.js server process. Multiple deployed instances require database-level transactional updates; this delivery does not claim multi-instance atomicity.
- Cross-session recovery was tested using a fresh authenticated HTTP client, rather than a second physical laptop. Changes already saved on the server recover there; unsent edits cannot survive a lost network connection.
- The Python and SQL activities use the existing restricted learning engine, not unrestricted Python execution or a general SQL server.

The previous DELIVERY.md contains the original author's reported browser test results. Those are historical claims, not independent results from this review.
