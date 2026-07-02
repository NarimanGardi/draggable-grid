import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

// useLayoutEffect measures before the browser paints (no flash of mis-sized
// cells); on the server it would warn, so fall back to useEffect there.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Track an element's rendered pixel size. Returns { w: 0, h: 0 } until the
// first measurement, so callers need a fallback for the initial client render.
// The grid measures its own container rather than trusting `style.height`,
// which may be a CSS string ('80vh', '100%') the layout math can't consume.
export function useMeasuredSize(ref: RefObject<HTMLElement | null>): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize((prev) =>
        prev.w === rect.width && prev.h === rect.height ? prev : { w: rect.width, h: rect.height },
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
