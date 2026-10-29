"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

/* Hundreds of rows collapse into the accounts they land in, then the flow draws itself. */
const xs = [14, 38, 62, 86];
export default function MoneyFlow({ active, source, targets, total }: { active: boolean; source: string; targets: { id: string; count: number; sub?: string }[]; total?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const played = useRef(false);
  useEffect(() => {
    if (!active || played.current || !box.current) return;
    played.current = true;
    const el = box.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paths = el.querySelectorAll<SVGPathElement>(".fl-path");
    paths.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = `${l}`; p.style.strokeDashoffset = reduce ? "0" : `${l}`; });
    if (reduce) { gsap.set([".fl-src", ".fl-node", ".fl-total"], { opacity: 1 }); return; }
    const tl = gsap.timeline();
    const w = el.clientWidth, h = el.clientHeight;
    const chips = Array.from({ length: 56 }, (_, i) => {
      const c = document.createElement("div");
      c.className = "mono pointer-events-none absolute whitespace-nowrap text-[10px] text-sand/80";
      c.textContent = `TX${String(400 + i * 7).padStart(4, "0")} 20:${String(10 + (i % 50)).padStart(2, "0")}`;
      el.appendChild(c);
      gsap.set(c, { x: Math.random() * (w - 90), y: Math.random() * (h * 0.7), opacity: 0 });
      return c;
    });
    tl.to(chips, { opacity: 0.9, duration: 0.5, stagger: 0.012 })
      .to(chips, { x: (i) => (xs[i % 4] / 100) * w - 30, y: h * 0.78, scale: 0.4, opacity: 0, duration: 1.2, ease: "power3.in", stagger: 0.02, onComplete: () => chips.forEach((c) => c.remove()) }, 0.5)
      .fromTo(".fl-node", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12 }, 1.2)
      .fromTo(".fl-src", { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.7 }, 1.6)
      .to(paths, { strokeDashoffset: 0, duration: 1.2, stagger: 0.12, ease: "power2.inOut" }, 1.9)
      .fromTo(".fl-total", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 3);
    return () => { tl.kill(); };
  }, [active]);

  return (
    <div ref={box} className="relative mx-auto aspect-[16/9] w-full max-w-4xl overflow-hidden">
      <svg viewBox="0 0 100 56" className="absolute inset-0 h-full w-full" fill="none">
        {xs.map((x, i) => <path key={i} className="fl-path" d={`M50 15 C 50 32, ${x} 28, ${x} 42`} stroke="#b6a585" strokeWidth=".35" />)}
        {active && xs.map((x, i) => <path key={`d${i}`} className="dashflow" d={`M50 15 C 50 32, ${x} 28, ${x} 42`} stroke="#ece8e1" strokeOpacity=".5" strokeWidth=".18" strokeDasharray="1.2 2.8" />)}
      </svg>
      <div className="fl-src absolute left-1/2 top-[6%] w-[44%] -translate-x-1/2 border border-bone/50 bg-[#17171a] px-3 py-2.5 text-center opacity-0"><p className="mono text-[10px] text-bone/55">SOURCE ACCOUNT</p><p className="serif text-[clamp(.85rem,1.6vw,1.2rem)]">{source}</p></div>
      {targets.map((t, i) => (
        <div key={t.id} className="fl-node absolute w-[20%] -translate-x-1/2 border border-sand/70 bg-[#17171a] px-2 py-2 text-center opacity-0" style={{ left: `${xs[i]}%`, top: "76%" }}>
          <p className="mono text-[clamp(.7rem,1.3vw,1rem)] font-semibold">{t.id}</p><p className="mono text-[clamp(.55rem,1vw,.75rem)] text-bone/55">{t.count} transfers</p>
        </div>
      ))}
      {total !== undefined && <p className="fl-total mono absolute bottom-0 left-0 text-xs text-bone/60 opacity-0">{total} transfers in total · no individuals identified yet</p>}
    </div>
  );
}
