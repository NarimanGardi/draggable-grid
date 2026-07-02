import { describe, it, expect } from 'vitest';
import { applyDragDelta, resolveScrollTarget } from './useDraggableMotion';

describe('applyDragDelta', () => {
  it('accumulates masked, sensitivity-scaled delta onto the offset', () => {
    const next = applyDragDelta({ x: 10, y: 10 }, { x: 4, y: 8 }, { axis: 'both', sensitivity: 2 });
    expect(next).toEqual({ x: 18, y: 26 });
  });
  it('respects an axis lock', () => {
    const next = applyDragDelta({ x: 0, y: 0 }, { x: 5, y: 5 }, { axis: 'x', sensitivity: 1 });
    expect(next).toEqual({ x: 5, y: 0 });
  });
});

describe('resolveScrollTarget', () => {
  it('centers item index in the viewport', () => {
    // item 5 with columns 5 => row 1, col 0. Center = cellPitch*col + cellW/2 etc.
    const offset = resolveScrollTarget(
      5,
      {
        columns: 5,
        rows: 2,
        cellW: 100,
        cellH: 100,
        cellPitchX: 110,
        cellPitchY: 110,
        spanX: 550,
        spanY: 220,
      },
      { w: 800, h: 600 },
    );
    // col 0 -> cell center x = 50; to center in 800 => offset.x = 400 - 50 = 350
    expect(offset.x).toBeCloseTo(350);
    // row 1 -> cell center y = 110 + 50 = 160; offset.y = 300 - 160 = 140
    expect(offset.y).toBeCloseTo(140);
  });
});
