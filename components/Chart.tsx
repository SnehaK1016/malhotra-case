import type { ChartData } from "@/lib/client";

/* Restrained SVG bar chart: charcoal on stone, no gradients, no animation noise. */
export default function Chart({ data }: { data: ChartData }) {
  const W = 680, H = 300, L = 48, R = 12, T = 18, B = 62;
  const vals = data.series[0].values;
  const max = Math.max(...vals, 1);
  const nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); const m = max / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; })();
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => nice * f);
  const bw = (W - L - R) / vals.length;
  const y = (v: number) => T + (H - T - B) * (1 - v / nice);
  const fmt = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v * 100) / 100));
  return (
    <figure className="border border-ink/15 bg-bone p-4">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="serif text-lg">{data.title}</span>
        <span className="text-xs text-ink/60">{data.series[0].name}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={data.title} className="w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#cbc6bc" strokeWidth="1" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#667482" className="mono">{fmt(t)}</text>
          </g>
        ))}
        {vals.map((v, i) => {
          const x = L + i * bw + bw * 0.18;
          const w = bw * 0.64;
          return (
            <g key={i}>
              <rect x={x} y={y(v)} width={w} height={Math.max(0, H - B - y(v))} fill="#2b2b2e" />
              {vals.length <= 14 && <text x={x + w / 2} y={y(v) - 5} textAnchor="middle" fontSize="9.5" fill="#2b2b2e" className="mono">{fmt(v)}</text>}
              <text transform={`translate(${x + w / 2},${H - B + 14}) rotate(${data.labels.length > 8 ? -42 : 0})`} textAnchor={data.labels.length > 8 ? "end" : "middle"} fontSize="10" fill="#2b2b2e" className="mono">{data.labels[i]}</text>
            </g>
          );
        })}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#2b2b2e" />
      </svg>
      {data.note && <p className="mt-2 text-xs text-ink/60">{data.note}</p>}
    </figure>
  );
}
