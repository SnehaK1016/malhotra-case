"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* seeded jagged "torn" clip-path */
export function jag(seed: number, sides: string): string {
  let a = seed * 9301 + 49297;
  const rnd = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
  const pts: string[] = [];
  const j = (on: boolean) => (on ? 0.4 + rnd() * 2.4 : 0);
  for (let x = 0; x <= 100; x += 4) pts.push(`${x}% ${j(sides.includes("t"))}%`);
  for (let y = 4; y <= 100; y += 5) pts.push(`${100 - j(sides.includes("r"))}% ${y}%`);
  for (let x = 96; x >= 0; x -= 4) pts.push(`${x}% ${100 - j(sides.includes("b"))}%`);
  for (let y = 96; y >= 4; y -= 5) pts.push(`${j(sides.includes("l"))}% ${y}%`);
  return `polygon(${pts.join(",")})`;
}

export function Paper({ children, className = "", style, rot = 0, torn, seed = 3, tone = "", tape, fold, onClick, z }: {
  children?: React.ReactNode; className?: string; style?: React.CSSProperties; rot?: number; torn?: string; seed?: number; tone?: "ledger" | "blue" | "kraft" | "white" | ""; tape?: "tl" | "tr" | "top"; fold?: boolean; onClick?: () => void; z?: number;
}) {
  /* a caller that positions the paper itself (absolute, fixed, sticky) must not also receive "relative" */
  const positioned = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className);
  return (
    <div onClick={onClick} className={`${positioned ? "" : "relative "}${className}`} style={{ transform: `rotate(${rot}deg)`, filter: "drop-shadow(0 12px 14px rgba(0,0,0,.42)) drop-shadow(0 1px 1px rgba(0,0,0,.45))", zIndex: z, ...style }}>
      <div className={`paper-surface ${tone ? `tone-${tone}` : ""} ${fold ? "fold" : ""} h-full w-full`} style={{ clipPath: torn ? jag(seed, torn) : undefined }}>{children}</div>
      {tape && <span className="tape" style={{ top: -9, left: tape === "tr" ? undefined : tape === "top" ? "calc(50% - 37px)" : 10, right: tape === "tr" ? 10 : undefined, transform: `rotate(${tape === "tr" ? 5 : -4}deg)` }} />}
    </div>
  );
}

export const Stamp = ({ children, rot = -8, className = "" }: { children: React.ReactNode; rot?: number; className?: string }) => (
  <span className={`stamp ${className}`} style={{ transform: `rotate(${rot}deg)` }}>{children}</span>
);

/* Section of a round. Locked stages stay visible but dimmed until the investigator has earned them. */
export function Stage({ id, title, lede, unlocked = true, lockHint, children, tone = "dark", className = "" }: {
  id?: string; title: string; lede?: string; unlocked?: boolean; lockHint?: string; children: React.ReactNode; tone?: "dark" | "paper"; className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const was = useRef(unlocked);
  useEffect(() => {
    if (unlocked && !was.current && ref.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(ref.current.querySelector("[data-body]"), { y: 24 }, { y: 0, duration: 0.9, ease: "power3.out" });
    }
    was.current = unlocked;
  }, [unlocked]);
  return (
    <section id={id} ref={ref} className={`relative px-5 py-20 md:px-10 md:py-28 ${tone === "dark" ? "scene-dark" : "bg-paper text-ink"} ${className}`}>
      <div className="mx-auto max-w-[1280px]">
        <header data-reveal className="mb-10 max-w-2xl">
          <h2 className="serif text-[clamp(2rem,4.4vw,3.6rem)] font-light leading-[1.05]">{title}</h2>
          {lede && <p className={`mt-4 text-lg ${tone === "dark" ? "text-bone/65" : "text-graphite"}`}>{lede}</p>}
        </header>
        <div data-body className="relative min-w-0">
          <div className={`transition-all duration-700 ${unlocked ? "" : "pointer-events-none select-none opacity-30 blur-[3px]"}`} aria-hidden={!unlocked} {...(!unlocked ? { inert: "" as unknown as boolean } : {})}>{children}</div>
          {!unlocked && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <p className="serif max-w-sm bg-ink/80 px-6 py-4 text-center text-xl text-bone backdrop-blur-sm">{lockHint ?? "Not yet. Finish examining the evidence above."}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* gentle scroll reveal for headings and evidence marked with data-reveal */
export function useReveal(root: React.RefObject<HTMLElement>, deps: unknown[] = []) {
  useEffect(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(el, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
      });
    }, root);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* sections carry scroll-margin for the sticky header (see globals.css) */
export const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

/* Generic evidence document built from server-supplied blocks, with liftable redactions. */
export type Block =
  | { t: "p"; text: string }
  | { t: "kv"; k: string; v: string }
  | { t: "rows"; head: string[]; rows: (string | { r: string; v: string })[][] };
export type Doc = { id: string; theme: string; title: string; sub: string; stamp: string; blocks: Block[] };

export function DocBody({ doc, lifted, lift, big }: { doc: Doc; lifted: Set<string>; lift?: (id: string) => void; big?: boolean }) {
  const cell = (c: string | { r: string; v: string }, k: number) =>
    typeof c === "string" ? <td key={k} className="border-b border-black/10 px-2 py-1.5">{c}</td> : (
      <td key={k} className="border-b border-black/10 px-2 py-1.5">
        {lift ? (
          <span role="button" tabIndex={0} aria-label="Lift redaction" className={`redact ${lifted.has(c.r) ? "lifted" : ""}`} onClick={() => lift?.(c.r)} onKeyDown={(e) => e.key === "Enter" && lift?.(c.r)}>{c.v}</span>
        ) : (
          <span aria-hidden className={`redact ${lifted.has(c.r) ? "lifted" : ""}`} style={{ cursor: "inherit" }}>{c.v}</span>
        )}
      </td>
    );
  return (
    <div className={`${big ? "p-6 text-[15px] md:p-8" : "p-4 text-[11px]"} min-w-0`}>
      <div className={`flex items-start justify-between gap-3 border-b-2 border-black/70 pb-2 ${doc.theme === "certificate" ? "text-center" : ""}`}>
        <div className="min-w-0 flex-1">
          <h3 className={`serif font-semibold leading-tight ${big ? "text-2xl" : "text-[13px]"}`}>{doc.title}</h3>
          <p className={`mono mt-0.5 text-black/55 ${big ? "text-xs" : "text-[8px]"}`}>{doc.sub}</p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {doc.blocks.map((b, i) =>
          b.t === "p" ? <p key={i} className="leading-snug text-black/75">{b.text}</p>
          : b.t === "kv" ? <div key={i} className="flex flex-wrap justify-between gap-x-3 border-b border-dotted border-black/25 pb-0.5"><span className="text-black/55">{b.k}</span><span className="mono ml-auto min-w-0 break-words text-right font-medium">{b.v}</span></div>
          : (
            <div key={i} className="max-w-full overflow-x-auto">
              <table className="mono w-full text-left"><thead><tr>{b.head.map((h) => <th key={h} className="border-b border-black/60 px-2 py-1 text-[0.85em] font-semibold">{h}</th>)}</tr></thead>
                <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map(cell)}</tr>)}</tbody></table>
            </div>
          ))}
      </div>
      {/* the stamp sits in normal flow below the content, so it can never cover text */}
      <div className={`flex justify-end ${big ? "mt-6" : "mt-2"}`}><Stamp rot={-6} className={big ? "" : "!text-[0.5rem] !px-1.5"}>{doc.stamp}</Stamp></div>
    </div>
  );
}
