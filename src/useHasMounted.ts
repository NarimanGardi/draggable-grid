import { useEffect, useState } from 'react';

// SSR and the first client render return false so the component can emit the
// static fallback markup and avoid a hydration mismatch; flips true after mount.
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
