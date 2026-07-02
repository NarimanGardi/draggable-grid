import { describe, it, expect } from 'vitest';
import { computeGeometry, buildCells, wrapOffset } from './layout';

describe('computeGeometry', () => {
  it('derives rows from item count and columns (ceil)', () => {
    const g = computeGeometry({ columns: 3, cellW: 100, cellH: 150, gap: 10, itemCount: 7 });
    expect(g.rows).toBe(3); // ceil(7/3)
    expect(g.cellPitchX).toBe(110);
    expect(g.cellPitchY).toBe(160);
    expect(g.spanX).toBe(330); // 3 * 110
    expect(g.spanY).toBe(480); // 3 * 160
  });

  it('handles fewer items than columns (single row)', () => {
    const g = computeGeometry({ columns: 7, cellW: 100, cellH: 100, gap: 0, itemCount: 3 });
    expect(g.rows).toBe(1);
  });
});

describe('wrapOffset', () => {
  it('maps any value into (-span, 0]', () => {
    expect(wrapOffset(0, 100)).toBe(0);
    expect(wrapOffset(-30, 100)).toBe(-30);
    expect(wrapOffset(-130, 100)).toBe(-30);
    expect(wrapOffset(30, 100)).toBe(-70);
    expect(wrapOffset(230, 100)).toBe(-70);
  });

  it('returns 0 for a non-positive span instead of dividing by zero', () => {
    expect(wrapOffset(50, 0)).toBe(0);
    expect(wrapOffset(50, -10)).toBe(0);
  });
});

describe('buildCells (wrap)', () => {
  const geom = computeGeometry({ columns: 2, cellW: 100, cellH: 100, gap: 0, itemCount: 4 });
  // columns 2, rows 2, span 200x200

  it('covers viewport + one span with duplicated tiles', () => {
    const cells = buildCells(geom, 4, { w: 300, h: 300 }, true);
    // dupX = ceil(300/200)+1 = 3, dupY = 3 => 3*3 tiles * (2*2) cells = 36
    expect(cells).toHaveLength(36);
  });

  it('maps cells to items row-major, wrapping by item count', () => {
    const cells = buildCells(geom, 4, { w: 10, h: 10 }, true);
    // dupX=1+1=2? ceil(10/200)=1 => dup=2; but assert item mapping of the first tile
    const firstTile = cells.filter((c) => c.baseX < 200 && c.baseY < 200);
    const byPos = [...firstTile].sort((a, b) => a.baseY - b.baseY || a.baseX - b.baseX);
    expect(byPos.map((c) => c.itemIndex)).toEqual([0, 1, 2, 3]);
  });

  it('wraps item index when a slot exceeds item count', () => {
    const g = computeGeometry({ columns: 2, cellW: 100, cellH: 100, gap: 0, itemCount: 3 });
    // rows = ceil(3/2) = 2 => 4 slots, last slot (index 3) wraps to item 3%3 = 0
    const cells = buildCells(g, 3, { w: 10, h: 10 }, true);
    const firstTile = cells.filter((c) => c.baseX < 200 && c.baseY < 200);
    const byPos = [...firstTile].sort((a, b) => a.baseY - b.baseY || a.baseX - b.baseX);
    expect(byPos.map((c) => c.itemIndex)).toEqual([0, 1, 2, 0]);
  });

  it('returns no cells when there are no items', () => {
    expect(buildCells(geom, 0, { w: 300, h: 300 }, true)).toEqual([]);
  });

  it('renders a single tile when wrap is false', () => {
    const cells = buildCells(geom, 4, { w: 300, h: 300 }, false);
    expect(cells).toHaveLength(4);
    expect(cells.every((c) => c.baseX < 200 && c.baseY < 200)).toBe(true);
  });

  it('gives every cell a unique key', () => {
    const cells = buildCells(geom, 4, { w: 300, h: 300 }, true);
    expect(new Set(cells.map((c) => c.key)).size).toBe(cells.length);
  });
});
