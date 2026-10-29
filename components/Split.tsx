/* Splits text into per-character spans inside masks, for staggered reveals. Words never break mid-word. */
export function Chars({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((word, wi, all) => (
        <span key={wi} aria-hidden className="inline-block whitespace-nowrap">
          {word.split("").map((c, i) => (
            <span key={i} className="inline-block overflow-hidden align-bottom" style={{ lineHeight: 1.05 }}>
              <span className="char inline-block will-change-transform">{c}</span>
            </span>
          ))}
          {wi < all.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}
export function Words({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="word inline-block" style={{ marginRight: "0.28em" }}>{w}</span>
      ))}
    </span>
  );
}
