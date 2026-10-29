"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
type Branch = { company: string; amount: string; person: string };

/* Clean relationship diagram. Lines draw themselves as the board scrolls into view. Persons are "of interest", nothing more. */
export default function RelationBoard({ branches }: { branches: Branch[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lines = el.querySelectorAll<SVGPathElement>(".rb-line");
    lines.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = `${l}`; p.style.strokeDashoffset = reduce ? "0" : `${l}`; });
    if (reduce) return;
    gsap.set(el.querySelectorAll(".rb-node"), { opacity: 0, y: 12 });
    const tl = gsap.timeline({ paused: true });
    tl.to(el.querySelectorAll(".rb-n0"), { opacity: 1, y: 0, duration: 0.6 })
      .to(el.querySelectorAll(".rb-l0"), { strokeDashoffset: 0, duration: 0.6 })
      .to(el.querySelectorAll(".rb-n1"), { opacity: 1, y: 0, duration: 0.6 })
      .to(el.querySelectorAll(".rb-l1"), { strokeDashoffset: 0, duration: 0.7, stagger: 0.1 })
      .to(el.querySelectorAll(".rb-n2"), { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 })
      .to(el.querySelectorAll(".rb-l2"), { strokeDashoffset: 0, duration: 0.6, stagger: 0.1 })
      .to(el.querySelectorAll(".rb-n3"), { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 });
    const st = ScrollTrigger.create({ trigger: el, start: "top 70%", once: true, onEnter: () => tl.play() });
    return () => { st.kill(); tl.kill(); };
  }, [branches.length]);
  const xs = branches.length === 2 ? [27, 73] : [50];
  return (
    <div ref={ref} className="relative mx-auto aspect-[4/3] w-full max-w-4xl md:aspect-[16/10]">
      <svg viewBox="0 0 100 62" className="absolute inset-0 h-full w-full" fill="none" stroke="#b6a585" strokeWidth=".3">
        <path className="rb-line rb-l0" d="M50 10 V 18" />
        {xs.map((x, i) => <path key={`a${i}`} className="rb-line rb-l1" d={`M50 24 C 50 30, ${x} 28, ${x} 34`} />)}
        {xs.map((x, i) => <path key={`b${i}`} className="rb-line rb-l2" d={`M${x} 42 V 48`} />)}
      </svg>
      <div className="rb-node rb-n0 absolute left-1/2 top-0 w-[40%] -translate-x-1/2 border border-bone/50 bg-[#17171a] px-3 py-2 text-center"><p className="serif text-[clamp(.8rem,1.6vw,1.15rem)]">MALHOTRA COMPANY</p></div>
      <div className="rb-node rb-n1 absolute left-1/2 top-[30%] w-[30%] -translate-x-1/2 border border-wine bg-wine/25 px-3 py-2 text-center" style={{ top: "28%" }}><p className="mono text-[clamp(.6rem,1.2vw,.85rem)] tracking-[0.14em]">MISSING FUNDS</p></div>
      {branches.map((b, i) => (
        <div key={b.company}>
          <div className="rb-node rb-n2 absolute w-[36%] -translate-x-1/2 border border-sand/70 bg-[#17171a] px-3 py-2 text-center" style={{ left: `${xs[i]}%`, top: "56%" }}>
            <p className="serif text-[clamp(.75rem,1.5vw,1.1rem)]">{b.company}</p><p className="mono text-[clamp(.6rem,1.2vw,.85rem)] text-sand">{b.amount}</p>
          </div>
          <div className="rb-node rb-n3 absolute w-[36%] -translate-x-1/2 bg-bone px-3 py-2.5 text-center text-ink" style={{ left: `${xs[i]}%`, top: "78%" }}>
            <p className="serif text-[clamp(.9rem,1.9vw,1.4rem)] font-medium">{b.person}</p><p className="mono text-[clamp(.5rem,.9vw,.65rem)] tracking-[0.16em] text-wine">PERSON OF INTEREST</p>
          </div>
        </div>
      ))}
    </div>
  );
}
