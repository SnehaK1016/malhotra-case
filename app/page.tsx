"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Chars } from "@/components/Split";
import { go } from "@/lib/client";

const IMG = "/images/office.jpg";

/* One opening scene: title, photograph, a single line of story and the way in. */
export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(img.current, { scale: 1.12 }, { scale: 1.04, duration: 6, ease: "power2.out" });
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .fromTo(".char", { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.035 }, 0.3)
        .fromTo(".h-in", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.12 }, 0.9);
    }, root);
    /* a slight push of the photograph with the pointer, on devices that have one */
    const fine = window.matchMedia("(pointer: fine)").matches;
    const move = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * -14, y = (e.clientY / window.innerHeight - 0.5) * -10;
      gsap.to(img.current, { x, y, duration: 1.4, ease: "power2.out" });
    };
    if (fine) window.addEventListener("pointermove", move);
    return () => { ctx.revert(); window.removeEventListener("pointermove", move); };
  }, []);

  return (
    <main ref={root} className="dark-surface relative flex min-h-[100svh] flex-col overflow-hidden bg-ink text-bone">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={IMG} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover will-change-transform" style={{ objectPosition: "62% 50%", filter: "saturate(.55) contrast(1.05) brightness(.62)" }} />
      <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(18,18,20,.94) 0%, rgba(18,18,20,.72) 42%, rgba(18,18,20,.2) 100%), linear-gradient(0deg, rgba(18,18,20,.85), transparent 45%)" }} />

      <header className="relative z-10 flex items-center justify-between px-6 pt-6 md:px-12 md:pt-8">
        <span className="mono text-[11px] tracking-[0.22em] text-bone/70">CASE FILE · MUMBAI</span>
        <a href="/access/organizer" className="text-sm text-bone/75 underline-offset-4 transition-colors hover:text-bone hover:underline">Organizer Login</a>
      </header>

      <section className="relative z-10 flex flex-1 items-center px-6 py-14 md:px-12">
        <div className="max-w-4xl">
          <h1 className="serif overflow-hidden text-[clamp(3.4rem,9.5vw,8.5rem)] font-light leading-[0.92] tracking-[-0.01em]">
            <Chars text="The Malhotra" /><br /><Chars text="Case" />
          </h1>
          <p className="h-in serif mt-8 max-w-xl text-[clamp(1.25rem,2.3vw,1.85rem)] font-light leading-snug text-bone/90">
            A missing fortune. A murdered businessman. Your team must follow the evidence.
          </p>
          <div className="h-in mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <button className="btn-light" onClick={() => go("/access", "Team access")}>Enter Investigation</button>
            <a href="/access/organizer" className="text-sm text-bone/80 underline underline-offset-4 transition-colors hover:text-bone">Organizer Login</a>
          </div>
        </div>
      </section>

      <footer className="h-in relative z-10 px-6 pb-6 md:px-12">
        <p className="max-w-xl text-xs text-bone/55">The Malhotra Case is a work of fiction. All people, companies and data are invented.</p>
      </footer>
    </main>
  );
}
