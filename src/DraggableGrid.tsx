import { forwardRef, useMemo, type ReactNode } from 'react';
import { computeGeometry, buildCells } from './layout';
import { defaultRenderItem } from './defaultRenderItem';
import { prefersReducedMotion, shouldFallback } from './prefersReducedMotion';
import { useHasMounted } from './useHasMounted';
import { StaticGrid } from './StaticGrid';
import type { DraggableGridProps, DraggableGridHandle } from './types';

const DEFAULT_COLUMNS = 7;
const DEFAULT_GAP = 16;
const DEFAULT_ASPECT = 2 / 3;

function DraggableGridInner<T>(
  props: DraggableGridProps<T>,
  _ref: React.ForwardedRef<DraggableGridHandle>
) {
  const {
    items,
    renderItem,
    columns = DEFAULT_COLUMNS,
    gap = DEFAULT_GAP,
    cellAspect = DEFAULT_ASPECT,
    wrap = true,
    fallback = 'static',
    background = 'transparent',
    onSelect,
    className,
    style,
  } = props;

  const mounted = useHasMounted();
  const renderCellContent = (index: number): ReactNode =>
    (renderItem ?? (defaultRenderItem as (i: T, idx: number) => ReactNode))(
      items[index] as T,
      index
    );

  // The estimated cell width feeds geometry; on the client the container's real
  // width refines it (Task 8 wires the measured width). Height derives from aspect.
  const estCellW = 180;
  const cellH = estCellW / cellAspect;
  const geom = useMemo(
    () => computeGeometry({ columns, cellW: estCellW, cellH, gap, itemCount: items.length }),
    [columns, cellH, gap, items.length]
  );

  const reduced = mounted ? prefersReducedMotion() : true; // SSR/first render → static
  const useStatic = shouldFallback(fallback, reduced);

  if (useStatic) {
    if (typeof fallback === 'function') return <>{fallback(items)}</>;
    return (
      <StaticGrid
        count={items.length}
        columns={columns}
        gap={gap}
        cellAspect={cellAspect}
        renderCell={renderCellContent}
        className={className}
        style={style}
      />
    );
  }

  // Interactive DOM at rest. The rAF motion loop (Task 8) mutates transforms;
  // here cells are positioned statically so the tree renders correctly first.
  const viewport = { w: 1200, h: (style?.height as number) || 600 };
  const cells = buildCells(geom, items.length, viewport, wrap);

  return (
    <div
      data-testid="draggable-grid"
      data-mode="interactive"
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'none',
        background,
        height: 600,
        ...style,
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        {cells.map((cell) => (
          <button
            key={cell.key}
            type="button"
            onClick={() => onSelect?.(items[cell.itemIndex] as T, cell.itemIndex)}
            style={{
              position: 'absolute',
              left: cell.baseX,
              top: cell.baseY,
              width: geom.cellW,
              height: geom.cellH,
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'inherit',
            }}
          >
            {renderCellContent(cell.itemIndex)}
          </button>
        ))}
      </div>
    </div>
  );
}

export const DraggableGrid = forwardRef(DraggableGridInner) as <T>(
  props: DraggableGridProps<T> & { ref?: React.ForwardedRef<DraggableGridHandle> }
) => ReturnType<typeof DraggableGridInner>;
