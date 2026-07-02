import { describe, it, expect, vi, afterEach } from 'vitest';
import { prefersReducedMotion, shouldFallback } from './prefersReducedMotion';

afterEach(() => vi.unstubAllGlobals());

describe('prefersReducedMotion', () => {
  it('returns true when the media query matches', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }));
    expect(prefersReducedMotion()).toBe(true);
  });
  it('returns false when matchMedia is unavailable (SSR)', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('shouldFallback', () => {
  it('falls back to static under reduced motion', () => {
    expect(shouldFallback('static', true)).toBe(true);
  });
  it('does not fall back when mode is none, even under reduced motion', () => {
    expect(shouldFallback('none', true)).toBe(false);
  });
  it('does not fall back when motion is allowed', () => {
    expect(shouldFallback('static', false)).toBe(false);
  });
  it('treats a custom fallback function as static-eligible', () => {
    expect(shouldFallback(() => null, true)).toBe(true);
  });
});
