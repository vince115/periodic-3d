"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { type InstancedMesh, Matrix4 } from "three";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Minus, Plus, RotateCcw } from "lucide-react";
import { createAtomModel, type AtomPoint } from "@/lib/atom-model";
import { useTheme } from "@/hooks/useTheme";
import { CATEGORY_COLORS, shellColors } from "@/lib/element-colors";
import type { ChemicalElement } from "@/types/element";
import { CameraControls } from "./CameraControls";
import { SceneCanvas } from "./SceneCanvas";

export interface AtomViewerProps {
  element: ChemicalElement;
}

const ZOOM_MIN = 0.65;
const ZOOM_MAX = 1.9;
const ZOOM_STEP = 0.15;
const ELEVATION_LIMIT = 1.2;

/** One instanced draw call per shell instead of one mesh per electron. */
function ElectronMarkers({ positions, color }: { positions: readonly AtomPoint[]; color: string }) {
  const mesh = useRef<InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const instances = mesh.current;
    if (!instances) return;
    const matrix = new Matrix4();
    positions.forEach(([x, y, z], i) => instances.setMatrixAt(i, matrix.makeTranslation(x, y, z)));
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
    invalidate();
  }, [positions, invalidate]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, positions.length]}>
      <sphereGeometry args={[0.065, 12, 8]} />
      <meshBasicMaterial color={color} />
    </instancedMesh>
  );
}

/**
 * Bohr-style 3D shell diagram for the selected element. Loaded lazily from
 * ElementDetails (next/dynamic, ssr: false) so three.js stays out of the
 * initial bundle.
 */
export default function AtomViewer({ element }: AtomViewerProps) {
  const model = useMemo(() => createAtomModel(element), [element]);
  const theme = useTheme();
  const palette = shellColors(theme);
  const fit = useMemo(() => {
    const extent = (model.radius + 0.35) * 2;
    return { width: extent, height: extent };
  }, [model.radius]);

  const [rotation, setRotation] = useState<[number, number]>([0, 0]);
  const [zoom, setZoom] = useState(1);
  const [resetKey, setResetKey] = useState(0);

  const rotate = (horizontal: number, vertical: number) =>
    setRotation(([azimuth, elevation]) => [
      azimuth + horizontal,
      Math.max(-ELEVATION_LIMIT, Math.min(ELEVATION_LIMIT, elevation + vertical)),
    ]);

  const reset = () => {
    setRotation([0, 0]);
    setZoom(1);
    setResetKey((k) => k + 1);
  };

  return (
    <div className="mt-3">
      <p className="flex flex-wrap gap-x-3 text-xs text-slate-400">
        <span>
          核內 <strong className="font-medium text-slate-100">{model.protonCount}</strong> 個質子
        </span>
        <span>
          核外 <strong className="font-medium text-slate-100">{model.electronCount}</strong> 個電子
        </span>
        <span>{model.shells.length} 個殼層</span>
      </p>

      <SceneCanvas
        className="atom-canvas"
        label={`${element.nameZh}的三維原子殼層示意：${model.shells.length} 層，共 ${model.electronCount} 個電子，依序為 ${element.shellElectrons.join("、")}`}
        camera={{ position: [0, 0, 12], fov: 42 }}
      >
        <CameraControls fit={fit} zoom={zoom} resetKey={resetKey} rotation={rotation} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 4, 7]} intensity={2} />
        <mesh>
          <sphereGeometry args={[0.28, 24, 16]} />
          <meshStandardMaterial
            color={CATEGORY_COLORS[element.category]}
            roughness={0.35}
            metalness={0.15}
          />
        </mesh>
        {model.shells.map((shell, i) => (
          <group key={shell.label} rotation={shell.rotation}>
            <mesh>
              <torusGeometry args={[shell.radius, 0.009, 6, 112]} />
              <meshBasicMaterial
                color={palette[i]}
                transparent
                opacity={theme === "light" ? 0.55 : 0.35}
                depthWrite={false}
              />
            </mesh>
            <ElectronMarkers positions={shell.electrons} color={palette[i]} />
          </group>
        ))}
      </SceneCanvas>

      <div className="flex flex-wrap justify-between gap-2">
        <div role="group" aria-label="旋轉原子模型" className="flex gap-1">
          <button type="button" className="atom-control" aria-label="向左旋轉" title="向左旋轉" onClick={() => rotate(-0.25, 0)}>
            <ArrowLeft aria-hidden className="size-4" />
          </button>
          <button type="button" className="atom-control" aria-label="向右旋轉" title="向右旋轉" onClick={() => rotate(0.25, 0)}>
            <ArrowRight aria-hidden className="size-4" />
          </button>
          <button type="button" className="atom-control" aria-label="向上旋轉" title="向上旋轉" onClick={() => rotate(0, -0.2)}>
            <ArrowUp aria-hidden className="size-4" />
          </button>
          <button type="button" className="atom-control" aria-label="向下旋轉" title="向下旋轉" onClick={() => rotate(0, 0.2)}>
            <ArrowDown aria-hidden className="size-4" />
          </button>
        </div>
        <div role="group" aria-label="原子模型縮放" className="flex gap-1">
          <button
            type="button"
            className="atom-control"
            aria-label="縮小"
            title="縮小"
            disabled={zoom <= ZOOM_MIN}
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            className="atom-control"
            aria-label="放大"
            title="放大"
            disabled={zoom >= ZOOM_MAX}
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
          >
            <Plus aria-hidden className="size-4" />
          </button>
          <button type="button" className="atom-control" aria-label="重設視角" title="重設視角" onClick={reset}>
            <RotateCcw aria-hidden className="size-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        拖曳旋轉、滾輪或雙指縮放。殼層示意圖，並非真實電子軌道，大小不按比例。
      </p>
    </div>
  );
}
