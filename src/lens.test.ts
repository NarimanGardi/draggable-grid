import { describe, it, expect } from 'vitest';
import { lensTransform, IDENTITY_TRANSFORM } from './lens';

const vp = { w: 800, h: 600 };
const cfg = { depth: 160, radius: 0.9, perspective: 1000 };

describe('lensTransform', () => {
  it('is identity at depth 0', () => {
    expect(lensTransform({ x: 100, y: 50 }, vp, { ...cfg, depth: 0 })).toEqual(IDENTITY_TRANSFORM);
  });

  it('is identity (not NaN) when radius is 0, even at the exact center', () => {
    expect(lensTransform({ x: 0, y: 0 }, vp, { ...cfg, radius: 0 })).toEqual(IDENTITY_TRANSFORM);
  });

  it('sits deepest (z = 0) at the viewport center', () => {
    expect(lensTransform({ x: 0, y: 0 }, vp, cfg).z).toBeCloseTo(0);
  });

  it('leans further toward the viewer with distance from center', () => {
    const near = lensTransform({ x: 50, y: 0 }, vp, cfg).z;
    const far = lensTransform({ x: 300, y: 0 }, vp, cfg).z;
    expect(far).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(0);
  });

  it('reaches full depth at/beyond the radius', () => {
    const t = lensTransform({ x: 5000, y: 5000 }, vp, cfg);
    expect(t.z).toBeCloseTo(cfg.depth);
  });

  it('carries a negative depth through (center domes forward)', () => {
    const t = lensTransform({ x: 5000, y: 5000 }, vp, { ...cfg, depth: -120 });
    expect(t.z).toBeCloseTo(-120);
  });
});
