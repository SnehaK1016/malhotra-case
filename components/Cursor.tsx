"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rx = gsap.quickTo(ring.current, "x", { duration: 0.45, ease: "power3" });
    const ry = gsap.quickTo(ring.current, "y", { duration: 0.45, ease: "power3" });
    const dx = gsap.quickTo(dot.current, "x", { duration: 0.1 });
    const dy = gsap.quickTo(dot.current, "y", { duration: 0.1 });
    const move = (e: PointerEvent) => { rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY); gsap.to([ring.current, dot.current], { opacity: 1, duration: 0.3, overwrite: "auto" }); };
    const over = (e: PointerEvent) => {
      const t = (e.target as HTMLElement)?.closest("a,button,[data-cursor],select,summary");
      gsap.to(ring.current, { scale: t ? 1.9 : 1, duration: 0.3 });
    };
    const leave = () => gsap.to([ring.current, dot.current], { opacity: 0, duration: 0.3 });
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", over);
    document.addEventListener("pointerleave", leave);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerover", over); document.removeEventListener("pointerleave", leave); };
  }, []);
  return (
    <>
      <div ref={ring} aria-hidden className="cursor-ui pointer-events-none fixed left-0 top-0 z-[95] -ml-[18px] -mt-[18px] h-9 w-9 rounded-full border border-bone opacity-0 mix-blend-difference" />
      <div ref={dot} aria-hidden className="cursor-ui pointer-events-none fixed left-0 top-0 z-[95] -ml-[2px] -mt-[2px] h-1 w-1 rounded-full bg-bone opacity-0 mix-blend-difference" />
    </>
  );
}
