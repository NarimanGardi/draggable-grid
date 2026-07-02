import type { ReactNode, CSSProperties } from 'react';
import type { Axis } from './motion';
import type { FallbackMode } from './prefersReducedMotion';

// The interactive layer is WebGL textures, so items are image sources (a bare URL or a
// { src, alt } object). `alt` feeds the static fallback and the accessible label.
export type ImageItem = string | { src: string; alt?: string };

export interface DragConfig {
  inertia: number; // velocity retained per frame (0..1)
  sensitivity: number; // multiplier on pointer delta
  axis: Axis;
  enabled: boolean;
}

// Continuous ambient motion — the wall drifts whenever you're not dragging.
export interface DriftConfig {
  enabled: boolean;
  speed: number; // world units per frame
  angle: number; // direction in degrees
}

// The concave "theatre" shape.
export interface CurveConfig {
  dome: number; // wall concavity: a poster's Z recesses by dome*(x²+y²), clamped
  bend: number; // per-poster curve: edge Z displacement in world units (0 = flat posters)
}

export interface DraggableGridHandle {
  recenter(): void;
  getOffset(): { x: number; y: number };
}

export interface DraggableGridProps {
  items: ImageItem[];
  columns?: number;
  gap?: number; // gap between posters as a fraction of poster width
  cellAspect?: number; // poster width / height
  curve?: Partial<CurveConfig> | false; // false = flat wall, flat posters
  drag?: Partial<DragConfig>;
  drift?: Partial<DriftConfig> | false;
  dpr?: [number, number]; // device-pixel-ratio clamp
  background?: string; // CSS color; 'transparent' clears to alpha
  onSelect?: (item: ImageItem, index: number) => void;
  onReady?: () => void; // fires once the first texture has painted
  fallback?: FallbackMode | ((items: ImageItem[]) => ReactNode);
  className?: string;
  style?: CSSProperties;
}
