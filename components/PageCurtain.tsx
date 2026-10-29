"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";

/* Full-screen charcoal curtain used for page transitions. Fire with go(href, label). */
export default function PageCurtain() {
  const router = useRouter();
  const pathname = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const pending = useRef<{ href: string } | null>(null);
  const first = useRef(true);

  /* the next navigation is accepted as soon as the new page is showing, not only after the curtain has finished lifting */
  const reveal = () => {
    if (!panel.current) return;
    pending.current = null;
    gsap.to(label.current, { opacity: 0, duration: 0.25 });
    gsap.to(panel.current, {
      yPercent: -100, duration: 0.75, delay: 0.2, ease: "power3.inOut",
      onComplete: () => { if (!pending.current) gsap.set(panel.current, { display: "none" }); },
    });
  };

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail as { href: string; label?: string };
      if (pending.current || !panel.current) return;
      if (d.href === window.location.pathname) return;
      pending.current = { href: d.href };
      gsap.killTweensOf([panel.current, label.current]);
      if (label.current) label.current.textContent = d.label ?? "";
      gsap.set(panel.current, { display: "flex", yPercent: 100 });
      gsap.set(label.current, { opacity: 0, y: 12 });
      gsap.to(panel.current, { yPercent: 0, duration: 0.65, ease: "power3.inOut", onComplete: () => router.push(d.href) });
      gsap.to(label.current, { opacity: 1, y: 0, duration: 0.5, delay: 0.35 });
      const mine = pending.current;
      window.setTimeout(() => { if (pending.current === mine) reveal(); }, 4000); // failsafe
    };
    window.addEventListener("mc:go", h);
    return () => window.removeEventListener("mc:go", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (pending.current) reveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div ref={panel} aria-hidden className="pointer-events-none fixed inset-0 z-[90] hidden items-center justify-center bg-ink" style={{ display: "none" }}>
      <div ref={label} className="serif px-6 text-center text-3xl text-bone md:text-5xl" />
    </div>
  );
}
