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

// Ambient motion — the wall drifts once it's been left alone.
export interface DriftConfig {
  enabled: boolean;
  speed: number; // world units per frame
  angle: number; // direction in degrees
  delay: number; // ms of no dragging before drift resumes (so it doesn't fight a drag)
}

// The fullscreen lens: a barrel warp that bulges the whole wall, plus a corner vignette.
export interface LensConfig {
  distortion: number; // barrel strength — higher bulges more (0 ≈ flat)
  vignette: number; // corner darkening, 0..1
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
  lens?: Partial<LensConfig> | false; // fullscreen barrel + vignette; false = flat render
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
