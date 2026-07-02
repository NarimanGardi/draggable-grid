import type { Axis } from './layout';

export interface Vec {
  x: number;
  y: number;
}

export function axisMask(delta: Vec, axis: Axis): Vec {
  return {
    x: axis === 'y' ? 0 : delta.x,
    y: axis === 'x' ? 0 : delta.y,
  };
}

export type EaseFn = (v: number, dt: number) => number;

// One frame of momentum. Returns the decayed velocity and whether it has
// settled below the rest threshold (so the rAF loop can pause).
export function stepInertia(
  v: Vec,
  inertia: number,
  restThreshold: number,
  ease?: EaseFn,
  dt = 16,
): { v: Vec; atRest: boolean } {
  const decay = (val: number) => (ease ? ease(val, dt) : val * inertia);
  const next: Vec = { x: decay(v.x), y: decay(v.y) };
  const atRest = Math.hypot(next.x, next.y) < restThreshold;
  return { v: atRest ? { x: 0, y: 0 } : next, atRest };
}

// Ease a value toward a target (linear interpolation). Used to ramp idle drift
// up from rest and back down when interaction resumes.
export function stepDrift(current: Vec, target: Vec, easeFactor: number): Vec {
  return {
    x: current.x + (target.x - current.x) * easeFactor,
    y: current.y + (target.y - current.y) * easeFactor,
  };
}
