"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

/* Shared frame for the two sign-in screens: the office photograph beside a quiet form. */
export default function AccessShell({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".a-img", { scale: 1.08 }, { scale: 1, duration: 2.4, ease: "power2.out" });
      gsap.fromTo(".a-in", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "power3.out", delay: 0.15 });
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <main ref={root} className="grid min-h-[100svh] md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="relative hidden overflow-hidden bg-ink md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/office.jpg" alt="" aria-hidden className="a-img absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "70% 50%", filter: "saturate(.5) brightness(.65) contrast(1.05)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 to-transparent" />
        <p className="serif absolute bottom-10 left-10 right-10 text-[clamp(1.6rem,2.6vw,2.4rem)] font-light leading-tight text-bone">The Malhotra Case</p>
      </div>
      <section className="flex items-center px-6 py-14 md:px-14">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
