"use client";
import { forwardRef } from "react";
import { Paper } from "@/components/kit";

/* A dark executive desk seen from above. Built from layered CSS and SVG, lit by a single lamp. */
const DeskScene = forwardRef<HTMLDivElement>(function DeskScene(_, folderRef) {
  const keys = Array.from({ length: 16 });
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#120c08]">
      <div className="absolute left-1/2 top-1/2 aspect-video -translate-x-1/2 -translate-y-1/2" style={{ width: "max(100%, 177.78svh)" }}>
        <div className="desk-wood absolute inset-0" />
        {/* the room beyond the desk edge: the office, out of focus */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/office.jpg" alt="" className="absolute inset-x-0 top-0 h-[34%] w-full object-cover" style={{ filter: "blur(5px) brightness(.5) saturate(.7)", maskImage: "linear-gradient(to bottom, #000 35%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, #000 35%, transparent 100%)", objectPosition: "50% 78%" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 55% 60% at 84% 14%, rgba(255,205,140,.30), rgba(255,205,140,.08) 45%, rgba(0,0,0,0) 70%)" }} />

        {/* faint blood mark near the far edge */}
        <svg className="absolute" style={{ left: "58%", top: "6%", width: "7%", opacity: 0.32, filter: "blur(.6px)" }} viewBox="0 0 60 40"><path d="M6 22c4-10 16-14 26-8 8 4 14 2 18 8-2 8-12 12-22 10-8-2-16 4-20-2-2-3-3-6-2-8z" fill="#5a1620" /><circle cx="52" cy="10" r="2.2" fill="#5a1620" /><circle cx="44" cy="4" r="1.2" fill="#5a1620" /></svg>

        {/* damaged document, coffee ring, burnt corner */}
        <Paper className="absolute" style={{ left: "4%", top: "9%", width: "19%", height: "30%" }} rot={-7} torn="trb" seed={9}>
          <div className="relative h-full p-3">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="mb-2 h-[3px] bg-black/35" style={{ width: `${88 - i * 7}%` }} />)}
            <div className="absolute -right-3 bottom-1 h-16 w-16 rounded-full border-[5px] border-[#6b4a2b]/35" style={{ filter: "blur(.6px)" }} />
            <div className="absolute bottom-0 left-0 h-10 w-12" style={{ background: "radial-gradient(circle at 0 100%, #1a120b 0 45%, transparent 70%)" }} />
          </div>
        </Paper>

        {/* torn paper */}
        <Paper className="absolute" style={{ left: "70%", top: "22%", width: "12%", height: "18%" }} rot={9} torn="tlb" seed={4} tone="white">
          <div className="p-2.5">{[0, 1, 2, 3].map((i) => <div key={i} className="mb-1.5 h-[2px] bg-black/40" style={{ width: `${90 - i * 14}%` }} />)}<div className="font-hand mt-2 text-[1.1vw] text-[#1f3a6b]/80">check idx</div></div>
        </Paper>

        {/* the audit folder */}
        <div ref={folderRef} className="absolute" style={{ left: "37%", top: "14%", width: "27%", height: "56%", perspective: 1400, filter: "drop-shadow(0 18px 18px rgba(0,0,0,.6))" }}>
          <div className="folder-back absolute inset-0 rounded-[2px]" style={{ background: "linear-gradient(135deg,#1d3560,#142748)" }}>
            <div className="absolute -top-[5%] left-[6%] h-[7%] w-[26%] rounded-t-[3px] bg-[#1d3560]" />
          </div>
          <div className="folder-papers absolute inset-[4%]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="folder-sheet absolute inset-0 paper-surface" style={{ transform: `rotate(${(i - 1) * 1.8}deg) translate(${i * 1.2}%, ${i * -1.4}%)`, boxShadow: "0 1px 2px rgba(0,0,0,.4)" }}>
                <div className="p-[6%]">{[0, 1, 2, 3, 4].map((k) => <div key={k} className="mb-[3%] h-[2px] bg-black/30" style={{ width: `${95 - k * 9}%` }} />)}</div>
              </div>
            ))}
          </div>
          <div className="folder-flap absolute inset-0 rounded-[2px]" style={{ transformOrigin: "0% 50%", transform: "rotateY(-22deg)", background: "linear-gradient(135deg,#243f72,#1a3059)", backfaceVisibility: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.07)" }}>
            <div className="absolute left-[10%] top-[12%] w-[62%] bg-[#e5dec9] p-[4%] text-[#1d1b17]" style={{ transform: "rotate(-1.2deg)" }}>
              <p className="mono text-[.7vw] font-bold tracking-widest">INTERNAL AUDIT</p><p className="serif text-[1.3vw]">FY 2025–26</p><p className="mono text-[.6vw]">INDEX 01–99 · RESTRICTED</p>
            </div>
            <div className="absolute bottom-[8%] left-[10%] text-[.8vw] text-white/30 mono">M/A/0314</div>
          </div>
        </div>

        {/* calculator */}
        <div className="absolute rounded-[5px] bg-[#25282b] p-[.7%]" style={{ left: "74%", top: "52%", width: "12%", height: "33%", transform: "rotate(-6deg)", boxShadow: "0 14px 16px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)" }}>
          <div className="mono mb-[6%] flex h-[16%] items-end justify-end rounded-[2px] bg-[#9cae9a] px-[6%] text-[1.2vw] text-[#1b231b]">0.</div>
          <div className="grid h-[72%] grid-cols-4 gap-[5%]">{keys.map((_, i) => <div key={i} className={`rounded-[2px] ${i % 4 === 3 ? "bg-[#6e1f2b]" : "bg-[#3a3f43]"}`} />)}</div>
        </div>

        {/* pen */}
        <div className="absolute" style={{ left: "56%", top: "76%", width: "15%", height: ".9%", transform: "rotate(-14deg)", background: "linear-gradient(to bottom,#7a2634,#3d0f18)", borderRadius: 4, boxShadow: "0 5px 6px rgba(0,0,0,.6)" }}><div className="absolute right-0 top-0 h-full w-[12%] bg-[#bfae8a]" style={{ clipPath: "polygon(0 0,100% 50%,0 100%)" }} /></div>

        {/* coffee cup, from above */}
        <div className="absolute" style={{ left: "86%", top: "6%", width: "7%", aspectRatio: "1" }}>
          <div className="absolute inset-0 rounded-full bg-[#cdc7ba]" style={{ boxShadow: "0 8px 10px rgba(0,0,0,.55)" }} />
          <div className="absolute inset-[12%] rounded-full bg-[#e9e4d8]" /><div className="absolute inset-[22%] rounded-full" style={{ background: "radial-gradient(circle at 40% 35%, #4a2e1c, #1d0f08)" }} />
          <div className="absolute -right-[16%] top-[38%] h-[24%] w-[26%] rounded-r-full border-4 border-l-0 border-[#cdc7ba]" />
        </div>

        {/* evidence marker */}
        <div className="absolute" style={{ left: "33%", top: "62%", width: "3%", transform: "rotate(14deg)", filter: "drop-shadow(0 5px 4px rgba(0,0,0,.6))" }}>
          <div className="mono flex aspect-[1/1.5] items-center justify-center bg-[#c9b48e] text-[1.5vw] font-bold text-[#2a2012]" style={{ clipPath: "polygon(12% 0,88% 0,100% 100%,0 100%)" }}>1</div>
        </div>

        {/* desk lamp base seen from above */}
        <div className="absolute" style={{ left: "93%", top: "34%", width: "6%", aspectRatio: "1" }}>
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 40% 35%, #e9d9b0, #7a6a42 55%, #2a2214)", boxShadow: "0 0 80px 30px rgba(255,205,140,.25)" }} />
        </div>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,.72) 100%)" }} />
      </div>
    </div>
  );
});
export default DeskScene;
