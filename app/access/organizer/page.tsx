"use client";
import { useRef, useState } from "react";
import { api, go } from "@/lib/client";
import AccessShell from "@/components/AccessShell";

/* Organizer Access: the existing server-checked passphrase and session; nothing about it is in this bundle. */
export default function OrganizerAccess() {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true); setErr("");
    const r = await api<{ error?: string }>("/api/admin/login", { password: pw });
    if (!r.ok) { setBusy(false); setErr(r.status === 429 ? "Too many attempts. Wait a minute and try again." : "That password is not correct."); input.current?.select(); return; }
    go("/admin", "Organizer dashboard");
  };
  return (
    <AccessShell>
      <a href="/access" className="a-in text-sm text-graphite underline-offset-4 hover:text-ink hover:underline">← Back to Team Access</a>
      <h1 className="a-in serif mt-8 text-[clamp(2.4rem,5vw,3.4rem)] font-light leading-none">Organizer Access</h1>
      <p className="a-in mt-4 text-[16px] text-graphite">For event staff. Students sign in on Team Access.</p>
      <form onSubmit={submit} className="a-in mt-8" noValidate>
        <label htmlFor="pw" className="label">Password</label>
        <div className="relative">
          <input ref={input} id="pw" type={show ? "text" : "password"} className="field pr-20" autoFocus autoComplete="current-password" value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(""); }} aria-invalid={!!err} aria-describedby={err ? "pw-err" : undefined} />
          <button type="button" onClick={() => setShow(!show)} aria-pressed={show} aria-controls="pw" className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-2 text-sm underline underline-offset-4 hover:text-wine">{show ? "Hide" : "Show"}</button>
        </div>
        <button className="btn mt-6 w-full" disabled={busy || !pw}>{busy ? "Checking…" : "Open Organizer Dashboard"}</button>
        {err && <p id="pw-err" role="alert" className="mt-5 border-l-2 border-wine bg-wine/5 px-3 py-2.5 text-sm">{err}</p>}
      </form>
      <p className="a-in mt-10 text-sm text-graphite"><a href="/" className="underline underline-offset-4 hover:text-wine">Back to home</a></p>
    </AccessShell>
  );
}
