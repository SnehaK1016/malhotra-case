"use client";
import { useEffect, useState } from "react";
import { CaseState, clock, go, api } from "@/lib/client";

/* Active investigation time from the server. It only advances while the clock is running; paused handoffs never count. */
export function useTicker(state: CaseState | null, offset: number) {
  const [ms, setMs] = useState(0);
  const base = state?.clock.elapsed_ms ?? 0;
  const at = state ? Date.parse(state.now) : 0;
  const running = !!state?.clock.running;
  useEffect(() => {
    const tick = () => setMs(base + (running ? Math.max(0, Date.now() + offset - at) : 0));
    tick();
    if (!running) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [base, at, running, offset]);
  return ms;
}

export function statusLabel(s: CaseState) {
  if (s.progress.final_complete) return "CASE CLOSED";
  if (s.handoff) return "BETWEEN ROOMS";
  if (s.rounds[4]?.status === "active") return "FINAL FILE OPEN";
  return "INVESTIGATION OPEN";
}

export default function Hud({ state, offset, back, title }: { state: CaseState | null; offset: number; back?: boolean; title?: string }) {
  const ms = useTicker(state, offset);
  const logout = async () => { await api("/api/logout", {}); go("/", "Case file sealed"); };
  return (
    <header className="sticky top-0 z-30 border-b border-ink/15 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3 md:px-8">
        <div className="flex min-w-0 items-center gap-4">
          {back && <button className="btn-ghost !px-3" onClick={() => go("/case", "Case file")}>Case file</button>}
          <span className="serif truncate text-lg">{title ?? "The Malhotra Case"}</span>
        </div>
        {state && (
          <dl className="ml-auto flex flex-wrap items-center gap-x-7 gap-y-1 text-sm">
            <div><dt className="text-[11px] text-ink/55">Team</dt><dd className="font-medium">{state.team.name}</dd></div>
            <div><dt className="text-[11px] text-ink/55">Time on case</dt><dd className="mono flex items-center gap-2 font-medium">{clock(ms)}{state.progress.started_at && !state.clock.running && !state.progress.final_complete && <span className="border border-ink/30 px-1.5 text-[10px] font-semibold tracking-[0.1em] text-ink/70">PAUSED</span>}</dd></div>
            <div><dt className="text-[11px] text-ink/55">Hints used</dt><dd className="mono font-medium">{state.progress.hints_used}</dd></div>
            <div><dt className="text-[11px] text-ink/55">Penalty</dt><dd className="mono font-medium text-wine">+{state.progress.penalty}</dd></div>
            <div className="hidden md:block"><dt className="text-[11px] text-ink/55">Case status</dt><dd className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em]"><span className={`h-2 w-2 rounded-full ${state.progress.final_complete ? "bg-slate" : "bg-wine"}`} />{statusLabel(state)}</dd></div>
            <button onClick={logout} className="text-sm underline underline-offset-4 hover:text-wine">Leave case</button>
          </dl>
        )}
      </div>
    </header>
  );
}
