import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  WebGLRenderer,
  type Texture,
} from 'three';
import { axisMask, stepInertia, type Axis, type Vec } from './motion';

// The vanilla-three engine for the draggable poster wall. Generalized from the
// Cinematch theatre hero: a draggable, infinitely-wrapping wall of poster planes on a
// concave dome (perspective camera + per-plane Z recession), with each poster itself
// curved on a cylinder so it cups toward the viewer. Owns only the GPU scene and the
// pointer handling; the canvas element, the static fallback, and the accessible DOM are
// the React component's. Kept out of any server bundle by being imported client-side.

export interface EngineOptions {
  posters: string[]; // ordered image URLs, cycled across the wall
  columns: number;
  cellAspect: number; // width / height
  gap: number; // world-unit gap as a fraction of card width
  dome: number; // wall concavity: z = dome * (x² + y²), clamped
  bend: number; // per-poster curve: edge Z displacement (world units), 0 = flat
  drag: { inertia: number; sensitivity: number; axis: Axis; enabled: boolean };
  drift: { enabled: boolean; speed: number; angle: number }; // continuous ambient motion
  dpr: [number, number];
  background: string; // CSS color
  onReady: () => void;
  onSelect?: (index: number) => void;
  visibleRef: { current: boolean }; // gates rendering when off-screen
}

const FOV = 38;
const CAM_Z = 26;
const ZOOM_OUT = 1.18; // camera dollies back while dragging
const MAX_RECESS = 5; // clamp the dome so edges don't rush the lens
const DEG2RAD = Math.PI / 180;
const CARD_W = 3.0;
const MARGIN = 4; // extra cells beyond the visible field on every side
const TAP_PX = 6; // pointer travel under this on release counts as a tap, not a drag

// A poster plane curved on a vertical cylinder: each vertex is pushed toward the viewer
// by the square of its horizontal distance from the poster's center, so the poster cups
// around the viewer. `bend` is the edge displacement in world units (0 = flat plane).
function curvedPoster(w: number, h: number, bend: number): PlaneGeometry {
  const geo = new PlaneGeometry(w, h, bend > 0 ? 24 : 1, 1);
  const pos = geo.attributes.position;
  if (bend > 0 && pos) {
    const halfW = w / 2;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, bend * (x / halfW) * (x / halfW));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }
  return geo;
}

function parseColor(css: string): number | null {
  if (css === 'transparent') return null;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return 0x0a0a0a;
  ctx.fillStyle = css;
  const hex = ctx.fillStyle; // normalized to #rrggbb
  return hex.startsWith('#') ? parseInt(hex.slice(1), 16) : 0x0a0a0a;
}

export interface EngineControls {
  dispose(): void;
  recenter(): void;
  getOffset(): { x: number; y: number };
}

// Mounts the wall onto `canvas`. Returns controls (dispose + imperative handle), or
// undefined if there is no usable WebGL context (the caller keeps the static fallback).
export function mountWall(
  canvas: HTMLCanvasElement,
  opts: EngineOptions,
): EngineControls | undefined {
  // Probe for a real (non-caveat) context before constructing the renderer, so three
  // never logs a context-creation error on a machine that should fall back statically.
  const probe = document.createElement('canvas');
  const supported =
    probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
    probe.getContext('webgl', { failIfMajorPerformanceCaveat: true });
  if (!supported) return;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return;
  }

  const n = opts.posters.length;
  if (n === 0) return;

  let W = canvas.clientWidth || 1280;
  let H = canvas.clientHeight || 760;
  let aspect = W / H;
  const clampedDpr = Math.min(Math.max(window.devicePixelRatio, opts.dpr[0]), opts.dpr[1]);
  renderer.setPixelRatio(clampedDpr);
  renderer.setSize(W, H, false);
  const bg = parseColor(opts.background);
  if (bg === null) renderer.setClearAlpha(0);
  else renderer.setClearColor(bg, 1);

  const tanHalf = Math.tan((FOV * DEG2RAD) / 2);
  const camera = new PerspectiveCamera(FOV, aspect, 0.1, 200);
  camera.position.z = CAM_Z;
  let camZTarget = CAM_Z;

  const scene = new Scene();
  const group = new Group();
  scene.add(group);

  const cardW = CARD_W;
  const cardH = CARD_W / opts.cellAspect;
  const gapW = CARD_W * opts.gap;
  const cellW = cardW + gapW;
  const cellH = cardH + gapW;
  const geo = curvedPoster(cardW, cardH, opts.bend);

  const loader = new TextureLoader();
  loader.crossOrigin = 'anonymous';
  let first = true;
  const texes: Texture[] = opts.posters.map((url) => {
    const t = loader.load(url, () => {
      if (first) {
        first = false;
        opts.onReady();
      }
    });
    t.colorSpace = SRGBColorSpace;
    return t;
  });

  const cards: Mesh[] = [];
  let COLS = 0;
  let ROWS = 0;
  let SPAN_X = 0;
  let SPAN_Y = 0;
  let texCursor = 0;

  const coverHalfH = () => (CAM_Z * ZOOM_OUT + MAX_RECESS) * tanHalf;
  const neededCols = () => Math.ceil((2 * coverHalfH() * aspect) / cellW) + MARGIN;
  const neededRows = () => Math.ceil((2 * coverHalfH()) / cellH) + MARGIN;

  const buildGrid = (cols: number, rows: number) => {
    for (const m of cards) {
      group.remove(m);
      (m.material as MeshBasicMaterial).dispose();
    }
    cards.length = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = texCursor % n;
        const mat = new MeshBasicMaterial({ map: texes[idx], transparent: bg === null });
        const m = new Mesh(geo, mat);
        m.userData.baseX = (c - (cols - 1) / 2) * cellW + (r % 2 ? cellW * 0.5 : 0);
        m.userData.baseY = (r - (rows - 1) / 2) * cellH;
        m.userData.itemIndex = idx;
        group.add(m);
        cards.push(m);
        texCursor++;
      }
    }
    COLS = cols;
    ROWS = rows;
    SPAN_X = cols * cellW;
    SPAN_Y = rows * cellH;
  };
  buildGrid(neededCols(), neededRows());

  // Interaction: pointer drag → offset, inertia on release, continuous ambient drift.
  const offset: Vec = { x: 0, y: 0 };
  const vel: Vec = { x: 0, y: 0 };
  const driftVec: Vec = {
    x: opts.drift.speed * Math.cos(opts.drift.angle * DEG2RAD),
    y: opts.drift.speed * Math.sin(opts.drift.angle * DEG2RAD),
  };
  let dragging = false;
  const last = { x: 0, y: 0 };
  let travel = 0; // px moved since pointerdown, to tell tap from drag
  const worldPerPx = () => (2 * camera.position.z * tanHalf) / H;
  const wrap = (v: number, span: number) => {
    v = (v + span * 0.5) % span;
    if (v < 0) v += span;
    return v - span * 0.5;
  };

  const onDown = (e: PointerEvent) => {
    if (!opts.drag.enabled) return;
    dragging = true;
    travel = 0;
    vel.x = vel.y = 0;
    last.x = e.clientX;
    last.y = e.clientY;
    camZTarget = CAM_Z * ZOOM_OUT;
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const wpp = worldPerPx();
    const dxPx = e.clientX - last.x;
    const dyPx = e.clientY - last.y;
    travel += Math.abs(dxPx) + Math.abs(dyPx);
    const step = axisMask({ x: dxPx * wpp, y: -dyPx * wpp }, opts.drag.axis);
    offset.x += step.x * opts.drag.sensitivity;
    offset.y += step.y * opts.drag.sensitivity;
    vel.x = step.x * opts.drag.sensitivity;
    vel.y = step.y * opts.drag.sensitivity;
    last.x = e.clientX;
    last.y = e.clientY;
  };
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const onUp = (e: PointerEvent) => {
    if (dragging && travel < TAP_PX && opts.onSelect) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(cards, false)[0];
      if (hit) opts.onSelect(hit.object.userData.itemIndex as number);
    }
    dragging = false;
    camZTarget = CAM_Z;
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onUp);

  const resize = () => {
    W = canvas.clientWidth || W;
    H = canvas.clientHeight || H;
    aspect = W / H;
    renderer.setSize(W, H, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const nc = neededCols();
    const nr = neededRows();
    if (nc > COLS || nr > ROWS) buildGrid(Math.max(nc, COLS), Math.max(nr, ROWS));
  };
  window.addEventListener('resize', resize);

  let frame = 0;
  const tick = () => {
    frame = requestAnimationFrame(tick);
    if (!opts.visibleRef.current) return;
    camera.position.z += (camZTarget - camera.position.z) * 0.08;
    if (!dragging) {
      const r = stepInertia(vel, opts.drag.inertia, 0.0002);
      vel.x = r.v.x;
      vel.y = r.v.y;
      offset.x += vel.x;
      offset.y += vel.y;
      if (opts.drift.enabled) {
        offset.x += driftVec.x;
        offset.y += driftVec.y;
      }
    }
    const dome = opts.dome;
    for (const m of cards) {
      const x = wrap((m.userData.baseX as number) + offset.x, SPAN_X);
      const y = wrap((m.userData.baseY as number) + offset.y, SPAN_Y);
      m.position.x = x;
      m.position.y = y;
      m.position.z = Math.min(dome * (x * x + y * y), MAX_RECESS);
    }
    renderer.render(scene, camera);
  };
  tick();

  return {
    dispose() {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onUp);
      for (const m of cards) (m.material as MeshBasicMaterial).dispose();
      geo.dispose();
      for (const t of texes) t.dispose();
      renderer.dispose();
      // Release the GL context outright — otherwise repeated mount/unmount cycles
      // leak contexts and the browser eventually refuses new ones.
      renderer.forceContextLoss();
    },
    recenter() {
      offset.x = 0;
      offset.y = 0;
      vel.x = 0;
      vel.y = 0;
    },
    getOffset() {
      return { x: offset.x, y: offset.y };
    },
  };
}
