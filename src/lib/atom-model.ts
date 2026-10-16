import type { ChemicalElement } from "@/types/element";
import { SHELL_LABELS } from "@/lib/element-utils";

export type AtomPoint = [number, number, number];

export interface AtomShell {
  label: (typeof SHELL_LABELS)[number];
  principalNumber: number;
  electronCount: number;
  radius: number;
  /** Euler tilt of the ring so stacked shells read as 3D. */
  rotation: AtomPoint;
  /** Local coordinates on a schematic ring — not quantum orbital positions. */
  electrons: AtomPoint[];
}

export interface AtomModel {
  protonCount: number;
  electronCount: number;
  /** Radius of the outermost shell, for camera framing. */
  radius: number;
  shells: AtomShell[];
}

const INNER_RADIUS = 0.85;
const SHELL_SPACING = 0.45;

/**
 * Neutral-atom Bohr-style teaching diagram. Radii, tilts and electron spacing
 * are visual conventions only; no physical radius, trajectory or neutron count
 * is implied. Pure and renderer-agnostic (usable by WebGL, SVG or tests).
 */
export function createAtomModel(
  element: Pick<ChemicalElement, "number" | "shellElectrons">,
): AtomModel {
  const { number, shellElectrons } = element;
  const valid =
    Number.isInteger(number) &&
    number >= 1 &&
    number <= 118 &&
    shellElectrons.length >= 1 &&
    shellElectrons.length <= SHELL_LABELS.length &&
    shellElectrons.every(
      (count, i) => Number.isInteger(count) && count >= 1 && count <= 2 * (i + 1) ** 2,
    ) &&
    shellElectrons.reduce((total, count) => total + count, 0) === number;
  if (!valid) {
    throw new RangeError("中性原子的殼層電子數必須有效，且總和等於原子序。");
  }

  const shells = shellElectrons.map((electronCount, index): AtomShell => {
    const radius = INNER_RADIUS + index * SHELL_SPACING;
    const phase = index * 0.7; // stagger so electrons don't line up across shells
    return {
      label: SHELL_LABELS[index],
      principalNumber: index + 1,
      electronCount,
      radius,
      rotation: [index % 2 === 0 ? 0.24 : -0.24, index * 0.1, 0],
      electrons: Array.from({ length: electronCount }, (_, i) => {
        const angle = (i / electronCount) * Math.PI * 2 + phase;
        return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
      }),
    };
  });

  return {
    protonCount: number,
    electronCount: number,
    radius: shells[shells.length - 1].radius,
    shells,
  };
}
