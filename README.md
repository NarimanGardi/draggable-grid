# draggable-grid

A draggable, infinitely-wrapping WebGL wall of images. Fling it with inertia, it wraps
so there's no edge, and it drifts on its own when you leave it alone. The posters are
curved planes on a concave dome — the whole wall bows toward you like you're sitting
inside it. Reduced-motion or no WebGL falls back to a plain static grid.

## Where this came from

This is the poster wall from a project called Cinematch, generalized into a component.
The original renders film posters as textured planes in a three.js scene, dragged and
wrapped, bowed into a dome by a perspective camera. This package is that engine with the
Cinematch specifics removed: bring your own images, tune the curve and the drift, and it
degrades to a static grid where WebGL isn't wanted or available.

The posters here go a step further than the original — each one is a curved plane
(bent on a cylinder), so it cups toward the viewer rather than staying flat. It builds
on [three.js](https://threejs.org); the "draggable wall" is a well-worn creative-web
effect, and this is a small, configurable take on it.

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
  curve={{ dome: 0.018, bend: 0.6 }}
  drift={{ enabled: true, speed: 0.004, angle: 160 }}
  onSelect={(item, i) => open(films[i])}
  style={{ height: '80vh' }}
/>
```

## Props

Grouped knobs (`curve`, `drag`, `drift`) take a partial object merged over the defaults;
pass `false` to switch a behavior off.

| Prop                  | Type                                         | Default                      | Notes                                                               |
| --------------------- | -------------------------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| `items`               | `(string \| { src; alt? })[]`                | — (required)                 | Image sources. `alt` feeds the fallback + accessible label.         |
| `columns`             | `number`                                     | `7`                          | Columns in the repeating tile.                                      |
| `gap`                 | `number`                                     | `0.18`                       | Gap between posters, as a fraction of poster width.                 |
| `cellAspect`          | `number`                                     | `2 / 3`                      | Poster width ÷ height.                                              |
| `curve`               | `{ dome; bend } \| false`                    | `{ dome: 0.018, bend: 0.6 }` | `dome` = wall concavity, `bend` = per-poster curve. `false` = flat. |
| `drag`                | `{ inertia; sensitivity; axis; enabled }`    | `{ 0.94, 1, 'both', true }`  | `axis` is `'x' \| 'y' \| 'both'`.                                   |
| `drift`               | `{ enabled; speed; angle } \| false`         | `{ true, 0.004, 160 }`       | Continuous ambient motion; `angle` in degrees.                      |
| `dpr`                 | `[number, number]`                           | `[1, 2]`                     | Device-pixel-ratio clamp.                                           |
| `background`          | `string`                                     | `'transparent'`              | CSS color; `'transparent'` clears to alpha.                         |
| `onSelect`            | `(item, i) => void`                          | —                            | Fires on a tap (not a drag), via raycast.                           |
| `onReady`             | `() => void`                                 | —                            | Fires once the first texture has painted.                           |
| `fallback`            | `'static' \| 'none' \| (items) => ReactNode` | `'static'`                   | Reduced-motion / no-WebGL path.                                     |
| `className` / `style` | —                                            | —                            | Passthrough; `style.height` sizes the canvas.                       |

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
  That's intended, but the curved wall is a WebGL-only experience.
- **Content repeats.** Wrapping is periodic; textures are cycled across the wall, so the
  same images reappear as you drag past a span. There's no endless unique content.
- **Every image is loaded as a texture.** No streaming or atlasing — a few hundred posters
  is fine; thousands will cost GPU memory and load time.
- **Motion is frame-based, not time-based.** Inertia and drift are tuned around ~60fps and
  run proportionally faster on high-refresh or uncapped displays.
- **No lightbox, routing, or data fetching.** It renders and moves a wall; the rest is yours.

## License

MIT © Nariman Gardi
