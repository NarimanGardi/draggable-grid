import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DraggableGrid } from './DraggableGrid';

const items = ['/a.jpg', '/b.jpg', '/c.jpg'];

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('reduce') ? matches : false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  stubReducedMotion(false);
  // jsdom has no WebGL; make the probe return null cleanly (no "Not implemented" noise).
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => vi.restoreAllMocks());

describe('DraggableGrid', () => {
  it('renders a static grid under reduced motion (no canvas)', () => {
    stubReducedMotion(true);
    render(<DraggableGrid items={items} style={{ height: 400 }} />);
    expect(screen.getByTestId('draggable-grid')).toHaveAttribute('data-mode', 'static');
    expect(screen.getAllByRole('presentation').length).toBeGreaterThanOrEqual(items.length);
  });

  it('renders a { src, alt } item with its alt text in the static fallback', () => {
    stubReducedMotion(true);
    render(<DraggableGrid items={[{ src: '/x.jpg', alt: 'A poster' }]} style={{ height: 400 }} />);
    expect(screen.getByRole('img', { name: 'A poster' })).toHaveAttribute('src', '/x.jpg');
  });

  it('renders a custom fallback function under reduced motion', () => {
    stubReducedMotion(true);
    render(<DraggableGrid items={items} fallback={() => <p>reduced</p>} style={{ height: 400 }} />);
    expect(screen.getByText('reduced')).toBeInTheDocument();
  });

  it('degrades to the static grid when WebGL is unavailable', async () => {
    // Motion is allowed, so it starts on the interactive canvas path, but the engine
    // probe finds no WebGL context (mocked null) and falls back.
    render(<DraggableGrid items={items} style={{ height: 400 }} />);
    await waitFor(() =>
      expect(screen.getByTestId('draggable-grid')).toHaveAttribute('data-mode', 'static'),
    );
  });
});
