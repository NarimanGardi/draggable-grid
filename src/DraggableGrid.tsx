import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { defaultRenderItem } from './defaultRenderItem';
import { prefersReducedMotion, shouldFallback } from './prefersReducedMotion';
import { useHasMounted } from './useHasMounted';
import { StaticGrid } from './StaticGrid';
import type { EngineControls, EngineOptions } from './engine';
import type { DraggableGridProps, DraggableGridHandle, ImageItem } from './types';

const DEFAULTS = {
  columns: 7,
  gap: 0.12,
  cellAspect: 2 / 3,
  lens: { distortion: 1.6, vignette: 0.5 },
  parallax: 1,
  drag: { inertia: 0.94, sensitivity: 1, axis: 'both' as const, enabled: true },
  drift: { enabled: true, speed: 0.004, angle: 160 },
  dpr: [1, 2] as [number, number],
  background: 'transparent',
};

const srcOf = (item: ImageItem): string => (typeof item === 'string' ? item : item.src);

function DraggableGridInner(
  props: DraggableGridProps,
  ref: React.ForwardedRef<DraggableGridHandle>,
) {
  const {
    items,
    columns = DEFAULTS.columns,
    gap = DEFAULTS.gap,
    cellAspect = DEFAULTS.cellAspect,
    fallback = 'static',
    background = DEFAULTS.background,
    onSelect,
    className,
    style,
  } = props;

  const lens = props.lens === false ? false : { ...DEFAULTS.lens, ...props.lens };
  const parallax = props.parallax ?? DEFAULTS.parallax;
  const drag = { ...DEFAULTS.drag, ...props.drag };
  const drift =
    props.drift === false
      ? { enabled: false, speed: 0, angle: 0 }
      : { ...DEFAULTS.drift, ...props.drift };
  const dpr = props.dpr ?? DEFAULTS.dpr;

  const mounted = useHasMounted();
  const reduced = mounted ? prefersReducedMotion() : true; // SSR / first paint → static
  const [webglFailed, setWebglFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const useStatic = shouldFallback(fallback, reduced) || webglFailed;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<EngineControls | null>(null);
  const visibleRef = useRef(true);

  // Latest props the engine reads at mount / on select, without re-mounting per render.
  const live = useRef({ items, onSelect, onReady: props.onReady });
  live.current = { items, onSelect, onReady: props.onReady };

  // Structural signature: only these require tearing the scene down and rebuilding.
  const structuralKey = JSON.stringify({
    columns,
    gap,
    cellAspect,
    dpr,
    background,
    n: items.length,
  });
  // Tunable signature: these are pushed to the running engine in place (no remount).
  const dynKey = JSON.stringify({ lens, parallax, drag, drift });

  useEffect(() => {
    if (useStatic) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let controls: EngineControls | undefined;
    let cancelled = false;
    setReady(false);
    import('./engine').then(({ mountWall }) => {
      if (cancelled) return;
      const el = canvasRef.current;
      if (!el) return;
      const opts: EngineOptions = {
        posters: live.current.items.map(srcOf),
        columns,
        cellAspect,
        gap,
        lens,
        parallax,
        drag,
        drift,
        dpr,
        background,
        onReady: () => {
          setReady(true);
          live.current.onReady?.();
        },
        onSelect: (index) => live.current.onSelect?.(live.current.items[index]!, index),
        visibleRef,
      };
      controls = mountWall(el, opts);
      if (!controls)
        setWebglFailed(true); // no usable WebGL context → static fallback
      else controlsRef.current = controls;
    });
    return () => {
      cancelled = true;
      controls?.dispose();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useStatic, structuralKey]);

  // Push tunable changes (lens / drift / parallax / drag) to the running engine in place.
  useEffect(() => {
    controlsRef.current?.update({ lens, parallax, drag, drift });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynKey]);

  // Pause rendering when off-screen.
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      visibleRef.current = entries[0]?.isIntersecting ?? true;
    });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      recenter: () => controlsRef.current?.recenter(),
      getOffset: () => controlsRef.current?.getOffset() ?? { x: 0, y: 0 },
    }),
    [],
  );

  if (useStatic) {
    if (typeof fallback === 'function') return <>{fallback(items)}</>;
    return (
      <StaticGrid
        count={items.length}
        columns={columns}
        gap={8}
        cellAspect={cellAspect}
        renderCell={(i) => defaultRenderItem(items[i])}
        className={className}
        style={style}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="draggable-grid"
      data-mode="interactive"
      className={className}
      role="group"
      aria-label="Draggable wall of images — drag to explore"
      style={{ position: 'relative', overflow: 'hidden', background, height: 600, ...style }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none',
          cursor: 'grab',
          opacity: ready ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
      />
    </div>
  );
}

export const DraggableGrid = forwardRef(DraggableGridInner);
