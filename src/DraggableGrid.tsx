import { forwardRef, useImperativeHandle, useMemo, useRef, type ReactNode } from 'react';
import { computeGeometry, buildCells } from './layout';
import { defaultRenderItem } from './defaultRenderItem';
import { itemLabel } from './itemLabel';
import { prefersReducedMotion, shouldFallback } from './prefersReducedMotion';
import { useHasMounted } from './useHasMounted';
import { useDraggableMotion } from './useDraggableMotion';
import { StaticGrid } from './StaticGrid';
import type { DraggableGridProps, DraggableGridHandle } from './types';

const DEFAULT_COLUMNS = 7;
const DEFAULT_GAP = 16;
const DEFAULT_ASPECT = 2 / 3;

function DraggableGridInner<T>(
  props: DraggableGridProps<T>,
  _ref: React.ForwardedRef<DraggableGridHandle>,
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
      index,
    );

  // The estimated cell width feeds geometry; on the client the container's real
  // width refines it (Task 8 wires the measured width). Height derives from aspect.
  const estCellW = 180;
  const cellH = estCellW / cellAspect;
  const geom = useMemo(
    () => computeGeometry({ columns, cellW: estCellW, cellH, gap, itemCount: items.length }),
    [columns, cellH, gap, items.length],
  );

  // Behavior config: every knob has a default, overridable per prop.
  const drag = {
    inertia: 0.92,
    sensitivity: 1,
    axis: 'both' as const,
    enabled: true,
    ...props.drag,
  };
  const idleDrift =
    props.idleDrift === false
      ? (false as const)
      : { enabled: true, speed: 0.02, delay: 3000, ...props.idleDrift };
  const lens =
    props.lens === false ? (false as const) : { strength: 0.14, radius: 0.8, ...props.lens };
  const cursor = props.cursor ?? true;

  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());
  const viewport = { w: 1200, h: (style?.height as number) || 600 };
  const cells = buildCells(geom, items.length, viewport, wrap);

  const { bind, handle } = useDraggableMotion({
    geom,
    cells,
    wrap,
    viewport,
    drag,
    ease: props.ease,
    idleDrift,
    lens,
    lensFn: props.lensFn,
    containerRef,
    layerRef,
    cellRefs,
    onDragStart: props.onDragStart,
    onDragEnd: props.onDragEnd,
  });
  useImperativeHandle(_ref, () => handle, [handle]);

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

  // Interactive DOM. The rAF loop in useDraggableMotion mutates transforms on
  // the layer (drag/wrap) and each cell (lens); cells register via cellRefs.
  const setCellRef = (key: string) => (el: HTMLElement | null) => {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  };
  const cellStyle = (cell: (typeof cells)[number]) =>
    ({
      position: 'absolute',
      left: cell.baseX,
      top: cell.baseY,
      width: geom.cellW,
      height: geom.cellH,
      padding: 0,
      border: 'none',
      background: 'none',
      cursor: 'inherit',
      willChange: 'transform',
    }) as const;

  return (
    <div
      ref={containerRef}
      data-testid="draggable-grid"
      data-mode="interactive"
      className={className}
      {...bind()}
      style={{
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'none',
        background,
        height: 600,
        cursor: cursor ? 'grab' : 'default',
        ...style,
      }}
    >
      <div ref={layerRef} style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
        {cells.map((cell) =>
          onSelect ? (
            <button
              key={cell.key}
              type="button"
              aria-label={itemLabel(items[cell.itemIndex], cell.itemIndex)}
              ref={setCellRef(cell.key)}
              onClick={() => onSelect(items[cell.itemIndex] as T, cell.itemIndex)}
              style={cellStyle(cell)}
            >
              {renderCellContent(cell.itemIndex)}
            </button>
          ) : (
            <div key={cell.key} ref={setCellRef(cell.key)} style={cellStyle(cell)}>
              {renderCellContent(cell.itemIndex)}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export const DraggableGrid = forwardRef(DraggableGridInner) as <T>(
  props: DraggableGridProps<T> & { ref?: React.ForwardedRef<DraggableGridHandle> },
) => ReturnType<typeof DraggableGridInner>;
