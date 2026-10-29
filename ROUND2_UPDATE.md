# Round 2 — eight mandatory investigations

This update replaces only the earlier three-task Round 2, with supporting Round 2 API/state additions. Fonts, global CSS, other round components, dataset records, existing codes and the B2 mirror handoff are unchanged from the previously delivered checked ZIP.

## Eight tasks and answers

Use the existing lowercase column names. Quoted literals accept single or double quotes. Operators, variable names, numbers and Booleans must have the right meaning.

1. `df.shape`: blank `shape`; observation `1000, 10`.
2. `df[df["amount"] > 1000000]`: blanks `"amount"`, `>`, `1000000`; observation `271`.
3. `df[df["hour"] >= 20]`: blanks `"hour"`, `>=`, `20`; observation `502`.
4. `df[df["initiated_by"] == "TREASURY_BATCH"]`: blanks `"initiated_by"`, `==`, `"TREASURY_BATCH"`; observation `501`.
5. `df[df["receiver_account"] == "ACC9001"]`: blanks `"receiver_account"`, `==`, `"ACC9001"`; observation `188`.
6. Filter treasury batch, then `sort_values(by="amount", ascending=False)`, then `head(1)`: blanks `"initiated_by"`, `==`, `"TREASURY_BATCH"`, `"amount"`, `False`; observation `1400000 ACC9002`.
7. Targets list: `"ACC9001"`, `"ACC9002"`, `"ACC9003"`, `"ACC9004"`; remaining blanks `"sender_account"`, `==`, `"ACC0001"`, `"receiver_account"`, `targets`, `"reference"`. Observation: `Advisory retainer; Consultancy fee; Logistics settlement; Project mobilisation` (any reference order).
8. Same target list; remaining blanks `"receiver_account"`, `targets`, `"amount"`, `False`, `"reference"`. Observation: `Advisory retainer`.

Several payments share the maximum amount. Questions 6 and 8 explicitly retain original ledger order for ties. The first matching record determines the requested recipient/reference. The separate ₹25 lakh payment to ACC7710 is outside the treasury batch and target-account filters.

## Final reconstruction and finding

After all eight questions: ACC0001 → ACC9001, ACC9002, ACC9003, ACC9004. Aggregates use exactly this sender/receiver filter. Total 501 transfers, ₹50 crore. The diagram shows counts, amounts, references, debit/credit labels, arrow direction and aggregate movement. It does not claim to show account balances.

Retain the final finding: count 501 and all four receiving accounts. Only verifying this final finding pauses the timer and opens the existing mirror puzzle to B2. No new room or entry code.

## Behavior

- All eight questions are mandatory and verified sequentially on the server.
- Each requires completed code and a correct interpretation of the output.
- One current question with numbered revisit controls and Next Clue.
- Real dataset table with existing search/sort/enlarge functions.
- Filtering demonstrations, descending-order record motion, first-account debit/credit cue, recovered references, four-destination paths and final reconstructed trail.
- Results and run outputs are retained; unfinished blanks and observations use existing team draft storage.
- Method hints disclose penalty before confirmation and update existing hint/penalty counters. Each question's hint is charged once. Cost uses the existing Round 2 cost schedule, repeating the last cost after the schedule ends.
- Completed legacy teams remain completed; incomplete old three-task work does not bypass the eight new questions.
- These are explicitly restricted, validated Pandas activities. Student Python is not executed arbitrarily. Validated operations are applied to the real dataset.

## Verification

Final production build and TypeScript check: PASS, including the final diagram polish. Full production API rehearsal: PASS, 183 checks across all five rounds. Reproduce with `npm run build` then `python3 scripts/verify-event.py`.

Confirmed by ZIP byte comparison: no changes to font configuration, global CSS, image assets or Round 1/3/4/5 components. Changes are Round 2 implementation, its API, optional task-state fields, task-hint display filtering in the round payload, and the rehearsal script.

No deployment was performed. No live Supabase credentials were available. Browser animation/layout review was not completed in this environment; production build and actual HTTP behavior are verified separately.

Keep your existing .data folder / DATA_DIR or Supabase database when installing the update, so existing team codes and progress remain available. Do not replace event data with a clean test installation. Existing install/run instructions continue to apply.
