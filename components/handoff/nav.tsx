"use client";
/* Small building blocks shared by the four navigation puzzles. */
export type Verify = (input: Record<string, unknown>) => Promise<{ correct: boolean; message?: string }>;
export type PuzzleProps = { solved: boolean; verify: Verify; busy: boolean; onRevealed: () => void };

export const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-[#2b2b2e]/20 bg-white/60 px-3 py-1 text-[13px] text-[#2b2b2e]/80">
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><rect x="2" y="2" width="3" height="8" rx="1" fill="#4a5d78" /><rect x="7" y="2" width="3" height="8" rx="1" fill="#4a5d78" /></svg>{children}
  </span>
);

export const Big = ({ children, onClick, disabled, kind = "primary", pressed, label }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; kind?: "primary" | "soft"; pressed?: boolean; label?: string }) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-pressed={pressed} aria-label={label}
    className={`min-h-[48px] rounded-xl px-5 py-3 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${kind === "primary" ? "bg-[#2b2b2e] text-[#f7f3ea] hover:bg-[#4a5d78]" : pressed ? "border-2 border-[#4a5d78] bg-[#e3e8ef] text-[#2b2b2e]" : "border-2 border-[#2b2b2e]/15 bg-white text-[#2b2b2e] hover:border-[#4a5d78]"}`}>
    {children}
  </button>
);

export function Feedback({ text, tone = "wrong" }: { text: string; tone?: "wrong" | "ok" }) {
  if (!text) return <p aria-live="polite" className="min-h-[1.5rem]" />;
  return <p role={tone === "wrong" ? "alert" : "status"} className={`min-h-[1.5rem] rounded-lg px-3 py-2 text-[15px] ${tone === "wrong" ? "bg-[#c98b6b]/15 text-[#7a3e26]" : "bg-[#8fa58a]/20 text-[#33502e]"}`}>{text}</p>;
}

/* The paper room ticket: shown only once the server has accepted the answer. */
export function Ticket({ room, success, message }: { room: string; success: string; message: string }) {
  return (
    <div className="nav-ticket mx-auto w-full max-w-[520px]">
      <div className="flex overflow-hidden rounded-2xl bg-[#fbf8f1] shadow-[0_10px_24px_rgba(43,43,46,.16)]">
        <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-[#2b2b2e]/20 bg-[#4a5d78] px-2 text-[#f7f3ea]">
          <span className="text-[11px] font-semibold tracking-[0.14em]">ROOM</span>
          <span className="mt-1 text-[11px] opacity-80">ticket</span>
        </div>
        <div className="min-w-0 flex-1 px-6 py-5">
          <p className="text-[14px] text-[#2b2b2e]/70">{success}</p>
          <p className="serif mt-1 text-[clamp(3.2rem,11vw,5.5rem)] leading-none text-[#2b2b2e]">{room}</p>
        </div>
      </div>
      <p className="mt-5 text-center text-[17px] font-medium text-[#2b2b2e]">{message}</p>
    </div>
  );
}
