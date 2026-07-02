# draggable-grid

An infinite, draggable, wrapping grid of your own React cells. Fling it around with
inertia, it wraps so there's no edge, and it bows toward the center for a bit of depth.
Everything is a prop with a sensible default; under reduced-motion it degrades to a
plain static grid.

## Where this came from

I built the original version as the poster wall for a project called Cinematch — a
grid of film posters you could grab and throw around, wrapping forever. It started on
WebGL: render the posters to a texture, then run a fullscreen shader to bow the whole
thing toward the center.

Pulling it out into a reusable component, I dropped WebGL on purpose. A WebGL lens is a
post-process on the canvas — it can't touch real DOM, so the moment you want the cells
to be your own content (an `<img>` with a real `src`, a link, an arbitrary component),
the effect and the content stop being the same thing. So the cells here are plain DOM,
dragged and wrapped with CSS transforms, and the "lens" is a CSS scale/curve that bends
the actual cards. You lose the optical distortion of a real shader; you gain content
that's genuinely yours. That trade is the whole point of this package.

It leans on [`@use-gesture/react`](https://github.com/pmndrs/use-gesture) for pointer and
touch handling. The "draggable wall" itself is a well-worn creative-web effect — this is
just a small, configurable, honest version of it.

## Install

```sh
npm i @narimangardi/draggable-grid
```

`react` and `react-dom` (>=18) are peer dependencies.

## Use

Zero config — pass image URLs and drag:

```tsx
import { DraggableGrid } from '@narimangardi/draggable-grid';

const posters = ['/a.jpg', '/b.jpg', '/c.jpg' /* … */];

export function Wall() {
  return <DraggableGrid items={posters} style={{ height: '80vh' }} />;
}
```

Your own cells and a few knobs:

```tsx
<DraggableGrid
  items={films}
  renderItem={(film) => (
    <a href={film.url}>
      <img src={film.poster} alt={film.title} />
    </a>
  )}
  columns={6}
  lens={{ strength: 0.14, radius: 0.8 }}
  idleDrift={{ enabled: true, speed: 0.02, delay: 2000 }}
  onSelect={(film) => open(film)}
  style={{ height: '80vh' }}
/>
```

A bare string or a `{ src, alt }` object renders as an `<img>` that fills its cell.
Anything else, supply your own `renderItem` returning any React node.

## Props

Grouped knobs (`lens`, `drag`, `idleDrift`) take a partial object merged over the
defaults; pass `false` (or `{ enabled: false }`) to switch a behavior off.

| Prop                        | Type                                         | Default                           | Notes                                            |
| --------------------------- | -------------------------------------------- | --------------------------------- | ------------------------------------------------ |
| `items`                     | `T[]`                                        | — (required)                      | Your data.                                       |
| `renderItem`                | `(item: T, i: number) => ReactNode`          | built-in image renderer           | Owns a cell's content.                           |
| `columns`                   | `number`                                     | `7`                               | Cells across; the grid fits its container width. |
| `gap`                       | `number`                                     | `16`                              | Pixels between cells.                            |
| `cellAspect`                | `number`                                     | `2 / 3`                           | Cell width ÷ height.                             |
| `wrap`                      | `boolean`                                    | `true`                            | `false` for a finite grid with edges.            |
| `lens`                      | `{ strength; radius } \| false`              | `{ strength: 0.14, radius: 0.8 }` | Concave curve toward center. `false` to flatten. |
| `lensFn`                    | `(cell, viewport, cfg) => { scale; dx; dy }` | —                                 | Replace the built-in curve.                      |
| `drag`                      | `{ inertia; sensitivity; axis; enabled }`    | `{ 0.92, 1, 'both', true }`       | `axis` is `'x' \| 'y' \| 'both'`.                |
| `ease`                      | `(v: number, dt: number) => number`          | —                                 | Replace the inertia decay curve.                 |
| `idleDrift`                 | `{ enabled; speed; delay } \| false`         | `{ true, 0.02, 3000 }`            | Slow drift after `delay` ms idle.                |
| `fallback`                  | `'static' \| 'none' \| (items) => ReactNode` | `'static'`                        | Reduced-motion path.                             |
| `background`                | `string`                                     | `'transparent'`                   | Container background.                            |
| `cursor`                    | `boolean`                                    | `true`                            | Show grab / grabbing cursors.                    |
| `onSelect`                  | `(item: T, i: number) => void`               | —                                 | Click / Enter on a cell.                         |
| `onDragStart` / `onDragEnd` | `() => void`                                 | —                                 | Drag lifecycle.                                  |
| `className` / `style`       | —                                            | —                                 | Passthrough; `style.height` sizes the viewport.  |

### Imperative handle

Pass a `ref` to drive it from outside:

```tsx
const grid = useRef<DraggableGridHandle>(null);
// grid.current.recenter()
// grid.current.scrollToItem(12)
// grid.current.getOffset() -> { x, y }
```

### Escape hatches

`lensFn` replaces the built-in curve with your own transform per cell; `ease` replaces
the per-frame inertia decay. Both are ignored if you don't pass them, so they cost
nothing for the common case.

## Accessibility

When you pass `onSelect`, cells render as `<button>`s with an `aria-label` derived from
the item (its `alt`/`title`, else `Item N`), so they're keyboard-reachable and activate
on Enter. Without `onSelect`, cells are plain wrappers and carry whatever semantics your
own content provides. Under `prefers-reduced-motion: reduce` the component renders a
static, bounded, scrollable grid — no dragging, no animation loop.

## Limitations / Not handled

- **The lens is a CSS transform, not an optical distortion.** It scales and nudges cells
  by distance from center; it won't refract or fisheye like a real shader. That's the
  deliberate trade for keeping cells as real DOM (see above).
- **Content repeats.** Wrapping is periodic — when `items` don't fill the tile, the same
  items reappear as you drag past a span. There's no endless stream of unique content.
- **No virtualization beyond the viewport.** Only cells covering the viewport (plus a
  wrap margin) are positioned, but each covering tile renders all of `items`, so a very
  large `items` array puts a lot of nodes in the DOM. It's built for walls of tens to a
  few hundred, not tens of thousands.
- **Motion is frame-based, not time-based.** Inertia and drift are tuned around ~60fps
  and run proportionally faster on 120Hz or uncapped displays.
- **No lightbox, routing, or data fetching.** It renders and moves cells; the rest is
  yours.

## License

MIT © Nariman Gardi
