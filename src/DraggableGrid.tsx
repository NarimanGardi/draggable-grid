import { forwardRef, useImperativeHandle, useMemo, useRef, type ReactNode } from 'react';
import { computeGeometry, buildCells } from './layout';
import { defaultRenderItem } from './defaultRenderItem';
import { itemLabel } from './itemLabel';
import { prefersReducedMotion, shouldFallback } from './prefersReducedMotion';
import { useHasMounted } from './useHasMounted';
import { useMeasuredSize } from './useMeasuredSize';
import { useDraggableMotion } from './useDraggableMotion';
import { StaticGrid } from './StaticGrid';
import type { DraggableGridProps, DraggableGridHandle } from './types';

const DEFAULT_COLUMNS = 7;
const DEFAULT_GAP = 16;
const DEFAULT_ASPECT = 2 / 3;

function pxOrDefault(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

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

  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Measure the container so the grid fits its real size (width → cell size and
  // column pitch; height → wrap coverage and lens center). Until the first
  // measurement lands, fall back to sane estimates so the first frame isn't empty.
  const measured = useMeasuredSize(containerRef);
  const viewportW = measured.w || 1200;
  const viewportH = measured.h || pxOrDefault(style?.height, 600);
  const viewport = { w: viewportW, h: viewportH };

  // `columns` cells span the container width: pitch = width / columns, so the
  // cell itself is the pitch minus one gap. Height follows the aspect ratio.
  const cellW = Math.max(1, viewportW / columns - gap);
  // A non-positive aspect would make cellH Infinity/negative and poison the geometry.
  const cellH = cellW / (cellAspect > 0 ? cellAspect : DEFAULT_ASPECT);
  const geom = useMemo(
    () => computeGeometry({ columns, cellW, cellH, gap, itemCount: items.length }),
    [columns, cellW, cellH, gap, items.length],
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
    props.lens === false
      ? (false as const)
      : { depth: 240, radius: 0.9, perspective: 1000, ...props.lens };
  const cursor = props.cursor ?? true;

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
        // The dome lives here: cells' translateZ is projected through this perspective.
        perspective: lens ? `${lens.perspective}px` : undefined,
        ...style,
      }}
    >
      <div
        ref={layerRef}
        style={{
          position: 'absolute',
          inset: 0,
          willChange: 'transform',
          // Let cell translateZ render in the container's 3D space, not flattened.
          transformStyle: 'preserve-3d',
        }}
      >
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
