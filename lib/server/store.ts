import "server-only";
import fs from "fs/promises";
import path from "path";
import { randomUUID, randomInt } from "crypto";

export type Team = { id: string; team_code: string; team_name: string; created_at: string };
export type Progress = {
  team_id: string;
  current_round: number;
  round_1_complete: boolean;
  round_2_complete: boolean;
  round_3_complete: boolean;
  round_4_complete: boolean;
  round_5_complete: boolean;
  final_complete: boolean;
  hints_used: number;
  penalty: number;
  wrong_attempts: number;
  started_at: string | null;
  completed_at: string | null;
  /* room-transfer state (added for the physical route) */
  entered_round: number;        // highest round the team has signed into with an entry code (6 = Final Verdict); 0 = not started
  paused_at: string | null;     // investigation clock is paused while this is set
  paused_ms: number;            // total paused time already banked, excluded from elapsed time and score
  clues_solved: number[];       // rounds whose room-transfer clue is verified
  clue_hints: number[];         // rounds whose optional clue hint was opened (no penalty)
  clue_wrong: number;           // wrong room-clue attempts (shown to organisers only)
  sealed_round: number;         // last round whose navigation handoff the team sealed
  stages: Stages;               // activity progress inside Rounds 1–5 (warm-up, guided tasks, SQL, log questions, forensic finale)
};
export type R1 = { lastFile?: number; inspected?: number[]; answers?: Record<string, { v: string; ok: boolean; tries: number }>; hints?: number[]; audit?: boolean; auditTries?: number };
export type R2 = { tasks?: Record<string, { blanks: string[]; obs?: string; done?: boolean; tries?: number; hinted?: boolean; output?: unknown }> };
export type R3 = { q?: Record<string, { draft: string; ok?: boolean; tries?: number; out?: unknown }>; lifted?: string[]; hints?: string[] };
export type FinaleStep = "open" | "restore" | "inspect" | "reference" | "comparison" | "statement" | "verdict" | "unlock";
export type Stages = { drafts?: Record<number, Record<string, any>>; r1?: R1; r2?: R2; r3?: R3; r4?: number; r5?: Partial<Record<FinaleStep, boolean>>; migrated?: string[] };
export type Submission = { id: string; team_id: string; round: number; answer: string; correct: boolean; submitted_at: string };
export type HintUse = { team_id: string; round: number; hint_no: number; used_at: string };
export type EntryCode = { code: string; team_id: string; round: number; created_at: string };

/* Internal team identifiers. These are NOT accepted as sign-in codes. */
export const TEAM_CODES = Array.from({ length: 10 }, (_, i) => `TEAM${String(i + 1).padStart(2, "0")}`);
export const CODE_ROUNDS = [1, 2, 3, 4, 5];

/* 8 characters from an alphabet without look-alikes (no 0/O, 1/I/L). 32^8 ≈ 1.1 × 10^12 combinations. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const normaliseCode = (s: unknown) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
export const displayCode = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;
const freshCode = (taken: Set<string>) => {
  for (;;) {
    let c = "";
    for (let i = 0; i < 8; i++) c += ALPHABET[randomInt(ALPHABET.length)];
    if (!taken.has(c) && !c.startsWith("TEAM")) { taken.add(c); return c; }
  }
};

export const blankProgress = (team_id: string): Progress => ({
  team_id, current_round: 1,
  round_1_complete: false, round_2_complete: false, round_3_complete: false, round_4_complete: false, round_5_complete: false,
  final_complete: false, hints_used: 0, penalty: 0, wrong_attempts: 0, started_at: null, completed_at: null,
  entered_round: 0, paused_at: null, paused_ms: 0, clues_solved: [], clue_hints: [], clue_wrong: 0, sealed_round: 0, stages: {},
});

/* Rows written by earlier versions are upgraded without losing progress, penalties, hints or time.
 * The caller persists the result whenever it differs from what was stored. */
export function normalise(raw: Partial<Progress> & { team_id: string }, now = Date.now()): Progress {
  const p = { ...blankProgress(raw.team_id), ...raw } as Progress;
  const legacy = raw.entered_round === undefined || raw.entered_round === null;
  if (legacy) {
    const done = [p.round_1_complete, p.round_2_complete, p.round_3_complete, p.round_4_complete, p.round_5_complete];
    const last = done.lastIndexOf(true) + 1; // highest completed round
    p.entered_round = !p.started_at ? 0 : p.final_complete || last === 5 ? 6 : last + 1;
    p.clues_solved = done.map((d, i) => (d ? i + 1 : 0)).filter(Boolean);
  }
  p.paused_ms = Number(p.paused_ms) || 0;
  p.clues_solved = Array.isArray(p.clues_solved) ? p.clues_solved.map(Number) : [];
  p.clue_hints = Array.isArray(p.clue_hints) ? p.clue_hints.map(Number) : [];
  p.clue_wrong = Number(p.clue_wrong) || 0;
  p.sealed_round = Number(p.sealed_round) || 0;
  p.stages = p.stages && typeof p.stages === "object" ? { ...p.stages } : {};
  const mark = (tag: string) => { p.stages.migrated = [...(p.stages.migrated ?? []), tag]; };

  /* Round 5 now contains the Final Verdict. Teams from the previous version that had finished the old
   * CCTV round (paused before travelling, or already in the separate verdict room) continue into the new
   * Round 5 finale with their clock running again. Paused time stays excluded. Completed teams stay complete. */
  if (!p.final_complete && (p.entered_round >= 6 || (p.entered_round === 5 && p.round_5_complete))) {
    if (p.paused_at) { p.paused_ms += Math.max(0, now - Date.parse(p.paused_at)); p.paused_at = null; }
    p.entered_round = 5; p.current_round = 5; p.round_5_complete = false; p.sealed_round = 0;
    p.clues_solved = p.clues_solved.filter((n) => n !== 5);
    mark("old-round5-to-finale");
  }
  if (p.final_complete && p.entered_round !== 5) { p.entered_round = 5; p.current_round = 5; p.round_5_complete = true; mark("completed-team"); }
  if (p.entered_round > 5) p.entered_round = 5;
  return p;
}
/* key-order-independent comparison, so a row is only re-saved when its content actually changed */
const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, stable((v as Record<string, unknown>)[k])])) : v;
const shape = (raw: Partial<Progress> & { team_id: string }) => ({ ...blankProgress(raw.team_id), ...raw, paused_ms: Number(raw.paused_ms) || 0, stages: raw.stages ?? {} });
const changed = (n: Progress, raw: Partial<Progress> & { team_id: string }) => JSON.stringify(stable(n)) !== JSON.stringify(stable(shape(raw)));

interface Backend {
  getTeamByCode(code: string): Promise<Team | null>;
  getTeam(id: string): Promise<Team | null>;
  listTeams(): Promise<Team[]>;
  getProgress(teamId: string): Promise<Progress>;
  saveProgress(p: Progress): Promise<void>;
  listHints(teamId: string): Promise<HintUse[]>;
  addHint(h: HintUse): Promise<boolean>;
  addSubmission(s: Submission): Promise<void>;
  countSubmissions(teamId: string): Promise<number>;
  resetTeam(teamId: string): Promise<void>;
  findEntryCode(code: string): Promise<EntryCode | null>;
  listEntryCodes(): Promise<EntryCode[]>;
}

/* ---------------- JSON file backend (local / single always-on server) ---------------- */
type Db = { teams: Team[]; progress: Progress[]; hints: HintUse[]; submissions: Submission[]; codes?: EntryCode[] };
class FileBackend implements Backend {
  private db: Db | null = null;
  private file = path.join(process.env.DATA_DIR || path.join(process.cwd(), ".data"), "store.json");
  private chain: Promise<unknown> = Promise.resolve();
  private loading: Promise<Db> | null = null;
  private load(): Promise<Db> {
    if (this.db) return Promise.resolve(this.db);
    return (this.loading ??= this.init());
  }
  private async init(): Promise<Db> {
    let db: Db;
    try { db = JSON.parse(await fs.readFile(this.file, "utf-8")); }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw new Error(`Refusing to start: ${this.file} exists but could not be read.`);
      db = { teams: [], progress: [], hints: [], submissions: [] };
    }
    db.codes ??= [];
    let dirty = false;
    for (const code of TEAM_CODES) {
      if (!db.teams.some((t) => t.team_code === code)) {
        const id = randomUUID();
        db.teams.push({ id, team_code: code, team_name: `Team ${code.slice(4)}`, created_at: new Date().toISOString() });
        db.progress.push(blankProgress(id));
        dirty = true;
      }
    }
    /* Entry codes are generated exactly once per team and round, then only ever read. */
    const taken = new Set(db.codes.map((c) => c.code));
    for (const t of db.teams.filter((x) => TEAM_CODES.includes(x.team_code))) {
      for (const round of CODE_ROUNDS) {
        if (!db.codes.some((c) => c.team_id === t.id && c.round === round)) {
          db.codes.push({ code: freshCode(taken), team_id: t.id, round, created_at: new Date().toISOString() });
          dirty = true;
        }
      }
    }
    this.db = db;
    if (dirty) await this.flush();
    return db;
  }
  private flush() {
    this.chain = this.chain.then(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file + ".tmp", JSON.stringify(this.db, null, 2));
      await fs.rename(this.file + ".tmp", this.file);
    });
    return this.chain;
  }
  async getTeamByCode(code: string) { return (await this.load()).teams.find((t) => t.team_code === code) ?? null; }
  async getTeam(id: string) { return (await this.load()).teams.find((t) => t.id === id) ?? null; }
  async listTeams() { return (await this.load()).teams.slice().sort((a, b) => a.team_code.localeCompare(b.team_code)); }
  async getProgress(teamId: string) {
    const db = await this.load();
    let p = db.progress.find((x) => x.team_id === teamId);
    if (!p) { p = blankProgress(teamId); db.progress.push(p); await this.flush(); }
    const n = normalise(JSON.parse(JSON.stringify(p)));
    if (changed(n, p)) await this.saveProgress(n);
    return JSON.parse(JSON.stringify(n));
  }
  async saveProgress(p: Progress) {
    const db = await this.load();
    const i = db.progress.findIndex((x) => x.team_id === p.team_id);
    if (i >= 0) db.progress[i] = p; else db.progress.push(p);
    await this.flush();
  }
  async listHints(teamId: string) { return (await this.load()).hints.filter((h) => h.team_id === teamId); }
  async addHint(h: HintUse) {
    const db = await this.load();
    if (db.hints.some((x) => x.team_id === h.team_id && x.round === h.round && x.hint_no === h.hint_no)) return false;
    db.hints.push(h); await this.flush(); return true;
  }
  async addSubmission(s: Submission) { (await this.load()).submissions.push(s); await this.flush(); }
  async countSubmissions(teamId: string) { return (await this.load()).submissions.filter((s) => s.team_id === teamId).length; }
  async resetTeam(teamId: string) {
    const db = await this.load();
    db.progress = db.progress.map((p) => (p.team_id === teamId ? blankProgress(teamId) : p));
    db.hints = db.hints.filter((h) => h.team_id !== teamId);
    db.submissions = db.submissions.filter((s) => s.team_id !== teamId);
    await this.flush(); // entry codes are deliberately untouched
  }
  async findEntryCode(code: string) { return (await this.load()).codes!.find((c) => c.code === code) ?? null; }
  async listEntryCodes() { return (await this.load()).codes!.slice(); }
}

/* ---------------- Supabase backend (see supabase/schema.sql) ---------------- */
class SupabaseBackend implements Backend {
  private client: any;
  private ready: Promise<void> | null = null;
  private async c() {
    if (!this.client) {
      const { createClient } = await import("@supabase/supabase-js");
      this.client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    }
    await (this.ready ??= this.seed().catch((e) => { this.ready = null; throw e; }));
    return this.client;
  }
  private async seed() {
    const c = this.client;
    this.must(await c.from("teams").upsert(
      TEAM_CODES.map((code) => ({ team_code: code, team_name: `Team ${code.slice(4)}` })),
      { onConflict: "team_code", ignoreDuplicates: true },
    ));
    const teams = this.must(await c.from("teams").select("id, team_code")) as { id: string; team_code: string }[];
    const existing = this.must(await c.from("entry_codes").select("code, team_id, round")) as EntryCode[];
    const taken = new Set(existing.map((x) => x.code));
    const missing: Omit<EntryCode, "created_at">[] = [];
    for (const t of teams.filter((x) => TEAM_CODES.includes(x.team_code)))
      for (const round of CODE_ROUNDS)
        if (!existing.some((x) => x.team_id === t.id && x.round === round)) missing.push({ code: freshCode(taken), team_id: t.id, round });
    /* (team_id, round) is unique, so a second instance seeding at the same moment cannot replace a code that already exists. */
    if (missing.length) this.must(await c.from("entry_codes").upsert(missing, { onConflict: "team_id,round", ignoreDuplicates: true }));
  }
  private must<T>(r: { data: T; error: { message: string } | null }): T { if (r.error) throw new Error(r.error.message); return r.data; }
  async getTeamByCode(code: string) { const c = await this.c(); return this.must(await c.from("teams").select("*").eq("team_code", code).maybeSingle()) as Team | null; }
  async getTeam(id: string) { const c = await this.c(); return this.must(await c.from("teams").select("*").eq("id", id).maybeSingle()) as Team | null; }
  async listTeams() { const c = await this.c(); return this.must(await c.from("teams").select("*").order("team_code")) as Team[]; }
  async getProgress(teamId: string) {
    const c = await this.c();
    const row = this.must(await c.from("progress").select("*").eq("team_id", teamId).maybeSingle());
    if (row) {
      const n = normalise(row as Progress);
      if (changed(n, row as Progress)) this.must(await c.from("progress").upsert(n, { onConflict: "team_id" }));
      return n;
    }
    const p = blankProgress(teamId);
    this.must(await c.from("progress").insert(p));
    return p;
  }
  async saveProgress(p: Progress) { const c = await this.c(); this.must(await c.from("progress").upsert(p, { onConflict: "team_id" })); }
  async listHints(teamId: string) { const c = await this.c(); return this.must(await c.from("hint_usage").select("*").eq("team_id", teamId)) as HintUse[]; }
  async addHint(h: HintUse) {
    const c = await this.c();
    const r = await c.from("hint_usage").insert(h);
    if (r.error) { if (String(r.error.code) === "23505") return false; throw new Error(r.error.message); }
    return true;
  }
  async addSubmission(s: Submission) { const c = await this.c(); this.must(await c.from("submissions").insert(s)); }
  async countSubmissions(teamId: string) { const c = await this.c(); const r = await c.from("submissions").select("id", { count: "exact", head: true }).eq("team_id", teamId); return r.count ?? 0; }
  async resetTeam(teamId: string) {
    const c = await this.c();
    this.must(await c.from("hint_usage").delete().eq("team_id", teamId));
    this.must(await c.from("submissions").delete().eq("team_id", teamId));
    this.must(await c.from("progress").upsert(blankProgress(teamId), { onConflict: "team_id" }));
  }
  async findEntryCode(code: string) { const c = await this.c(); return this.must(await c.from("entry_codes").select("*").eq("code", code).maybeSingle()) as EntryCode | null; }
  async listEntryCodes() { const c = await this.c(); return this.must(await c.from("entry_codes").select("*")) as EntryCode[]; }
}

const g = globalThis as unknown as { __mcStore?: Backend };
export const store: Backend = (g.__mcStore ??=
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? new SupabaseBackend() : new FileBackend());
