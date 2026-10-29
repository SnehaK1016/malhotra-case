import "server-only";
import { store, Progress, Team } from "./store";
import { ROUNDS } from "./content";
import { NAV, NAV_ROUNDS, NAV_HEADING, NAV_SUBTITLE, ROOM_OF_ROUND, navDestination, navMessage } from "./rooms";

const flag = (p: Progress, n: number) => (p as unknown as Record<string, boolean>)[`round_${n}_complete`];
export const completed = (p: Progress) => [1, 2, 3, 4, 5].map((n) => flag(p, n));

/* Active investigation time: wall-clock time since the first sign-in, minus every paused handoff. */
export function activeMs(p: Progress, now = Date.now()): number {
  if (!p.started_at) return 0;
  const end = p.completed_at ? Date.parse(p.completed_at) : now;
  const openPause = p.paused_at && !p.completed_at ? Math.max(0, end - Date.parse(p.paused_at)) : 0;
  return Math.max(0, end - Date.parse(p.started_at) - p.paused_ms - openPause);
}
export function pauseClock(p: Progress, now = new Date()): Progress {
  return p.paused_at ? p : { ...p, paused_at: now.toISOString() };
}
export function resumeClock(p: Progress, now = new Date()): Progress {
  if (!p.paused_at) return p;
  return { ...p, paused_ms: p.paused_ms + Math.max(0, now.getTime() - Date.parse(p.paused_at)), paused_at: null };
}

export function score(p: Progress): number {
  if (!p.started_at || !p.completed_at) return 0;
  const mins = Math.floor(activeMs(p) / 60000);
  return Math.max(0, 1000 - p.penalty - mins);
}

/* A round's data, hints and answers are open only once the team has signed into it with its entry code. */
export function isUnlocked(p: Progress, n: number) {
  return Number.isInteger(n) && n >= 1 && n <= 5 && n <= p.entered_round;
}

/* Between rooms: the team's current round (1–4) is verified and the next room's code has not been entered yet. */
export function handoffRound(p: Progress): number | null {
  const k = p.entered_round;
  return NAV_ROUNDS.includes(k) && completed(p)[k - 1] ? k : null;
}
export const clueSolved = (p: Progress, k: number) => p.clues_solved.includes(k);

export function handoffView(p: Progress) {
  const k = handoffRound(p);
  if (!k) return null;
  const n = NAV[k];
  const solved = clueSolved(p, k);
  return {
    round: k, kind: n.kind, title: n.title, heading: NAV_HEADING, subtitle: NAV_SUBTITLE,
    hint: p.clue_hints.includes(k) ? n.hint : null,
    solved,
    /* the destination and its announcement exist in the response only after the server accepted the answer */
    destination: solved ? navDestination(k) : null,
    success: solved ? n.success : null,
    message: solved ? navMessage(navDestination(k)) : null,
  };
}

export async function buildState(team: Team) {
  const p = await store.getProgress(team.id);
  const done = completed(p);
  const now = Date.now();
  const rounds = ROUNDS.map((r) => ({
    n: r.n, title: r.title, code: r.code, tagline: r.tagline,
    status: done[r.n - 1] ? "complete" : p.entered_round === r.n ? "active" : "locked",
    /* only rooms already reached are shown, so no student screen maps future destinations */
    room: r.n <= p.entered_round ? ROOM_OF_ROUND[r.n] : null,
  }));
  return {
    team: { code: team.team_code, name: team.team_name },
    progress: { current_round: p.entered_round, completed: done, final_complete: p.final_complete, hints_used: p.hints_used, penalty: p.penalty, wrong_attempts: p.wrong_attempts, started_at: p.started_at, completed_at: p.completed_at },
    clock: { elapsed_ms: activeMs(p, now), running: !!p.started_at && !p.paused_at && !p.completed_at },
    rounds,
    handoff: handoffView(p),
    score: p.final_complete ? score(p) : null,
    now: new Date(now).toISOString(),
  };
}

/* ---------- Signing in with a round-entry code ---------- */
export type Entry = { ok: true; mode: "round" | "handoff"; round: number; progress: Progress } | { ok: false; error: string; kind: "future" | "left" };

export function enter(p0: Progress, k: number, now = new Date()): Entry {
  let p = { ...p0 };
  const done = completed(p);
  const E = p.entered_round;
  const later = "This code opens a later room. Finish your current round and its navigation puzzle first.";
  const future = { ok: false as const, error: later, kind: "future" as const };

  if (E === 0) {
    if (k !== 1) return future;
    p = { ...p, entered_round: 1, current_round: 1, started_at: p.started_at ?? now.toISOString(), paused_at: null };
    return { ok: true, mode: "round", round: 1, progress: p };
  }
  if (k === E) {
    if (!done[k - 1]) return { ok: true, mode: "round", round: k, progress: resumeClock(p, now) };
    if (k === 5) return { ok: true, mode: "round", round: 5, progress: p }; // finished game: show the closed case, clock stays frozen
    return { ok: true, mode: "handoff", round: k, progress: pauseClock(p, now) }; // recovery: reopen the paused handoff
  }
  if (k === E + 1) {
    if (!done[E - 1] || !clueSolved(p, E)) return future;
    p = resumeClock({ ...p, entered_round: k, current_round: k, sealed_round: 0 }, now);
    return { ok: true, mode: "round", round: k, progress: p };
  }
  if (k < E) return { ok: false, error: "That code belongs to a room your team has already left. Use the code you were given at your current room.", kind: "left" };
  return future;
}
