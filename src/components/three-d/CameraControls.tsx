"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { PerspectiveCamera, Spherical, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

interface CameraControlsProps {
  /** Changing this re-frames the camera to `fit`. */
  resetKey: number;
  /** World-space extent that must stay in view. */
  fit?: { width: number; height: number };
  /** Breathing room around `fit` (1 = edge to edge). */
  margin?: number;
  zoom?: number;
  /** [azimuth, elevation] offsets in radians, driven by the button controls. */
  rotation?: [number, number];
}

/**
 * Orbit (drag / wheel / pinch) plus button-driven rotation and zoom for
 * keyboard users. Button adjustments are applied as deltas so they preserve
 * whatever pose the user dragged to.
 */
export function CameraControls({
  resetKey,
  fit,
  zoom = 1,
  margin = 1.18,
  rotation = [0, 0],
}: CameraControlsProps) {
  const { camera, gl, invalidate, size } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const previousZoom = useRef(zoom);
  const previousRotation = useRef(rotation);

  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enableDamping = false; // demand frameloop: no inertia frames
    orbit.enablePan = false;
    orbit.minDistance = 1;
    orbit.maxDistance = 200;
    const onChange = () => invalidate();
    orbit.addEventListener("change", onChange);
    controls.current = orbit;
    return () => {
      orbit.removeEventListener("change", onChange);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate]);

  const width = fit?.width ?? 12;
  const height = fit?.height ?? 12;

  // Frame the extent for the current viewport; also runs on reset.
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const distance =
      Math.max(height / (2 * tan), width / (2 * tan * (size.width / size.height))) * margin;
    camera.position.set(0, 0, distance / zoom);
    previousZoom.current = zoom;
    previousRotation.current = [rotation[0], rotation[1]];
    camera.lookAt(new Vector3());
    camera.updateProjectionMatrix();
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    invalidate();
    // zoom/rotation are applied incrementally below; only re-frame on these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size.width, size.height, width, height, margin, resetKey, invalidate]);

  useEffect(() => {
    camera.position.multiplyScalar(previousZoom.current / zoom);
    previousZoom.current = zoom;
    controls.current?.update();
    invalidate();
  }, [camera, zoom, invalidate]);

  const [azimuth, elevation] = rotation;
  useEffect(() => {
    const spherical = new Spherical().setFromVector3(camera.position);
    spherical.theta += azimuth - previousRotation.current[0];
    spherical.phi -= elevation - previousRotation.current[1];
    spherical.makeSafe();
    camera.position.setFromSpherical(spherical);
    camera.lookAt(new Vector3());
    previousRotation.current = [azimuth, elevation];
    controls.current?.update();
    invalidate();
  }, [camera, azimuth, elevation, invalidate]);

  return null;
}
