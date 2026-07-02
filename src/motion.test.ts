import { describe, it, expect } from 'vitest';
import { axisMask, stepInertia, stepDrift } from './motion';

describe('axisMask', () => {
  it('locks to x', () => {
    expect(axisMask({ x: 5, y: 9 }, 'x')).toEqual({ x: 5, y: 0 });
  });
  it('locks to y', () => {
    expect(axisMask({ x: 5, y: 9 }, 'y')).toEqual({ x: 0, y: 9 });
  });
  it('passes both through', () => {
    expect(axisMask({ x: 5, y: 9 }, 'both')).toEqual({ x: 5, y: 9 });
  });
});

describe('stepInertia', () => {
  it('decays velocity by the friction factor', () => {
    const { v, atRest } = stepInertia({ x: 10, y: 0 }, 0.9, 0.01);
    expect(v.x).toBeCloseTo(9);
    expect(atRest).toBe(false);
  });
  it('reports at rest once velocity drops below threshold', () => {
    const { atRest } = stepInertia({ x: 0.005, y: 0.005 }, 0.9, 0.01);
    expect(atRest).toBe(true);
  });
  it('inertia 0 stops immediately', () => {
    const { v, atRest } = stepInertia({ x: 100, y: 100 }, 0, 0.01);
    expect(v).toEqual({ x: 0, y: 0 });
    expect(atRest).toBe(true);
  });
  it('uses a custom ease function when provided', () => {
    const halve: (val: number) => number = (val) => val * 0.5;
    const { v } = stepInertia({ x: 8, y: 0 }, 0.9, 0.01, (val) => halve(val), 16);
    expect(v.x).toBeCloseTo(4);
  });
});

describe('stepDrift', () => {
  it('eases current toward target', () => {
    const next = stepDrift({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.5);
    expect(next.x).toBeCloseTo(0.5);
  });
  it('reaches the target over repeated steps', () => {
    let cur = { x: 0, y: 0 };
    for (let i = 0; i < 50; i++) cur = stepDrift(cur, { x: 2, y: 0 }, 0.3);
    expect(cur.x).toBeCloseTo(2, 3);
  });
});
