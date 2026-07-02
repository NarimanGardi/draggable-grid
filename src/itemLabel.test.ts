import { describe, it, expect } from 'vitest';
import { itemLabel } from './itemLabel';

describe('itemLabel', () => {
  it('uses a non-empty alt on an object item', () => {
    expect(itemLabel({ src: '/a.jpg', alt: 'A red barn' }, 0)).toBe('A red barn');
  });

  it('uses title when alt is absent', () => {
    expect(itemLabel({ title: 'Poster' }, 3)).toBe('Poster');
  });

  it('prefers alt over title', () => {
    expect(itemLabel({ alt: 'alt text', title: 'title text' }, 0)).toBe('alt text');
  });

  it('falls back to a positional label for an empty alt', () => {
    expect(itemLabel({ src: '/a.jpg', alt: '' }, 4)).toBe('Item 5');
  });

  it('falls back to a positional label for bare-string items', () => {
    expect(itemLabel('/a.jpg', 0)).toBe('Item 1');
  });

  it('falls back to a positional label for objects without alt/title', () => {
    expect(itemLabel({ src: '/a.jpg' }, 2)).toBe('Item 3');
  });
});
