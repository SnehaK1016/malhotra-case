"use client";
import { useEffect, useRef, useState } from "react";
import { api, go } from "@/lib/client";
import AccessShell from "@/components/AccessShell";

type Fail = { error?: string; kind?: "invalid" | "future" | "left" };
const TITLES: Record<string, string> = { invalid: "Code not recognised", future: "That room is not open yet", left: "That room is already closed" };

/* Team Access: one round-entry code; the server decides which round or paused handoff it opens. */
export default function TeamAccess() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Fail | null>(null);
  const [note, setNote] = useState("");
  const [signed, setSigned] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    /* laptops are shared between teams: an existing session is offered, never entered automatically */
    api<{ team?: { name: string } }>("/api/state").then((r) => { if (r.ok && r.data.team) setSigned(r.data.team.name); });
    const msg = sessionStorage.getItem("mc-note"); if (msg) { setNote(msg); sessionStorage.removeItem("mc-note"); }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true); setErr(null);
    const r = await api<{ mode?: string; round?: number } & Fail>("/api/login", { code }); // POST body: the code never goes in a URL
    if (!r.ok) {
      setBusy(false);
      setErr({ error: r.status === 429 ? "Too many attempts. Wait a minute and try again." : r.data.error ?? "Sign-in failed.", kind: r.data.kind });
      input.current?.focus(); input.current?.select();
      return;
    }
    if (r.data.mode === "handoff") { sessionStorage.setItem("mc-note", "Your round is saved and the timer is still paused. Your navigation puzzle has been reopened."); return go("/case", "Resuming your handoff"); }
    if (r.data.mode === "round" && r.data.round) return go(`/case/round/${r.data.round}`, `Round 0${r.data.round}`);
    go("/case", "Opening the case file");
  };

  return (
    <AccessShell>
      <a href="/" className="a-in text-sm text-graphite underline-offset-4 hover:text-ink hover:underline">← Back to home</a>
      <h1 className="a-in serif mt-8 text-[clamp(2.4rem,5vw,3.4rem)] font-light leading-none">Team Access</h1>
      <p className="a-in mt-4 text-[16px] text-graphite">Enter the round-entry code provided by your coordinator.</p>
      {note && <p role="status" className="a-in mt-5 border-l-2 border-slate bg-slate/10 px-3 py-2 text-sm">{note}</p>}
      <form onSubmit={submit} className="a-in mt-8" noValidate>
        <label htmlFor="code" className="label">Round-entry code</label>
        <input ref={input} id="code" name="code" className="field mono text-lg uppercase tracking-[0.2em]" autoFocus autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12}
          value={code} onChange={(e) => { setCode(e.target.value); setErr(null); }} placeholder="XXXX-XXXX" aria-invalid={!!err} aria-describedby={err ? "code-err" : undefined} />
        <button className="btn mt-6 w-full" disabled={busy || !code.trim()}>{busy ? "Checking the code…" : "Continue Investigation"}</button>
        {err && (
          <div id="code-err" role="alert" className="mt-5 border-l-2 border-wine bg-wine/5 px-3 py-2.5 text-sm">
            <p className="font-semibold">{TITLES[err.kind ?? ""] ?? "Sign-in failed"}</p>
            <p className="mt-0.5 text-ink/80">{err.error}</p>
          </div>
        )}
      </form>
      {signed && (
        <p className="a-in mt-8 text-sm text-graphite">This laptop is still signed in as {signed}.{" "}
          <button className="underline underline-offset-4 hover:text-wine" onClick={() => go("/case", "Case file")}>Continue as {signed}</button> or{" "}
          <button className="underline underline-offset-4 hover:text-wine" onClick={async () => { await api("/api/logout", {}); setSigned(null); }}>sign it out</button>.</p>
      )}
      <p className="a-in mt-10 border-t border-ink/15 pt-5 text-sm text-graphite">Running the event? <a href="/access/organizer" className="underline underline-offset-4 hover:text-wine">Organizer Login</a></p>
    </AccessShell>
  );
}
