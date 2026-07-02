export interface Transform {
  scale: number;
  dx: number;
  dy: number;
}

export interface LensConfig {
  strength: number;
  radius: number;
}

export type LensFn = (
  cellCenter: { x: number; y: number },
  viewport: { w: number; h: number },
  cfg: LensConfig,
) => Transform;

export const IDENTITY_TRANSFORM: Transform = { scale: 1, dx: 0, dy: 0 };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
// Smoothstep so the falloff has no hard seam at the radius edge.
const smoothstep = (t: number) => t * t * (3 - 2 * t);

// A concave bow: cells near the viewport center are largest and pulled
// slightly outward; the effect fades to identity past `radius` (a fraction of
// the half-diagonal). `cellCenter` is relative to the viewport center.
export const lensTransform: LensFn = (cellCenter, viewport, cfg) => {
  // radius <= 0 would divide by zero (NaN at the exact center); treat it as "no lens".
  if (cfg.strength === 0 || cfg.radius <= 0) return IDENTITY_TRANSFORM;
  const half = Math.hypot(viewport.w, viewport.h) / 2 || 1;
  const dist = Math.hypot(cellCenter.x, cellCenter.y) / half; // 0..~1
  const t = smoothstep(clamp01(1 - dist / cfg.radius)); // 1 at center → 0 past radius
  const scale = 1 + cfg.strength * t;
  return {
    scale,
    dx: cellCenter.x * cfg.strength * t * 0.5,
    dy: cellCenter.y * cfg.strength * t * 0.5,
  };
};
