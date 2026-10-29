import "server-only";
import { ROUTE, NAV, navDestination, navMessage, NAV_HEADING, NAV_SUBTITLE, FINISH_MESSAGE, FINAL_ROOM } from "./rooms";
import { MSG, PROFILES } from "./finale";

/* Organiser-only guide. Rendered on the server for signed-in organisers; never shipped to a student bundle. */
export type GuidePuzzle = { round: number; title: string; to: string; layout: string[]; sequence: string[]; solution: string; why: string[]; hint: string; wrong: string; success: string };

export const GUIDE_PUZZLES: GuidePuzzle[] = [
  {
    round: 1, title: NAV[1].title, to: navDestination(1),
    layout: ["Three large cups on an ivory panel: soft terracotta (Left), muted blue (Middle), sage (Right). Position labels Left, Middle and Right stay fixed.", "The token starts under the middle cup. Instruction: “Keep your eyes on the token. Which cup finishes with it?”"],
    sequence: ["Start shuffle: the middle cup lowers over the token.", "Swap the cups in the left and middle positions.", "Swap the cups in the middle and right positions.", "Swap the cups in the left and right positions.", "Selection is enabled. Replay and Slow replay repeat the identical sequence. With reduced motion, students step through numbered diagrams of the same swaps."],
    solution: "The RIGHT cup → Lab.",
    why: ["Token starts in the middle.", "Left↔middle: the token's cup moves to the left.", "Middle↔right: the token's cup is not involved and stays on the left.", "Left↔right: the token's cup moves to the right."],
    hint: NAV[1].hint, wrong: NAV[1].wrong, success: NAV[1].success,
  },
  {
    round: 2, title: NAV[2].title, to: navDestination(2),
    layout: ["A large paper sign showing B2 reflected left to right (horizontally mirrored).", "Choices: Turn upside down (180° rotation), Flip left to right, Flip top to bottom. Each previews ONE move from the original mirrored sign."],
    sequence: ["Choose a move to preview it.", "Check sign submits the chosen move. Reset returns to the original."],
    solution: "Flip left to right → B2.",
    why: ["The sign was mirrored across a vertical line, so reflecting it across the same line undoes it.", "Turning it upside down gives an upside-down, still-reversed sign; flipping top to bottom gives an upside-down sign."],
    hint: NAV[2].hint, wrong: NAV[2].wrong, success: NAV[2].success,
  },
  {
    round: 3, title: NAV[3].title, to: navDestination(3),
    layout: ["4 × 4 grid, columns A–D, rows 1–4 with row 1 at the top and an UP arrow above. The robot starts at A4.", "Movement card: right 2, up 2, left 1, up 1. The finishing tile's coordinate is also the room name."],
    sequence: ["Select one finishing square (click, tap, or Tab and Enter).", "Check destination. Reset selection clears the choice. The route is animated only after a correct answer."],
    solution: "A4 → C4 → C2 → B2 → B1. Answer B1.",
    why: ["Right 2 from A4 changes the column: C4.", "Up 2 lowers the row number: C2.", "Left 1: B2.", "Up 1: B1."],
    hint: NAV[3].hint, wrong: NAV[3].wrong, success: NAV[3].success,
  },
  {
    round: 4, title: NAV[4].title, to: navDestination(4),
    layout: ["3 × 3 grid. Row 1: Circle, Triangle, Square. Row 2: Triangle, Square, Circle. Row 3: Square, Circle, ?", "Rule: every row and every column contains each symbol exactly once.", "Destination key: Circle → Lab, Triangle → B3, Square → C4."],
    sequence: ["Choose an answer tile (Circle, Triangle, Square).", "Check pattern."],
    solution: "Triangle → B3.",
    why: ["Bottom row already has a square and a circle.", "The right column already has a square and a circle.", "Only the triangle completes both, and the key maps it to B3."],
    hint: NAV[4].hint, wrong: NAV[4].wrong, success: NAV[4].success,
  },
];

export const GUIDE_ROUTE = ROUTE.map((r) => ({ round: r.round, room: r.room, next: r.round < 5 ? navDestination(r.round) : null, puzzle: r.round < 5 ? NAV[r.round].title : "None: Round 5, the final statement and the treasure all stay in " + FINAL_ROOM }));
export const GUIDE_TEXT = { heading: NAV_HEADING, subtitle: NAV_SUBTITLE, message: navMessage("[ROOM]"), finish: FINISH_MESSAGE };

export const ROUND4_GUIDE = [
  { q: "Question 1: after-hours activity", code: 'df[df["hour"] >= 20]', blanks: '"hour" and 20', note: "df is the access-log dataframe. The access log already has an hour column, so no derived column is needed." },
  { q: "Question 2: incident date", code: 'case_day = df[df["log_date"] == "2026-03-14"]', blanks: '"log_date" and "2026-03-14"', note: "Filters the full access log by date (an incident-date view), not the Question 1 result." },
  { q: "Question 3: treasury terminal", code: 'terminal_logs = case_day[\n    case_day["access_point"] == "TRSY-T07"\n]', blanks: '"access_point" and "TRSY-T07"', note: "Two records: EMP_001 at 21:41 (LEDGER_VIEW) and EMP_002 at 21:47 (TRANSFER_APPROVE, DELEGATED_SESSION)." },
  { q: "Question 4: matching payment", code: 'result = df[df["amount"] == 2500000]', blanks: '"amount" and 2500000', note: "df now refers to the transaction dataframe. One record: ₹25,00,000 from ACC0001 to ACC7710, initiated_by EMP_002, 2026-03-14 21:47, reference “Treasury release, sign-off pending”. This is a separate record from the ₹50 crore pattern." },
];
export const INCIDENT_NOTE = [["Suspicious employee", "EMP_002"], ["Critical time", "21:47"], ["Transaction amount", "2500000"], ["Related employee", "EMP_001"]];

export const ROUND5_GUIDE = {
  steps: [
    ["Break the seal", "Opens the envelope; nothing to solve."],
    ["Restore the report", "Four fragments into a 2 × 2 board. Only one arrangement joins the border corners, ruled lines and the seal ring. " + MSG.restoreWrong + " / " + MSG.restoreOk],
    ["Inspect the concealed entry", "Move the examination light over the damaged label, or press “Inspect sample label”. Reveals K-01B: ABO group B, Rh(D) Positive (B+)."],
    ["Select the compatible reference", "Ranveer / R-01 (B+). " + MSG.referenceWrong + " / " + MSG.referenceOk],
    ["Open the comparison return", "K-01B against R-01: DNA match (schematic, fictional)."],
    ["Read the supporting statement", "Fictional verified statement MC/ADD/0412. Required before the final statement unlocks."],
  ],
  profiles: PROFILES.map((p) => `${p.name} (${p.role}): ${p.blood}, ${p.ref}`),
  statement: [["Who committed the murder?", "Ranveer"], ["Who assisted in the financial fraud?", "Meera"], ["Amount received by Ranveer’s company", "450000000"], ["Amount received by Meera’s company", "50000000"], ["Total money traced", "500000000"], ["Evidence supporting the murder conclusion", "Individual forensic comparison supported by the verified statement"], ["Meera’s involvement", "Financial fraud, not the murder"]],
  statementWrong: MSG.verdictWrong,
  lock: "B+ → group B = 02, sign + = 1 → 021 (the leading zero is required).",
  lockWrong: MSG.unlockWrong,
};

export const ANSWER_KEY = [
  ["Round 1", "Warm-up 8 of 10; audit result 5; FILE 05 with the reason: its number matches the audit index and it holds the transaction records."],
  ["Round 2", "Tasks: hour, value_counts, six amounts + 20 + isin. Finding: 501; ACC9001, ACC9002, ACC9003, ACC9004 (any order)."],
  ["Round 3", "SQL Q1, Q2, Q3A and Q3B as listed. Finding: Ranveer 450000000; Meera 50000000; BOTH."],
  ["Round 4", "Questions as above; incident note EMP_002, 21:47, 2500000, EMP_001."],
  ["Round 5", "Statement as above; lock 021."],
];
