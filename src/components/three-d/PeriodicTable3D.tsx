"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CanvasTexture, DoubleSide, SRGBColorSpace, type Mesh } from "three";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Move3d,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTheme } from "@/hooks/useTheme";
import { CATEGORY_COLORS } from "@/lib/element-colors";
import {
  CARD_SIZE,
  TABLE_FRONT_FIT,
  TABLE_LAYOUTS_3D,
  elementPosition3D,
  layoutBounds,
  type TableLayout3D,
  type Vec3,
} from "@/lib/element-position-3d";
import type { Theme } from "@/lib/theme";
import type { ChemicalElement } from "@/types/element";
import { CameraControls } from "./CameraControls";
import { SceneCanvas } from "./SceneCanvas";

export interface PeriodicTable3DProps {
  elements: readonly ChemicalElement[];
  selectedNumber: number | null;
  onSelect: (number: number | null) => void;
  isDimmed: (element: ChemicalElement) => boolean;
}

const LAYOUT_LABELS: Record<TableLayout3D, string> = {
  table: "週期表",
  sphere: "球體",
  helix: "螺旋",
  grid: "格狀",
};

/** Card face colours per theme; the scene backdrop itself comes from CSS tokens. */
const CARD_THEME = {
  dark: { base: "#0d1528", tint: 0.18, tintSelected: 0.55, ink: "#f1f5f9", subInk: "#e2e8f0", edge: 1 },
  light: { base: "#ffffff", tint: 0.24, tintSelected: 0.55, ink: "#0f172a", subInk: "#334155", edge: 0.6 },
} as const;
const DEEP_INK = "#0f172a";
const CARD_FONT = '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif';
/** Same 1 : 1.2 proportion as the 2D tile (see CARD_SIZE). */
const TEXTURE = { width: 216, height: 260 } as const;

const ZOOM = { min: 0.6, max: 3, step: 0.2 } as const;
/** Head-on framing for the flat table: just enough room for the selection ring. */
const TABLE_MARGIN = 1.04;
const ELEVATION_LIMIT = 1.2;
/** Pointer travel (px) above which a press is an orbit drag, not a click. */
const CLICK_TOLERANCE = 5;

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v * t + pb[i] * (1 - t))).join(" ")})`;
}

/**
 * Card face drawn on a 2D canvas: no web fonts or remote textures, and
 * nothing re-renders per frame. Laid out exactly like the 2D tile — atomic
 * number top-left, symbol, Chinese name — with type sized in the same
 * proportion to the card width. The category is carried by colour, as in 2D.
 */
function drawCardTexture(element: ChemicalElement, selected: boolean, theme: Theme): CanvasTexture {
  const palette = CARD_THEME[theme];
  const accent = CATEGORY_COLORS[element.category];
  // On light cards the pastel accents are darkened so borders/labels keep contrast.
  const edge = palette.edge === 1 ? accent : mixHex(accent, DEEP_INK, palette.edge);
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE.width;
  canvas.height = TEXTURE.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立元素卡片");

  const { width: w, height: h } = TEXTURE;
  ctx.fillStyle = mixHex(accent, palette.base, selected ? palette.tintSelected : palette.tint);
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = edge;
  ctx.lineWidth = selected ? 10 : 4;
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);

  ctx.fillStyle = palette.ink;
  ctx.textAlign = "left";
  ctx.font = `500 34px ${CARD_FONT}`;
  ctx.fillText(String(element.number), 16, 44);

  ctx.textAlign = "center";
  ctx.font = `600 78px ${CARD_FONT}`;
  ctx.fillText(element.symbol, w / 2, 160);
  ctx.fillStyle = palette.subInk;
  ctx.font = `400 46px ${CARD_FONT}`;
  ctx.fillText(element.nameZh, w / 2, 222);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Pointer events on scene objects are dispatched from the WebGL canvas. */
function setCanvasCursor(event: ThreeEvent<PointerEvent>, cursor: string) {
  const target = event.nativeEvent.target;
  if (target instanceof HTMLElement) target.style.cursor = cursor;
}

interface ElementCardProps {
  element: ChemicalElement;
  theme: Theme;
  target: Vec3;
  selected: boolean;
  dimmed: boolean;
  animate: boolean;
  onSelect: (number: number) => void;
}

function ElementCard({ element, theme, target, selected, dimmed, animate, onSelect }: ElementCardProps) {
  const mesh = useRef<Mesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const [hovered, setHovered] = useState(false);
  // Start where the first layout puts us; later layouts are reached by easing.
  const [initialPosition] = useState(target);

  const texture = useMemo(
    () => drawCardTexture(element, selected, theme),
    [element, selected, theme],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  // A redrawn texture (selection or theme change) must reach the screen.
  useEffect(() => invalidate(), [texture, invalidate]);

  // A new target needs at least one frame to start moving (demand frameloop).
  useEffect(() => invalidate(), [target, invalidate]);

  useFrame(({ camera }, delta) => {
    const card = mesh.current;
    if (!card) return;
    card.quaternion.copy(camera.quaternion); // billboard: always face the viewer

    const [tx, ty, tz] = target;
    const p = card.position;
    if (!animate) {
      p.set(tx, ty, tz);
      return;
    }
    // Frame-rate independent ease; clamp delta so an idle gap doesn't snap.
    const k = 1 - Math.exp(-Math.min(delta, 1 / 30) * 7);
    p.set(p.x + (tx - p.x) * k, p.y + (ty - p.y) * k, p.z + (tz - p.z) * k);
    if (Math.hypot(tx - p.x, ty - p.y, tz - p.z) > 0.002) invalidate();
    else p.set(tx, ty, tz);
  });

  const scale = selected ? 1.18 : hovered && !dimmed ? 1.08 : 1;

  return (
    <mesh
      ref={mesh}
      position={initialPosition}
      scale={scale}
      renderOrder={selected ? 2 : dimmed ? 0 : 1}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setHovered(true);
        setCanvasCursor(event, "pointer");
      }}
      onPointerOut={(event: ThreeEvent<PointerEvent>) => {
        setHovered(false);
        setCanvasCursor(event, "");
      }}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        if (event.delta <= CLICK_TOLERANCE) onSelect(element.number);
      }}
    >
      <planeGeometry args={[CARD_SIZE.width, CARD_SIZE.height]} />
      <meshBasicMaterial
        map={texture}
        side={DoubleSide}
        transparent
        opacity={dimmed ? 0.14 : 1}
        depthWrite={!dimmed}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * 3D periodic table (loaded lazily, ssr: false). Shares selection, search
 * dimming and category highlight with the 2D table through its props.
 */
export default function PeriodicTable3D({
  elements,
  selectedNumber,
  onSelect,
  isDimmed,
}: PeriodicTable3DProps) {
  const [layout, setLayout] = useState<TableLayout3D>("table");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState<[number, number]>([0, 0]);
  const [resetKey, setResetKey] = useState(0);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const theme = useTheme();

  const targets = useMemo(
    () => new Map(elements.map((el) => [el.number, elementPosition3D(el, layout)])),
    [elements, layout],
  );
  const visible = elements.filter((el) => !isDimmed(el));
  const selected = elements.find((el) => el.number === selectedNumber) ?? null;

  const resetView = () => {
    setZoom(1);
    setRotation([0, 0]);
    setResetKey((k) => k + 1);
  };

  const rotate = (horizontal: number, vertical: number) =>
    setRotation(([azimuth, elevation]) => [
      azimuth + horizontal,
      Math.max(-ELEVATION_LIMIT, Math.min(ELEVATION_LIMIT, elevation + vertical)),
    ]);

  return (
    <section aria-label="3D 元素週期表" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="3D 排列方式" className="segmented">
          {TABLE_LAYOUTS_3D.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={layout === value}
              data-active={layout === value || undefined}
              onClick={() => {
                setLayout(value);
                resetView();
              }}
            >
              {LAYOUT_LABELS[value]}
            </button>
          ))}
        </div>
        <span className="text-xs tabular-nums text-slate-400" aria-live="polite">
          {visible.length} / {elements.length} 個元素
        </span>
      </div>

      <SceneCanvas
        className="table-scene"
        label={`以${LAYOUT_LABELS[layout]}排列的 3D 元素場景${selected ? `，已選取 ${selected.nameZh}` : ""}`}
        camera={{ position: [0, 0, 30], fov: 45 }}
        fallbackAction={
          <Link href="/" className="scene-fallback-action">
            回到 2D 週期表
          </Link>
        }
      >
        <CameraControls
          resetKey={resetKey}
          fit={layout === "table" ? TABLE_FRONT_FIT : layoutBounds(layout)}
          // The flat table is viewed head-on, so it can fill the frame; the
          // other shapes keep the default margin so rotation never clips them.
          margin={layout === "table" ? TABLE_MARGIN : undefined}
          zoom={zoom}
          rotation={rotation}
        />
        {elements.map((element) => (
          <ElementCard
            key={element.number}
            element={element}
            theme={theme}
            target={targets.get(element.number)!}
            selected={element.number === selectedNumber}
            dimmed={isDimmed(element)}
            animate={!reduceMotion}
            onSelect={onSelect}
          />
        ))}
      </SceneCanvas>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="3D 視角控制" className="flex flex-wrap gap-1">
          <button type="button" className="atom-control" aria-label="向左旋轉" title="向左旋轉" onClick={() => rotate(-0.25, 0)}>
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button type="button" className="atom-control" aria-label="向右旋轉" title="向右旋轉" onClick={() => rotate(0.25, 0)}>
            <ChevronRight aria-hidden className="size-4" />
          </button>
          <button type="button" className="atom-control" aria-label="向上旋轉" title="向上旋轉" onClick={() => rotate(0, 0.2)}>
            <ChevronUp aria-hidden className="size-4" />
          </button>
          <button type="button" className="atom-control" aria-label="向下旋轉" title="向下旋轉" onClick={() => rotate(0, -0.2)}>
            <ChevronDown aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            className="atom-control"
            aria-label="縮小"
            title="縮小"
            disabled={zoom <= ZOOM.min}
            onClick={() => setZoom((z) => Math.max(ZOOM.min, +(z - ZOOM.step).toFixed(2)))}
          >
            <ZoomOut aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            className="atom-control"
            aria-label="放大"
            title="放大"
            disabled={zoom >= ZOOM.max}
            onClick={() => setZoom((z) => Math.min(ZOOM.max, +(z + ZOOM.step).toFixed(2)))}
          >
            <ZoomIn aria-hidden className="size-4" />
          </button>
          <button type="button" className="atom-control !w-auto gap-1.5 whitespace-nowrap px-2.5 text-xs" onClick={resetView}>
            <RotateCcw aria-hidden className="size-3.5" />
            重設視角
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-400">
          鍵盤選取
          <select
            className="scene-select"
            aria-label="從 3D 場景選取元素"
            value={selectedNumber !== null && visible.some((el) => el.number === selectedNumber) ? selectedNumber : ""}
            onChange={(event) => onSelect(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">{visible.length ? "選擇元素" : "沒有符合的元素"}</option>
            {visible.map((el) => (
              <option key={el.number} value={el.number}>
                {el.number} · {el.symbol} {el.nameZh}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Move3d aria-hidden className="size-3.5" />
        拖曳旋轉 · 滾輪或雙指縮放 · 點擊卡片查看元素資訊。球體、螺旋與格狀為探索用排列，不代表族與週期。
      </p>
    </section>
  );
}
