# draggable-grid

A draggable, infinitely-wrapping WebGL wall of images. Fling it with inertia, it wraps
so there's no edge, and it drifts on its own when you leave it alone. The whole wall
warps through a fullscreen lens — a concave "hole" that sinks inward toward the center,
corners falling into a vignette. No WebGL (or reduced-motion) falls back to a plain
static grid.

![draggable-grid — a draggable WebGL wall of images sinking into a concave lens](https://raw.githubusercontent.com/NarimanGardi/draggable-grid/main/docs/demo.gif)

## Where this came from

Two lineages. The draggable, infinitely-wrapping poster wall comes from a project called
Cinematch — film posters as textured planes in a three.js scene you fling around. The
look comes from [phantom.land](https://www.phantom.land)'s homepage grid: the flat grid
is rendered to a texture and warped by a **fullscreen distortion + vignette shader**.
phantom's bulges outward like a bubble; this one is inverted into a concave hole that
sinks inward. Put together and stripped of the app-specific bits: bring your own images,
tune the lens and the drift, and it degrades to a static grid where WebGL isn't
available.

It builds on [three.js](https://threejs.org); the "draggable wall" and the
fullscreen-lens grid are both well-worn creative-web techniques, and this is a small,
configurable take on them.

## Install

```sh
npm i @narimangardi/draggable-grid three
```

`react`, `react-dom` (>=18) and `three` (>=0.160) are peer dependencies.

## Use

Zero config — pass image URLs and drag:

```tsx
import { DraggableGrid } from '@narimangardi/draggable-grid';

const posters = ['/a.jpg', '/b.jpg', '/c.jpg' /* … */];

export function Wall() {
  return <DraggableGrid items={posters} style={{ height: '80vh' }} />;
}
```

Items can be `{ src, alt }` objects, and most things are tunable:

```tsx
<DraggableGrid
  items={films.map((f) => ({ src: f.poster, alt: f.title }))}
  columns={6}
  lens={{ distortion: 0.6, vignette: 0.28 }}
  drift={{ enabled: true, speed: 0.004, angle: 160, delay: 250 }}
  onSelect={(item, i) => open(films[i])}
  style={{ height: '80vh' }}
/>
```

## Props

Grouped knobs (`lens`, `drag`, `drift`) take a partial object merged over the defaults;
pass `false` to switch a behavior off.

| Prop                  | Type                                         | Default                               | Notes                                                       |
| --------------------- | -------------------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| `items`               | `(string \| { src; alt? })[]`                | — (required)                          | Image sources. `alt` feeds the fallback + accessible label. |
| `columns`             | `number`                                     | `7`                                   | Columns in the repeating tile.                              |
| `gap`                 | `number`                                     | `0.06`                                | Gap between posters, as a fraction of poster width.         |
| `cellAspect`          | `number`                                     | `2 / 3`                               | Poster width ÷ height.                                      |
| `lens`                | `{ distortion; vignette } \| false`          | `{ distortion: 0.6, vignette: 0.28 }` | Concave-hole warp + corner darken. `false` = flat render.   |
| `drag`                | `{ inertia; sensitivity; axis; enabled }`    | `{ 0.94, 1, 'both', true }`           | `axis` is `'x' \| 'y' \| 'both'`.                           |
| `drift`               | `{ enabled; speed; angle; delay } \| false`  | `{ true, 0.004, 160, 250 }`           | Ambient motion once idle; `angle` deg, `delay` ms.          |
| `dpr`                 | `[number, number]`                           | `[1, 2]`                              | Device-pixel-ratio clamp.                                   |
| `background`          | `string`                                     | `'transparent'`                       | CSS color; `'transparent'` clears to alpha.                 |
| `onSelect`            | `(item, i) => void`                          | —                                     | Fires on a tap (not a drag), via raycast.                   |
| `onReady`             | `() => void`                                 | —                                     | Fires once the first texture has painted.                   |
| `fallback`            | `'static' \| 'none' \| (items) => ReactNode` | `'static'`                            | Reduced-motion / no-WebGL path.                             |
| `className` / `style` | —                                            | —                                     | Passthrough; `style.height` sizes the canvas.               |

Pass a `ref` for imperative control:

```tsx
const grid = useRef<DraggableGridHandle>(null);
// grid.current.recenter()
// grid.current.getOffset() -> { x, y }
```

## Accessibility

The interactive layer is a WebGL canvas, so it's `aria-hidden`. Real, accessible content
lives in the **static fallback**: under `prefers-reduced-motion: reduce` (or where WebGL
isn't available) the component renders a plain, bounded, scrollable grid of `<img>`s with
your `alt` text. If accessibility of the content matters, treat the fallback as the
accessible representation and give every item an `alt`.

## Limitations / Not handled

- **The interactive wall is WebGL textures, not DOM.** Posters are images on GPU planes —
  you can't put a live link, selectable text, or an arbitrary React component on a poster.
  Real DOM content only exists in the static fallback. If you need genuinely interactive
  cells, this isn't the tool.
- **Needs WebGL.** No usable context (old device, headless, blocked) → the static grid.
- **Content repeats.** Wrapping is periodic; textures are cycled across the wall, so the
  same images reappear as you drag past a span. There's no endless unique content.
- **Every image is loaded as a texture.** No streaming or atlasing — a few hundred posters
  is fine; thousands will cost GPU memory and load time.
- **Motion is frame-based, not time-based.** Inertia and drift are tuned around ~60fps and
  run proportionally faster on high-refresh or uncapped displays.
- **No lightbox, routing, or data fetching.** It renders and moves a wall; the rest is yours.

## License

MIT © Nariman Gardi
