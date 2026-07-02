export interface Transform {
  // CSS translateZ in px. Under the container's `perspective`, +z leans a cell
  // toward the viewer (larger, pushed outward); the center stays at 0 (deepest).
  z: number;
}

export interface LensConfig {
  depth: number; // translateZ (px) reached at `radius`. +bowls edges toward viewer; - domes center forward.
  radius: number; // fraction of the half-diagonal over which the curve ramps in
  perspective: number; // CSS perspective distance (px) on the container; smaller = more dramatic
}

export type LensFn = (
  cellCenter: { x: number; y: number },
  viewport: { w: number; h: number },
  cfg: LensConfig,
) => Transform;

export const IDENTITY_TRANSFORM: Transform = { z: 0 };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
// Smoothstep so the ramp has no hard seam at the radius edge.
const smoothstep = (t: number) => t * t * (3 - 2 * t);

// A perspective dome: each cell ramps from z=0 at the viewport center to `depth`
// at `radius`, then the container's CSS perspective projects it — edge cells lean
// toward the viewer (bigger, pushed outward) while the center sits deepest, like
// Cinematch's theatre bowl. Each cell stays a flat rectangle; the wall as a whole
// curves. `cellCenter` is the cell's center relative to the viewport center.
export const lensTransform: LensFn = (cellCenter, viewport, cfg) => {
  // depth 0 = flat; radius <= 0 would divide by zero. Either way: no dome.
  if (cfg.depth === 0 || cfg.radius <= 0) return IDENTITY_TRANSFORM;
  const half = Math.hypot(viewport.w, viewport.h) / 2 || 1;
  const dist = Math.hypot(cellCenter.x, cellCenter.y) / half; // 0..~1
  const t = smoothstep(clamp01(dist / cfg.radius)); // 0 at center → 1 at/after radius
  return { z: cfg.depth * t };
};
