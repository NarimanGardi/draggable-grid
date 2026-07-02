import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs vitest with jsdom', () => {
    expect(typeof document).toBe('object');
  });
});
