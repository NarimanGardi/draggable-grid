import { useEffect, useMemo, useRef } from 'react';
import { useGesture } from '@use-gesture/react';
import { wrapOffset, type Geometry, type Cell, type Axis } from './layout';
import { axisMask, stepInertia, stepDrift, type Vec, type EaseFn } from './motion';
import { lensTransform, type LensFn, type LensConfig } from './lens';

export function applyDragDelta(
  offset: Vec,
  delta: Vec,
  opts: { axis: Axis; sensitivity: number },
): Vec {
  const masked = axisMask(delta, opts.axis);
  return {
    x: offset.x + masked.x * opts.sensitivity,
    y: offset.y + masked.y * opts.sensitivity,
  };
}

// Offset that places item `index` at the viewport center.
export function resolveScrollTarget(
  index: number,
  geom: Geometry,
  viewport: { w: number; h: number },
): Vec {
  const col = index % geom.columns;
  const row = Math.floor(index / geom.columns) % geom.rows;
  const cellCx = col * geom.cellPitchX + geom.cellW / 2;
  const cellCy = row * geom.cellPitchY + geom.cellH / 2;
  return { x: viewport.w / 2 - cellCx, y: viewport.h / 2 - cellCy };
}

interface MotionParams {
  geom: Geometry;
  cells: Cell[];
  wrap: boolean;
  viewport: { w: number; h: number };
  drag: { inertia: number; sensitivity: number; axis: Axis; enabled: boolean };
  ease?: EaseFn;
  idleDrift: { enabled: boolean; speed: number; delay: number } | false;
  lens: LensConfig | false;
  lensFn?: LensFn;
  containerRef: React.RefObject<HTMLDivElement | null>;
  layerRef: React.RefObject<HTMLDivElement | null>;
  cellRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const REST_THRESHOLD = 0.02;
const DRIFT_EASE = 0.02;

export function useDraggableMotion(params: MotionParams) {
  const offset = useRef<Vec>({ x: 0, y: 0 });
  const velocity = useRef<Vec>({ x: 0, y: 0 });
  const drift = useRef<Vec>({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastInput = useRef(0);
  const visible = useRef(true);
  const raf = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef(false);
  const p = useRef(params);
  p.current = params;

  function ensureRunning() {
    if (!running.current && visible.current) {
      running.current = true;
      raf.current = requestAnimationFrame(frame);
    }
  }

  function clearIdleTimer() {
    if (idleTimer.current !== null) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }

  const bind = useGesture(
    {
      onDragStart: () => {
        dragging.current = true;
        lastInput.current = performance.now();
        drift.current = { x: 0, y: 0 };
        clearIdleTimer();
        p.current.onDragStart?.();
        ensureRunning();
      },
      onDrag: ({ delta }) => {
        const d = p.current.drag;
        const before = offset.current;
        offset.current = applyDragDelta(before, { x: delta[0], y: delta[1] }, d);
        // Carry the *applied* step as fling velocity so inertia inherits the same
        // sensitivity and axis lock the drag used (raw delta would ignore both).
        velocity.current = { x: offset.current.x - before.x, y: offset.current.y - before.y };
        lastInput.current = performance.now();
      },
      onDragEnd: () => {
        dragging.current = false;
        lastInput.current = performance.now();
        p.current.onDragEnd?.();
        ensureRunning();
      },
    },
    { drag: { enabled: params.drag.enabled, filterTaps: true } },
  );

  function frame() {
    const cur = p.current;
    const now = performance.now();

    // Drift is *active* only once we're past the idle delay — before that it
    // contributes no offset and the loop is free to rest.
    const driftActive =
      cur.idleDrift !== false &&
      cur.idleDrift.enabled &&
      now - lastInput.current > cur.idleDrift.delay;

    if (!dragging.current) {
      // momentum
      const r = stepInertia(velocity.current, cur.drag.inertia, REST_THRESHOLD, cur.ease);
      velocity.current = r.v;
      offset.current = { x: offset.current.x + r.v.x, y: offset.current.y + r.v.y };

      // idle drift after the delay, once momentum has settled
      if (cur.idleDrift && cur.idleDrift.enabled && r.atRest) {
        const target = driftActive ? { x: cur.idleDrift.speed, y: 0 } : { x: 0, y: 0 };
        drift.current = stepDrift(drift.current, target, DRIFT_EASE);
        offset.current = {
          x: offset.current.x + drift.current.x,
          y: offset.current.y + drift.current.y,
        };
      }
    }

    paint();

    const stillMoving =
      dragging.current ||
      Math.hypot(velocity.current.x, velocity.current.y) >= REST_THRESHOLD ||
      driftActive;
    if (stillMoving && visible.current) {
      raf.current = requestAnimationFrame(frame);
    } else {
      running.current = false;
      // Nothing is moving now. If drift is enabled but its delay hasn't
      // elapsed yet, wake the loop when it does so drifting can begin.
      const idle = cur.idleDrift;
      if (idle !== false && idle.enabled && !dragging.current && visible.current && !driftActive) {
        const wait = Math.max(0, idle.delay - (now - lastInput.current)) + 16;
        idleTimer.current = setTimeout(ensureRunning, wait);
      }
    }
  }

  function paint() {
    const cur = p.current;
    const layer = cur.layerRef.current;
    if (!layer) return;
    const tx = cur.wrap ? wrapOffset(offset.current.x, cur.geom.spanX) : offset.current.x;
    const ty = cur.wrap ? wrapOffset(offset.current.y, cur.geom.spanY) : offset.current.y;
    layer.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;

    const lensCfg = cur.lens;
    if (lensCfg === false) return;
    const cx0 = cur.viewport.w / 2;
    const cy0 = cur.viewport.h / 2;
    const apply = cur.lensFn ?? lensTransform;
    for (const cell of cur.cells) {
      const el = cur.cellRefs.current.get(cell.key);
      if (!el) continue;
      const screenCx = tx + cell.baseX + cur.geom.cellW / 2;
      const screenCy = ty + cell.baseY + cur.geom.cellH / 2;
      const t = apply({ x: screenCx - cx0, y: screenCy - cy0 }, cur.viewport, lensCfg);
      el.style.transform = `translate3d(${t.dx}px, ${t.dy}px, 0) scale(${t.scale})`;
    }
  }

  // Off-screen pause.
  useEffect(() => {
    const node = params.containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      visible.current = entries[0]?.isIntersecting ?? true;
      if (visible.current) ensureRunning();
      else clearIdleTimer();
    });
    io.observe(node);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial paint + kick the loop; full cleanup on unmount.
  useEffect(() => {
    paint();
    ensureRunning();
    return () => {
      cancelAnimationFrame(raf.current);
      clearIdleTimer();
      running.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handle = useMemo(
    () => ({
      recenter() {
        offset.current = { x: 0, y: 0 };
        velocity.current = { x: 0, y: 0 };
        ensureRunning();
      },
      scrollToItem(index: number) {
        offset.current = resolveScrollTarget(index, p.current.geom, p.current.viewport);
        velocity.current = { x: 0, y: 0 };
        ensureRunning();
      },
      getOffset() {
        return { ...offset.current };
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { bind, handle };
}
