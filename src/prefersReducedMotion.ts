export type FallbackMode = 'static' | 'none';

export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// `mode` is the resolved `fallback` prop: 'none' opts out entirely; anything
// else ('static' or a custom render function) means "fall back when motion is
// not wanted".
export function shouldFallback(mode: FallbackMode | unknown, reducedMotion: boolean): boolean {
  if (mode === 'none') return false;
  return reducedMotion;
}
