import { describe, it, expect } from 'vitest';
import { lensTransform, IDENTITY_TRANSFORM } from './lens';

const vp = { w: 800, h: 600 };

describe('lensTransform', () => {
  it('is identity at strength 0', () => {
    const t = lensTransform({ x: 100, y: 50 }, vp, { strength: 0, radius: 0.8 });
    expect(t).toEqual(IDENTITY_TRANSFORM);
  });

  it('is identity (not NaN) when radius is 0, even at the exact center', () => {
    const t = lensTransform({ x: 0, y: 0 }, vp, { strength: 0.2, radius: 0 });
    expect(t).toEqual(IDENTITY_TRANSFORM);
  });

  it('magnifies most at the center and applies no displacement there', () => {
    const t = lensTransform({ x: 0, y: 0 }, vp, { strength: 0.2, radius: 0.8 });
    expect(t.scale).toBeCloseTo(1.2);
    expect(t.dx).toBeCloseTo(0);
    expect(t.dy).toBeCloseTo(0);
  });

  it('falls off monotonically with distance from center', () => {
    const near = lensTransform({ x: 50, y: 0 }, vp, { strength: 0.2, radius: 0.8 });
    const far = lensTransform({ x: 300, y: 0 }, vp, { strength: 0.2, radius: 0.8 });
    expect(near.scale).toBeGreaterThan(far.scale);
  });

  it('flattens to identity beyond the radius', () => {
    const t = lensTransform({ x: 5000, y: 5000 }, vp, { strength: 0.2, radius: 0.8 });
    expect(t.scale).toBeCloseTo(1);
  });
});
