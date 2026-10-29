"use client";
/* The K-01 laboratory report, drawn once in SVG (600 × 760). The four torn fragments are clips of this same drawing,
 * so the seal, border corners and ruled lines only line up in the one correct arrangement. Fictional game evidence. */

export const RW = 600, RH = 760;
export const CX = 300, CY = 380; // where the two tears cross: the centre of the seal

/* deterministic torn edges; both tears pass exactly through the seal centre */
const V_OFF = [0, 7, -5, 9, -8, 4, -9, 6, -4, 8, 0, -7, 5, -9, 7, -4, 9, -6, 5, -8, 0];
const H_OFF = [0, -6, 8, -4, 7, -9, 5, -7, 9, -5, 0, 6, -8, 4, -7, 9, -5, 8, -6, 7, 0];
export const vTear = V_OFF.map((o, i) => [CX + o, i * 38] as const);   // top → bottom, y = 0..760
export const hTear = H_OFF.map((o, i) => [i * 30, CY + o] as const);   // left → right, x = 0..600
const pts = (a: readonly (readonly [number, number])[]) => a.map(([x, y]) => `${x},${y}`).join(" ");

export type Slot = "tl" | "tr" | "bl" | "br";
export const SLOTS: Slot[] = ["tl", "tr", "bl", "br"];
export const SLOT_LABEL: Record<Slot, string> = { tl: "top-left", tr: "top-right", bl: "bottom-left", br: "bottom-right" };
export const ORIGIN: Record<Slot, [number, number]> = { tl: [0, 0], tr: [CX, 0], bl: [0, CY], br: [CX, CY] };

/* polygon of each quarter of the page, bounded by the page edge and the two tears */
export function quarter(q: Slot): string {
  const vTop = vTear.slice(0, 11), vBot = vTear.slice(10);
  const hLeft = hTear.slice(0, 11), hRight = hTear.slice(10);
  if (q === "tl") return pts([[0, 0], ...vTop, ...[...hLeft].reverse()]);
  if (q === "tr") return pts([[RW, 0], [RW, CY], ...[...hRight].reverse().slice(0, -1), ...[...vTop].reverse()]);
  if (q === "bl") return pts([[0, RH], ...[...vBot].reverse(), ...[...hLeft].reverse()]);
  return pts([[RW, RH], [RW, CY], ...[...hRight].reverse(), ...vBot]);
}

const T = ({ x, y, children, size = 16, weight = 400, fill = "#2b2b2e", anchor = "start", mono = false }: { x: number; y: number; children: React.ReactNode; size?: number; weight?: number; fill?: string; anchor?: "start" | "middle" | "end"; mono?: boolean }) => (
  <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor} fontFamily={mono ? "var(--font-mono), monospace" : "var(--font-sans), sans-serif"}>{children}</text>
);

/* the page itself; `classification` is only passed in after the server has revealed it */
export function ReportArt({ classification, labelLifted = false, labelFaded = false, annotate = false }: { classification?: { abo: string; rh: string } | null; labelLifted?: boolean; labelFaded?: boolean; annotate?: boolean }) {
  return (
    <g>
      <rect x="0" y="0" width={RW} height={RH} fill="#f3efe4" />
      <rect x="20" y="20" width="560" height="720" fill="none" stroke="#2b2b2e" strokeWidth="2.5" />
      <rect x="28" y="28" width="544" height="704" fill="none" stroke="#2b2b2e" strokeWidth="1" />
      {/* corner ticks make each corner fragment distinctive */}
      {[[28, 28, 1, 1], [572, 28, -1, 1], [28, 732, 1, -1], [572, 732, -1, -1]].map(([x, y, dx, dy], i) => <path key={i} d={`M${x + dx * 18} ${y} L${x} ${y} L${x} ${y + dy * 18}`} fill="none" stroke="#6e1f2b" strokeWidth="3" />)}
      <T x={300} y={78} size={22} weight={600} anchor="middle">Malhotra Case / Forensic Examination</T>
      <T x={300} y={104} size={13} anchor="middle" mono fill="#5b5750">LABORATORY RETURN · EVIDENCE ITEM K-01</T>
      {Array.from({ length: 17 }, (_, i) => 150 + i * 34).map((y) => <line key={y} x1="48" x2="552" y1={y + 8} y2={y + 8} stroke="#9fb0c8" strokeWidth="1" />)}
      <T x={56} y={152}>Evidence item: <tspan fontWeight={600}>K-01</tspan></T>
      <T x={56} y={186}>Description: knife recovered from the executive office.</T>
      <T x={56} y={254} weight={600}>Sample K-01A · collection: blade</T>
      <T x={56} y={288}>Finding: DNA matches A. Malhotra’s reference sample.</T>
      {/* laboratory seal, centred where the tears cross */}
      <g transform={`translate(${CX} ${CY})`}>
        <circle r="58" fill="none" stroke="#6e1f2b" strokeWidth="3" />
        <circle r="50" fill="none" stroke="#6e1f2b" strokeWidth="1.2" />
        {Array.from({ length: 12 }, (_, i) => i * 30).map((a) => <line key={a} x1="0" y1="-30" x2="0" y2="-44" stroke="#6e1f2b" strokeWidth={a % 90 === 0 ? 3 : 1.4} transform={`rotate(${a})`} />)}
        <path d="M0 -20 L20 0 L0 20 L-20 0 Z" fill="none" stroke="#6e1f2b" strokeWidth="2.4" />
        <circle r="6" fill="#6e1f2b" />
        <text y="-63" textAnchor="middle" fontSize="10" fill="#6e1f2b" fontFamily="var(--font-mono), monospace">MC FORENSIC LAB</text>
      </g>
      <T x={56} y={492} weight={600}>Sample K-01B · collection: protected recess near the handle</T>
      <T x={56} y={526}>Finding: separate blood trace, suitable for classification</T>
      <T x={56} y={560}>and individual comparison.</T>
      <T x={56} y={628} weight={600}>K-01B classification:</T>
      {classification && (
        <g className="class-reveal">
          <T x={280} y={628} mono size={17} weight={700}>ABO group: {classification.abo}</T>
          <T x={280} y={662} mono size={17} weight={700}>Rh(D): {classification.rh}</T>
          <path className="pencil" d="M278 670 C 330 674, 400 668, 452 672" fill="none" stroke="#6e1f2b" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {/* damaged archival label over the classification only */}
      <g style={{ transform: labelLifted ? "translate(10px,-34px) rotate(-7deg)" : "rotate(-2.5deg)", transformOrigin: "400px 640px", transformBox: "view-box", opacity: labelLifted ? 0.16 : labelFaded ? 0.35 : 1, transition: "transform .6s ease, opacity .5s ease" }}>
        <rect x="262" y="600" width="282" height="84" fill="#c8b189" />
        <path d="M262 600 l20 -4 l18 5 l24 -3 l30 4 l26 -4 l28 3 l30 -4 l22 4 l28 -3 l20 4 l16 -2 v84 l-18 3 l-24 -4 l-28 3 l-30 -3 l-26 4 l-30 -4 l-22 3 l-28 -4 l-24 4 l-18 -3 z" fill="#bfa679" />
        {[618, 634, 650, 666].map((y) => <line key={y} x1="276" x2="528" y1={y} y2={y} stroke="#7a6542" strokeOpacity=".35" strokeWidth="5" strokeDasharray="22 9 40 7" />)}
      </g>
      {annotate && <text x="544" y="592" textAnchor="end" fontSize="13" fontStyle="italic" fill="#6e1f2b" fontFamily="var(--font-serif), serif">Examine beneath the damaged label.</text>}
      <T x={556} y={714} size={12} anchor="end" fill="#5b5750">Fictional game evidence · Examiner ________</T>
    </g>
  );
}
