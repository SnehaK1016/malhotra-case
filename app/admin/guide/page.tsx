import { isAdmin } from "@/lib/server/auth";
import { GUIDE_PUZZLES, GUIDE_ROUTE, GUIDE_TEXT, ROUND4_GUIDE, INCIDENT_NOTE, ROUND5_GUIDE, ANSWER_KEY } from "@/lib/server/guide";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organiser guide: The Malhotra Case" };

/* Organiser-only. Rendered on the server after checking the organiser session, so none of this reaches a student's browser. */
export default function Guide() {
  if (!isAdmin()) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        <h1 className="serif text-4xl font-light">Organisers only</h1>
        <p className="mt-4 text-graphite">Sign in at the organiser desk to read the guide.</p>
        <a className="btn mt-8" href="/access/organizer">Go to Organizer Access</a>
      </main>
    );
  }
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="mt-6 text-[13px] font-semibold text-graphite">{children}</h3>;
  const Sec = ({ children, brk }: { children: React.ReactNode; brk?: boolean }) => <section className="mt-12 border-t border-ink/20 pt-6" style={brk ? { breakBefore: "page" } : undefined}>{children}</section>;
  return (
    <main className="mx-auto max-w-[920px] px-5 py-10 md:px-8">
      <div className="no-print flex flex-wrap items-center justify-between gap-3"><a className="btn-ghost" href="/admin">Back to the desk</a><span className="text-sm text-graphite">Use your browser’s print command for a paper copy.</span></div>
      <h1 className="serif mt-8 text-5xl font-light">Organiser guide</h1>
      <p className="mt-3 text-graphite">For coordinators. Keep it away from students: it contains every solution.</p>

      <Sec>
        <h2 className="serif text-3xl font-light">Room route</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-ink/30"><th className="py-2 pr-4">Round</th><th className="py-2 pr-4">Played in</th><th className="py-2 pr-4">Puzzle afterwards</th><th className="py-2">Leads to</th></tr></thead>
          <tbody>{GUIDE_ROUTE.map((r) => <tr key={r.round} className="border-b border-ink/10"><td className="py-2 pr-4">Round {r.round}</td><td className="mono py-2 pr-4">{r.room}</td><td className="py-2 pr-4">{r.puzzle}</td><td className="mono py-2">{r.next ?? "—"}</td></tr>)}</tbody></table></div>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed">
          <li>Teams start in C4 with their Round 1 code.</li>
          <li>A correct final answer in Rounds 1–4 saves the round and pauses the clock. The navigation puzzle opens with “{GUIDE_TEXT.heading}” and “{GUIDE_TEXT.subtitle}”</li>
          <li>When solved, the team sees a room ticket and: “{GUIDE_TEXT.message}”</li>
          <li>At the next room, read the team its code for that room from the code sheet. The clock restarts when the code is accepted.</li>
          <li>Recovery: the previous code reopens a paused handoff on any laptop. A code for a room already left is refused; a next-room code is refused until the puzzle is solved.</li>
          <li>Round 5 has no puzzle and no sixth code. The Final Verdict and treasure lock are inside Round 5. After the lock opens the team sees: “{GUIDE_TEXT.finish}”</li>
        </ol>
      </Sec>

      {GUIDE_PUZZLES.map((c) => (
        <Sec key={c.round} brk>
          <p className="text-sm text-graphite">After Round {c.round}, leads to {c.to}</p>
          <h2 className="serif text-3xl font-light">{c.title}</h2>
          <H>Layout</H><ul className="mt-1 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">{c.layout.map((l, i) => <li key={i}>{l}</li>)}</ul>
          <H>Interaction</H><ol className="mt-1 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed">{c.sequence.map((l, i) => <li key={i}>{l}</li>)}</ol>
          <H>Answer</H><p className="mono mt-1 border-l-2 border-wine pl-3 text-[15px] font-semibold">{c.solution}</p>
          <H>Why</H><ul className="mt-1 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">{c.why.map((l, i) => <li key={i}>{l}</li>)}</ul>
          <H>Free hint</H><p className="mt-1 text-[15px]">“{c.hint}”</p>
          <H>Wrong / success feedback</H><p className="mt-1 text-[15px]">“{c.wrong}” / “{c.success}”</p>
        </Sec>
      ))}

      <Sec brk>
        <h2 className="serif text-3xl font-light">Round 4: The Access Logs</h2>
        {ROUND4_GUIDE.map((q) => (
          <div key={q.q} className="mt-5">
            <H>{q.q}</H>
            <pre className="mono mt-1 overflow-x-auto bg-bone p-3 text-[14px]">{q.code}</pre>
            <p className="mt-1 text-[14px]">Blanks: <span className="mono">{q.blanks}</span>. {q.note}</p>
          </div>
        ))}
        <H>Final incident note (opens after 4/4)</H>
        <table className="mt-1 w-full text-left text-[15px]"><tbody>{INCIDENT_NOTE.map(([k, v]) => <tr key={k} className="border-b border-ink/10"><td className="py-1.5 pr-4">{k}</td><td className="mono py-1.5">{v}</td></tr>)}</tbody></table>
      </Sec>

      <Sec brk>
        <h2 className="serif text-3xl font-light">Round 5: The Last Sealed File</h2>
        <p className="mt-2 text-[14px] text-graphite">All forensic reports and the statement are fictional game evidence written for this round.</p>
        <H>Evidence steps (in order; the server refuses skipped steps)</H>
        <ol className="mt-1 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed">{ROUND5_GUIDE.steps.map(([k, v]) => <li key={k}><span className="font-medium">{k}.</span> {v}</li>)}</ol>
        <H>Reference profiles</H><ul className="mt-1 list-disc space-y-1 pl-5 text-[15px]">{ROUND5_GUIDE.profiles.map((p) => <li key={p}>{p}</li>)}</ul>
        <H>Final statement</H>
        <table className="mt-1 w-full text-left text-[15px]"><tbody>{ROUND5_GUIDE.statement.map(([k, v]) => <tr key={k} className="border-b border-ink/10"><td className="py-1.5 pr-4">{k}</td><td className="mono py-1.5">{v}</td></tr>)}</tbody></table>
        <p className="mt-2 text-[14px]">Wrong: “{ROUND5_GUIDE.statementWrong}” A correct statement opens the lock but does not stop the clock.</p>
        <H>Treasure lock</H><p className="mono mt-1 border-l-2 border-wine pl-3 text-[15px] font-semibold">{ROUND5_GUIDE.lock}</p>
        <p className="mt-2 text-[14px]">Wrong: “{ROUND5_GUIDE.lockWrong}” The correct code completes the game once and freezes the clock. The team stays in {GUIDE_ROUTE[4].room} to collect the treasure from the coordinator.</p>
      </Sec>

      <Sec>
        <h2 className="serif text-3xl font-light">Technical answer key</h2>
        <table className="mt-4 w-full text-left text-[15px]"><tbody>{ANSWER_KEY.map(([k, v]) => <tr key={k} className="border-b border-ink/10"><td className="py-2 pr-4 font-medium">{k}</td><td className="mono py-2">{v}</td></tr>)}</tbody></table>
      </Sec>
    </main>
  );
}
