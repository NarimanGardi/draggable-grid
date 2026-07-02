export type Axis = 'x' | 'y' | 'both';

export interface Geometry {
  columns: number;
  rows: number;
  cellW: number;
  cellH: number;
  cellPitchX: number;
  cellPitchY: number;
  spanX: number;
  spanY: number;
}

export function computeGeometry(p: {
  columns: number;
  cellW: number;
  cellH: number;
  gap: number;
  itemCount: number;
}): Geometry {
  const columns = Math.max(1, Math.floor(p.columns));
  const rows = Math.max(1, Math.ceil(p.itemCount / columns));
  const cellPitchX = p.cellW + p.gap;
  const cellPitchY = p.cellH + p.gap;
  return {
    columns,
    rows,
    cellW: p.cellW,
    cellH: p.cellH,
    cellPitchX,
    cellPitchY,
    spanX: columns * cellPitchX,
    spanY: rows * cellPitchY,
  };
}

// Bring any drag value into (-span, 0] so the covering set only ever slides
// within one span — the wrap is seamless without changing the DOM.
export function wrapOffset(value: number, span: number): number {
  if (span <= 0) return 0;
  const m = value % span;
  return m > 0 ? m - span : m;
}

export interface Cell {
  key: string;
  baseX: number;
  baseY: number;
  itemIndex: number;
}

export function buildCells(
  geom: Geometry,
  itemCount: number,
  viewport: { w: number; h: number },
  wrap: boolean,
): Cell[] {
  const n = Math.max(0, Math.floor(itemCount));
  if (n === 0) return [];
  const { columns, rows, cellPitchX, cellPitchY, spanX, spanY } = geom;
  const dupX = wrap ? Math.ceil(viewport.w / spanX) + 1 : 1;
  const dupY = wrap ? Math.ceil(viewport.h / spanY) + 1 : 1;
  const cells: Cell[] = [];
  for (let cx = 0; cx < dupX; cx++) {
    for (let cy = 0; cy < dupY; cy++) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          const slot = r * columns + c;
          if (!wrap && slot >= n) continue; // no phantom cells in the finite grid
          cells.push({
            key: `${cx}:${cy}:${r}:${c}`,
            baseX: cx * spanX + c * cellPitchX,
            baseY: cy * spanY + r * cellPitchY,
            itemIndex: slot % n,
          });
        }
      }
    }
  }
  return cells;
}
