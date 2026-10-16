import type { ChemicalElement } from "@/types/element";

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** NFKC folds full-width digits/letters (e.g. "８", "Ｏ") typed via CJK IMEs. */
export function normalizeQuery(query: string): string {
  return query.normalize("NFKC").trim().toLowerCase();
}

/** Lower rank = better match. */
const MatchRank = {
  ExactNumber: 0,
  ExactSymbol: 1,
  ExactName: 2,
  NamePrefix: 3,
  SymbolPrefix: 4,
  NameContains: 5,
} as const;
type MatchRank = (typeof MatchRank)[keyof typeof MatchRank];

function rankMatch(el: ChemicalElement, q: string): MatchRank | null {
  if (/^\d+$/.test(q)) {
    return Number(q) === el.number ? MatchRank.ExactNumber : null;
  }
  const symbol = el.symbol.toLowerCase();
  const name = el.name.toLowerCase();
  const nameZh = el.nameZh;
  if (symbol === q) return MatchRank.ExactSymbol;
  if (name === q || nameZh === q) return MatchRank.ExactName;
  if (name.startsWith(q) || nameZh.startsWith(q)) return MatchRank.NamePrefix;
  if (symbol.startsWith(q)) return MatchRank.SymbolPrefix;
  if (name.includes(q) || nameZh.includes(q)) return MatchRank.NameContains;
  return null;
}

/**
 * Matches English name, Traditional Chinese name, symbol or atomic number.
 * Results are ordered by match quality, then atomic number.
 */
export function searchElements(
  elements: readonly ChemicalElement[],
  query: string,
): ChemicalElement[] {
  const q = normalizeQuery(query);
  if (!q) return [];
  return elements
    .map((el) => ({ el, rank: rankMatch(el, q) }))
    .filter((m): m is { el: ChemicalElement; rank: MatchRank } => m.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.el.number - b.el.number)
    .map((m) => m.el);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function decimalsOf(value: number): number {
  const text = String(value);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

/**
 * Standard weights keep the precision implied by their uncertainty
 * (1.0080 ± 0.0002 → "1.0080"); mass numbers are bracketed ("[294]").
 */
export function formatAtomicMass(el: ChemicalElement): string {
  if (el.atomicMassKind === "mass-number") return `[${el.atomicMass}]`;
  const decimals = el.atomicMassUncertainty === null ? 0 : decimalsOf(el.atomicMassUncertainty);
  return el.atomicMass.toFixed(Math.max(decimals, decimalsOf(el.atomicMass)));
}

export interface ConfigurationPart {
  /** "[Ar]" core or a subshell label such as "3d". */
  label: string;
  /** Electron count rendered as a superscript; null for the core. */
  count: number | null;
}

export function parseElectronConfiguration(config: string): ConfigurationPart[] {
  return config
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const sub = token.match(/^(\d[spdf])(\d+)$/);
      return sub ? { label: sub[1], count: Number(sub[2]) } : { label: token, count: null };
    });
}

const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

export function toSuperscript(value: number): string {
  return String(value).replace(/\d/g, (d) => SUPERSCRIPT_DIGITS[Number(d)]);
}

/** Plain-text rendering, e.g. "[Ar] 3d⁶ 4s²" — for aria labels and copying. */
export function formatElectronConfiguration(config: string): string {
  return parseElectronConfiguration(config)
    .map((p) => (p.count === null ? p.label : `${p.label}${toSuperscript(p.count)}`))
    .join(" ");
}

export const SHELL_LABELS = ["K", "L", "M", "N", "O", "P", "Q"] as const;

export function formatGroup(el: ChemicalElement): string {
  return el.group === null ? "—" : String(el.group);
}

// ---------------------------------------------------------------------------
// Zhuyin
// ---------------------------------------------------------------------------

const TONE_MARKS: Record<string, 2 | 3 | 4 | 5> = { "ˊ": 2, "ˇ": 3, "ˋ": 4, "˙": 5 };
const TONE_NAMES = { 1: "一聲", 2: "二聲", 3: "三聲", 4: "四聲", 5: "輕聲" } as const;

export interface BopomofoSyllable {
  /** Zhuyin letters without the tone mark, e.g. "ㄌㄩ". */
  base: string;
  /** Tone mark ("" for the unmarked first tone). */
  mark: string;
  tone: keyof typeof TONE_NAMES;
  toneName: (typeof TONE_NAMES)[keyof typeof TONE_NAMES];
}

/** Splits "ㄌㄩˇ" into its letters and tone so the mark can be styled on its own. */
export function splitBopomofo(syllable: string): BopomofoSyllable {
  const match = syllable.match(/^(˙?)(.*?)([ˊˇˋ]?)$/u)!;
  const mark = match[1] || match[3];
  const tone = TONE_MARKS[mark] ?? 1;
  return { base: match[2], mark, tone, toneName: TONE_NAMES[tone] };
}
