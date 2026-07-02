import '@testing-library/jest-dom/vitest';

// jsdom has no rAF; the motion loop schedules through it on mount.
if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 0) as unknown as number;
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

// jsdom omits the Pointer Capture API; @use-gesture calls it on pointerdown and
// relies on hasPointerCapture to classify a tap, so without these a click never
// lands. Stub them so cell activation behaves as it does in a real browser.
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
}
