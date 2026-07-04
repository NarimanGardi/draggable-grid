import {
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
  type Texture,
} from 'three';
import { axisMask, stepInertia, type Axis, type Vec } from './motion';

// The vanilla-three engine for the draggable poster wall, modelled on phantom.land's
// homepage grid: a draggable, infinitely-wrapping wall of flat poster planes rendered to
// a texture, then warped by a fullscreen barrel-distortion + vignette shader so the whole
// wall bulges like a lens. Drag has velocity-ramped inertia, the camera dollies back while
// dragging, and the wall drifts on its own once left alone.
// Owns only the GPU scene + pointer handling; the canvas, static fallback, and accessible
// DOM belong to the React component. Imported client-side so three stays out of SSR.

export interface EngineOptions {
  posters: string[];
  columns: number;
  cellAspect: number;
  gap: number; // gap as a fraction of poster width
  lens: { distortion: number; vignette: number } | false; // barrel warp + corner darken
  drag: { inertia: number; sensitivity: number; axis: Axis; enabled: boolean };
  drift: { enabled: boolean; speed: number; angle: number; delay: number };
  dpr: [number, number];
  background: string;
  onReady: () => void;
  onSelect?: (index: number) => void;
  visibleRef: { current: boolean };
}

const FOV = 38;
const CAM_Z = 26;
const ZOOM_OUT = 1.16; // camera dollies back while dragging
const DEG2RAD = Math.PI / 180;
const CARD_W = 3.0;
const MARGIN = 4;
const TAP_PX = 6;

const POST_VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// Pincushion "hole" distortion + vignette, sampling the rendered grid. shiftedUv is the
// fragment's position relative to center; the center is pushed to sample from further out
// (recedes) while the edges magnify, so the wall sinks inward like looking into a funnel.
// Corners that fall outside the source read as background.
const POST_FRAG = `
  precision highp float;
  uniform sampler2D tDiffuse;
  uniform float distortion;
  uniform float vignette;
  uniform vec3 bg;
  uniform float bgAlpha;
  varying vec2 vUv;
  void main() {
    vec2 s = vUv - 0.5;
    float f = max(0.2, 1.0 + distortion * (0.15 - dot(s, s)));
    s *= f;
    vec2 uv = s + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(bg, bgAlpha);
      return;
    }
    vec4 c = texture2D(tDiffuse, uv);
    float vig = 1.0 - vignette * smoothstep(0.25, 0.72, length(s));
    c.rgb *= vig;
    gl_FragColor = c;
  }
`;

function parseColor(css: string): { rgb: [number, number, number]; alpha: number } {
  if (css === 'transparent') return { rgb: [0, 0, 0], alpha: 0 };
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return { rgb: [0.04, 0.04, 0.04], alpha: 1 };
  ctx.fillStyle = css;
  const hex = ctx.fillStyle;
  if (!hex.startsWith('#')) return { rgb: [0.04, 0.04, 0.04], alpha: 1 };
  const n = parseInt(hex.slice(1), 16);
  return { rgb: [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255], alpha: 1 };
}

export interface EngineControls {
  dispose(): void;
  recenter(): void;
  getOffset(): { x: number; y: number };
  update(next: Partial<Pick<EngineOptions, 'lens' | 'drift' | 'drag'>>): void;
}

export function mountWall(
  canvas: HTMLCanvasElement,
  opts: EngineOptions,
): EngineControls | undefined {
  const probe = document.createElement('canvas');
  const supported =
    probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
    probe.getContext('webgl', { failIfMajorPerformanceCaveat: true });
  if (!supported) return;

  const n = opts.posters.length;
  if (n === 0) return;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch {
    return;
  }

  let W = canvas.clientWidth || 1280;
  let H = canvas.clientHeight || 760;
  let aspect = W / H;
  const dprValue = Math.min(Math.max(window.devicePixelRatio, opts.dpr[0]), opts.dpr[1]);
  renderer.setPixelRatio(dprValue);
  renderer.setSize(W, H, false);
  const bg = parseColor(opts.background);
  renderer.setClearColor(0x000000, 0);

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
  const geo = new PlaneGeometry(cardW, cardH);

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

  const coverHalfH = () => CAM_Z * ZOOM_OUT * tanHalf;
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
        const mat = new MeshBasicMaterial({ map: texes[idx], transparent: true });
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

  // Post-processing: render the grid to a target, then warp it with the barrel shader.
  const post = opts.lens;
  const rtSize = () => new Vector2().copy(renderer.getDrawingBufferSize(new Vector2()));
  let rt = post ? new WebGLRenderTarget(rtSize().x, rtSize().y) : null;
  const postScene = new Scene();
  const postCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postMat = new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: rt ? rt.texture : null },
      distortion: { value: post ? post.distortion : 0 },
      vignette: { value: post ? post.vignette : 0 },
      bg: { value: bg.rgb },
      bgAlpha: { value: bg.alpha },
    },
    vertexShader: POST_VERT,
    fragmentShader: POST_FRAG,
    transparent: bg.alpha === 0,
  });
  const postQuad = new Mesh(new PlaneGeometry(2, 2), postMat);
  postScene.add(postQuad);

  // Live-tunable params — mutated by update() so lens/drift/drag changes take
  // effect without tearing down the scene (which would force a context loss on the canvas).
  const dyn = {
    lens: opts.lens,
    drift: { ...opts.drift },
    drag: { ...opts.drag },
  };
  const computeDrift = (d: EngineOptions['drift']): Vec => ({
    x: d.speed * Math.cos(d.angle * DEG2RAD),
    y: d.speed * Math.sin(d.angle * DEG2RAD),
  });
  let driftVec = computeDrift(dyn.drift);

  // Interaction.
  const offset: Vec = { x: 0, y: 0 };
  const vel: Vec = { x: 0, y: 0 };
  let dragging = false;
  let lastDrag = -1e9; // timestamp of the last drag interaction (drift pauses around it)
  const last = { x: 0, y: 0 };
  let travel = 0;
  const worldPerPx = () => (2 * camera.position.z * tanHalf) / H;
  const wrap = (v: number, span: number) => {
    v = (v + span * 0.5) % span;
    if (v < 0) v += span;
    return v - span * 0.5;
  };

  const onDown = (e: PointerEvent) => {
    if (!dyn.drag.enabled) return;
    dragging = true;
    lastDrag = performance.now();
    travel = 0;
    vel.x = vel.y = 0;
    last.x = e.clientX;
    last.y = e.clientY;
    camZTarget = CAM_Z * ZOOM_OUT;
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    lastDrag = performance.now();
    const wpp = worldPerPx();
    const dxPx = e.clientX - last.x;
    const dyPx = e.clientY - last.y;
    travel += Math.abs(dxPx) + Math.abs(dyPx);
    const step = axisMask({ x: dxPx * wpp, y: -dyPx * wpp }, dyn.drag.axis);
    offset.x += step.x * dyn.drag.sensitivity;
    offset.y += step.y * dyn.drag.sensitivity;
    vel.x = step.x * dyn.drag.sensitivity;
    vel.y = step.y * dyn.drag.sensitivity;
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
    if (dragging) lastDrag = performance.now();
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
    if (rt) {
      const s = rtSize();
      rt.setSize(s.x, s.y);
    }
    const nc = neededCols();
    const nr = neededRows();
    if (nc > COLS || nr > ROWS) buildGrid(Math.max(nc, COLS), Math.max(nr, ROWS));
  };
  window.addEventListener('resize', resize);

  let frame = 0;
  const tick = () => {
    frame = requestAnimationFrame(tick);
    if (!opts.visibleRef.current) return;
    const now = performance.now();
    camera.position.z += (camZTarget - camera.position.z) * 0.08;
    if (!dragging) {
      const r = stepInertia(vel, dyn.drag.inertia, 0.0002);
      vel.x = r.v.x;
      vel.y = r.v.y;
      offset.x += vel.x;
      offset.y += vel.y;
      // Ambient drift, but only once the wall has been left alone — so it never fights an
      // active drag or slides away the instant you release.
      if (dyn.drift.enabled && now - lastDrag > dyn.drift.delay) {
        offset.x += driftVec.x;
        offset.y += driftVec.y;
      }
    }
    for (const m of cards) {
      m.position.x = wrap((m.userData.baseX as number) + offset.x, SPAN_X);
      m.position.y = wrap((m.userData.baseY as number) + offset.y, SPAN_Y);
    }
    if (rt && dyn.lens !== false) {
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
    } else {
      renderer.render(scene, camera);
    }
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
      rt?.dispose();
      postMat.dispose();
      postQuad.geometry.dispose();
      renderer.dispose();
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
    update(next) {
      if (next.drag) dyn.drag = { ...dyn.drag, ...next.drag };
      if (next.drift) {
        dyn.drift = { ...dyn.drift, ...next.drift };
        driftVec = computeDrift(dyn.drift);
      }
      if (next.lens !== undefined) {
        dyn.lens = next.lens;
        if (next.lens !== false) {
          if (!rt) {
            const s = rtSize();
            rt = new WebGLRenderTarget(s.x, s.y);
            postMat.uniforms.tDiffuse!.value = rt.texture;
          }
          postMat.uniforms.distortion!.value = next.lens.distortion;
          postMat.uniforms.vignette!.value = next.lens.vignette;
        }
      }
    },
  };
}
