export type Axis = 'x' | 'y' | 'both';

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

// One frame of momentum. Returns the decayed velocity and whether it has settled below
// the rest threshold. The engine carries the fling this way after a drag is released.
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
