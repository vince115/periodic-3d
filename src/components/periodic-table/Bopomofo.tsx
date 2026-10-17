import type { CSSProperties } from "react";
import { splitBopomofo } from "@/lib/element-utils";

interface BopomofoProps {
  value: string;
  /**
   * "horizontal": inline text, tone mark after the letters.
   * "vertical": the printed-textbook layout — letters stacked top to bottom
   * beside the character, tone mark to the right of the last letter and the
   * light-tone dot above the column.
   */
  orientation?: "horizontal" | "vertical";
  className?: string;
}

/**
 * Zhuyin with an enlarged tone mark: in most CJK fonts ˊˇˋ˙ are drawn far
 * smaller than the letters, which makes the tone hard to read.
 */
export function Bopomofo({ value, orientation = "horizontal", className = "" }: BopomofoProps) {
  const { base, mark, tone, toneName } = splitBopomofo(value);
  const label = `${value}（${toneName}）`;

  if (orientation === "vertical") {
    const letters = [...base];
    return (
      <span className={`bopomofo-v ${className}`} style={{ "--letters": letters.length } as CSSProperties}>
        <span className="sr-only">{label}</span>
        {tone === 5 && (
          <span className="bopomofo-v__light" aria-hidden>
            {mark}
          </span>
        )}
        {letters.map((letter, i) => (
          <span key={i} className="bopomofo-v__letter" aria-hidden>
            {letter}
          </span>
        ))}
        {mark && tone !== 5 && (
          <span className="bopomofo-v__tone" aria-hidden>
            {mark}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`bopomofo ${className}`}>
      <span className="sr-only">{label}</span>
      {tone === 5 && (
        <span className="bopomofo__tone bopomofo__tone--light" aria-hidden>
          {mark}
        </span>
      )}
      <span aria-hidden>{base}</span>
      {mark && tone !== 5 && (
        <span className="bopomofo__tone" aria-hidden>
          {mark}
        </span>
      )}
    </span>
  );
}
