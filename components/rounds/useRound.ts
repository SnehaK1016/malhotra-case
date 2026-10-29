"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, go, useCaseState, RoundPayload, Recap } from "@/lib/client";

export type Outcome = { correct: boolean; message: string; detail: string | null; lines?: string[] | null; recap?: Recap | null } | null;

export function useRound(n: number) {
  const cs = useCaseState();
  const [data, setData] = useState<RoundPayload | null>(null);
  const [locked, setLocked] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [busy, setBusy] = useState(false);
  const [hintMsg, setHintMsg] = useState("");
  const [transfer, setTransfer] = useState(false);
  const autoOpened = useRef(false);

  const load = useCallback(async () => {
    const r = await api<RoundPayload & { error?: string }>(`/api/round/${n}`);
    if (r.status === 401) return go("/access");
    if (!r.ok) { setLocked(r.data.error ?? "This folder is locked."); setTimeout(() => go("/case", "Case file"), 2200); return; }
    setData(r.data);
    if (r.data.complete) setOutcome({ correct: true, message: "VERIFIED", detail: null, lines: r.data.lines, recap: r.data.recap });
  }, [n]);
  useEffect(() => { load(); }, [load]);

  /* returning to a round whose handoff is still open (refresh, or the previous code was re-entered): show the handoff again */
  const inHandoff = cs.state?.handoff?.round === n;
  useEffect(() => {
    if (inHandoff && data?.complete && !autoOpened.current) { autoOpened.current = true; setTransfer(true); }
  }, [inHandoff, data?.complete]);

  const submit = async (answer: Record<string, string>) => {
    setBusy(true);
    const r = await api<any>("/api/submit", { round: n, answer });
    setBusy(false);
    if (!r.ok) { setOutcome({ correct: false, message: "SUBMISSION NOT ACCEPTED.", detail: r.data.error ?? "Try again." }); return false; }
    if (r.data.correct) {
      autoOpened.current = true;
      if (r.data.state) cs.setState(r.data.state);
      setOutcome(r.data); setData((d) => (d ? { ...d, complete: true } : d));
      // the verified result shows first; the navigation puzzle follows
      if (r.data.state?.handoff?.round === n) window.setTimeout(() => setTransfer(true), 1700);
      return true;
    }
    setOutcome(r.data); cs.refresh();
    return false;
  };

  const hint = async () => {
    const r = await api<any>("/api/hint", { round: n });
    if (!r.ok) { setHintMsg(r.data.error ?? "No hint available."); return; }
    setHintMsg(`HINT PENALTY +${r.data.cost}`);
    setData((d) => d && { ...d, hints: [...d.hints, { no: r.data.no, text: r.data.text, cost: r.data.cost }], nextHintCost: r.data.nextHintCost });
    cs.refresh();
  };

  /* where the "next" action of a verified round leads */
  const s = cs.state;
  const nextOpen = n < 5 && !!s && s.rounds[n]?.status !== "locked";
  const next = () => {
    if (inHandoff) return setTransfer(true);
    if (nextOpen) return go(`/case/round/${n + 1}`, `Round 0${n + 1}`);
    go("/case", "Case file");
  };
  const nextLabel = inHandoff ? (s?.handoff?.solved ? "Show your next room" : "Round complete. Where next?") : nextOpen ? `Continue to Round ${n + 1}` : "Back to the case file";

  return { ...cs, data, locked, outcome, setOutcome, busy, submit, hint, hintMsg, complete: !!data?.complete, transfer, setTransfer, next, nextLabel, inHandoff };
}
