"use client";
import Hud from "@/components/Hud";
import Dock from "@/components/rounds/Dock";
import { useRound } from "@/components/rounds/useRound";
import RoomTransfer from "@/components/handoff/RoomTransfer";
import Round1 from "@/components/rounds/Round1";
import Round2 from "@/components/rounds/Round2";
import Round3 from "@/components/rounds/Round3";
import Round4 from "@/components/rounds/Round4";
import Round5 from "@/components/rounds/Round5";

const SCENES = [Round1, Round2, Round3, Round4, Round5];

export default function RoundPage({ params }: { params: { n: string } }) {
  const n = Number(params.n);
  const r = useRound(n);
  const { state, offset, data, locked } = r;

  if (locked) return (<><Hud state={state} offset={offset} back /><main className="mx-auto max-w-xl px-6 py-24"><h1 className="serif text-4xl">Folder sealed.</h1><p className="mt-4 text-graphite">{locked} Returning you to the case file.</p></main></>);
  if (!data || !SCENES[n - 1]) return (<><Hud state={state} offset={offset} back /><p className="p-10 text-graphite">Opening evidence folder…</p></>);
  const Scene = SCENES[n - 1];
  return (
    <div className="min-h-screen bg-[#121214] pb-20">
      <Hud state={state} offset={offset} back title={`Round 0${n}: ${data.round.title}`} />
      <Scene r={r} />
      <Dock teamCode={state?.team.code} round={n} data={data} hint={r.hint} hintMsg={r.hintMsg} complete={r.complete} />
      {r.transfer && state?.handoff?.round === n && <RoomTransfer state={state} onState={r.setState} onClose={() => r.setTransfer(false)} />}
    </div>
  );
}
