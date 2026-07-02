import type { ReactNode, CSSProperties } from 'react';

// The degraded path: a plain CSS grid of the same items, bounded height, no
// drag, no rAF, no 100vh scroll-trap. Rendered on the server, under reduced
// motion, and before the client mount flips.
export function StaticGrid(props: {
  count: number;
  columns: number;
  gap: number;
  cellAspect: number;
  renderCell: (index: number) => ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { count, columns, gap, cellAspect, renderCell, className, style } = props;
  return (
    <div
      data-testid="draggable-grid"
      data-mode="static"
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
        overflow: 'auto',
        ...style,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ aspectRatio: String(cellAspect) }}>
          {renderCell(i)}
        </div>
      ))}
    </div>
  );
}
