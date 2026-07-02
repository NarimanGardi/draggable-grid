import type { ReactNode, CSSProperties } from 'react';
import type { Axis } from './layout';
import type { LensConfig, LensFn } from './lens';
import type { EaseFn } from './motion';
import type { FallbackMode } from './prefersReducedMotion';

export interface DragConfig {
  inertia: number; // velocity retained per frame (0..1)
  sensitivity: number; // multiplier on pointer delta
  axis: Axis;
  enabled: boolean;
}

export interface IdleDriftConfig {
  enabled: boolean;
  speed: number; // px per frame at full drift
  delay: number; // ms of inactivity before drift starts
}

export interface DraggableGridHandle {
  recenter(): void;
  scrollToItem(index: number): void;
  getOffset(): { x: number; y: number };
}

export interface DraggableGridProps<T> {
  items: T[];
  renderItem?: (item: T, index: number) => ReactNode;
  columns?: number;
  gap?: number;
  cellAspect?: number; // width / height
  wrap?: boolean;
  lens?: Partial<LensConfig> | false;
  lensFn?: LensFn;
  drag?: Partial<DragConfig>;
  ease?: EaseFn;
  idleDrift?: Partial<IdleDriftConfig> | false;
  fallback?: FallbackMode | ((items: T[]) => ReactNode);
  background?: string;
  cursor?: boolean;
  onSelect?: (item: T, index: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  className?: string;
  style?: CSSProperties;
}
