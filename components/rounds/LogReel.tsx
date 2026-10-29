"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { api, Cell } from "@/lib/client";

type Disc = { employee: string; time: string; amount: number; full: string; short: string; related: string; transaction_id: string };
type Row = { time: string; emp: string; action: string; point: string; status: string; tx: string | null };
const H = 34;

/* The case-night access log runs through the day, then freezes on the one entry that matters. */
export default function LogReel({ disc }: { disc: Disc | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const view = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const detail = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const [frozen, setFrozen] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    (async () => {
      const out: Row[] = [];
      for (let p = 0; p < 4; p++) {
        const r = await api<{ columns: string[]; rows: Cell[][]; total: number }>(`/api/dataset?round=4&table=access_logs&q=2026-03-14&sort=login_time&page=${p}`);
        if (!r.ok) break;
        const c = r.data.columns;
        r.data.rows.forEach((x) => out.push({ time: String(x[c.indexOf("login_time")]), emp: String(x[c.indexOf("employee_id")]), action: String(x[c.indexOf("action")]), point: String(x[c.indexOf("access_point")]), status: String(x[c.indexOf("status")]), tx: x[c.indexOf("transaction_id")] as string | null }));
        if (out.length >= r.data.total) break;
      }
      setRows(out);
    })();
  }, []);

  const target = rows.findIndex((r) => r.tx && r.time >= "20:00");

  const play = () => {
    if (!list.current || target < 0 || !view.current) return;
    tl.current?.kill(); setFrozen(false);
    const items = list.current.querySelectorAll<HTMLElement>("[data-row]");
    const mid = view.current.clientHeight / 2 - H / 2;
    const end = -(target * H - mid);
    gsap.set(items, { opacity: 1 }); gsap.set(items[target], { backgroundColor: "rgba(0,0,0,0)" });
    gsap.set(detail.current, { opacity: 0, y: 24 });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => { setFrozen(true); if (clock.current) clock.current.textContent = rows[target].time; };
    if (reduce) { gsap.set(list.current, { y: end }); gsap.set(items, { opacity: (i: number) => (i === target ? 1 : 0.15) }); gsap.set(items[target], { backgroundColor: "rgba(110,31,43,.55)" }); gsap.set(detail.current, { opacity: 1, y: 0 }); finish(); return; }
    gsap.set(list.current, { y: mid });
    const t = gsap.timeline({ onComplete: finish });
    t.to(list.current, { y: end, duration: 6, ease: "power2.inOut", onUpdate: () => {
      const y = Number(gsap.getProperty(list.current, "y")); const i = Math.max(0, Math.min(rows.length - 1, Math.round((mid - y) / H)));
      if (clock.current) clock.current.textContent = rows[i].time;
    } })
      .to(Array.from(items).filter((_, i) => i !== target), { opacity: 0.12, duration: 0.9, stagger: { amount: 0.4 } }, "+=0.15")
      .to(items[target], { backgroundColor: "rgba(110,31,43,.55)", duration: 0.6 }, "<0.2")
      .to(detail.current, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, "+=0.2");
    tl.current = t;
  };

  useEffect(() => {
    if (!disc || !rows.length || started.current || !view.current) return;
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && !started.current) { started.current = true; play(); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(view.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disc, rows.length]);
  useEffect(() => () => { tl.current?.kill(); }, []);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="mono text-sm text-bone/60">Access log, 14 March, in time order · <span ref={clock} className="text-bone">08:00</span></p>
        <button className="btn-ghost !border-bone/40 !px-3 !py-1.5 !text-bone hover:!bg-bone hover:!text-ink" disabled={!disc} onClick={play}>Replay the night</button>
      </div>
      <div ref={view} className="relative h-[340px] overflow-hidden border border-bone/20 bg-[#0d1114]">
        <div ref={list} className="absolute inset-x-0 top-0 will-change-transform">
          {rows.map((r, i) => (
            <div key={i} data-row className="mono flex items-center gap-4 px-4 text-[12px] text-bone/85" style={{ height: H }}>
              <span className="w-12 shrink-0 text-bone">{r.time}</span><span className="w-16 shrink-0">{r.emp}</span><span className="w-40 shrink-0 truncate">{r.action}</span><span className="hidden w-24 shrink-0 text-bone/55 sm:block">{r.point}</span><span className="text-bone/55">{r.status}</span>
            </div>
          ))}
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-[34px] -translate-y-1/2 border-y border-bone/25" style={{ opacity: frozen ? 0 : 1 }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to bottom,#0d1114,transparent 22%,transparent 78%,#0d1114)" }} />
      </div>
      <div ref={detail} className="mt-6 border border-wine/70 bg-wine/10 p-6 opacity-0 md:p-8" aria-live="polite">
        {disc && (
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <p className="serif text-[clamp(3rem,7vw,5.5rem)] font-light leading-none">{disc.time}</p>
            <div>
              <p className="mono text-sm font-semibold tracking-[0.18em] text-sand">TRANSFER ACTIVITY DETECTED</p>
              <p className="serif mt-2 text-4xl">{disc.full} <span className="mono ml-2 text-base text-bone/55">{disc.short.replace("Lakh", "LAKH")}</span></p>
              <dl className="mono mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                <div><dt className="text-bone/50">INITIATED / LINKED ACTIVITY</dt><dd className="text-lg">{disc.employee}</dd></div>
                <div><dt className="text-bone/50">RELATED EMPLOYEE</dt><dd className="text-lg">{disc.related}</dd></div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
