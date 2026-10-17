"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { supportsWebGL2 } from "@/lib/webgl-support";
import { SceneBoundary } from "./SceneBoundary";

function ContextLossGuard({ onLost }: { onLost: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  return null;
}

interface SceneCanvasProps {
  children: ReactNode;
  /** Accessible description of what the scene shows (the canvas itself is hidden). */
  label: string;
  className?: string;
  camera?: { position: [number, number, number]; fov?: number };
  /** Extra control shown with the fallback message, e.g. a link back to 2D. */
  fallbackAction?: ReactNode;
}

/**
 * Shared R3F canvas: probes WebGL 2, renders on demand (no idle frame loop)
 * and degrades to a text fallback on missing support, errors or context loss.
 */
export function SceneCanvas({
  children,
  label,
  className = "",
  camera = { position: [0, 0, 30], fov: 45 },
  fallbackAction,
}: SceneCanvasProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  // WebGL can only be probed in the browser, after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSupported(supportsWebGL2()), []);
  const onLost = useCallback(() => setSupported(false), []);

  const fallback = (
    <div className="scene-message" role="status">
      <strong className="text-sm text-slate-200">暫時無法顯示 3D</strong>
      <p>此瀏覽器未提供可用的 WebGL 2，或圖形環境已中斷；元素資料仍可正常使用。</p>
      {fallbackAction}
    </div>
  );

  return (
    <div className={`scene-canvas ${className}`} role="img" aria-label={label}>
      {supported === null ? (
        <div className="scene-message" role="status">
          正在準備 3D 場景…
        </div>
      ) : supported ? (
        <SceneBoundary fallback={fallback}>
          <Canvas
            camera={camera}
            dpr={[1, 1.5]}
            frameloop="demand"
            gl={{ antialias: true, powerPreference: "low-power" }}
            // Rendered *inside* <canvas> (aria-hidden), so it must stay plain text:
            // interactive fallbacks (e.g. "back to 2D") live outside, in `fallback`.
            fallback={<p>此瀏覽器無法顯示 3D 場景。</p>}
            aria-hidden
          >
            <ContextLossGuard onLost={onLost} />
            {children}
          </Canvas>
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
