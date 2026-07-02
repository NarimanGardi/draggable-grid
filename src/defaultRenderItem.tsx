import { isValidElement, type ReactNode } from 'react';

// Zero-config content: a bare URL string or a { src, alt } object becomes an
// <img> that fills its cell; a React element is rendered as-is. Anything else
// should be handled by the consumer's own renderItem. Assignable to the
// renderItem prop, which passes an index this default doesn't need.
export function defaultRenderItem(item: unknown): ReactNode {
  if (typeof item === 'string') {
    return <img src={item} alt="" style={imgStyle} draggable={false} />;
  }
  if (isValidElement(item)) return item;
  if (item && typeof item === 'object' && 'src' in item) {
    const { src, alt } = item as { src: string; alt?: string };
    return <img src={src} alt={alt ?? ''} style={imgStyle} draggable={false} />;
  }
  return null;
}

const imgStyle = { width: '100%', height: '100%', objectFit: 'cover' as const, display: 'block' };
