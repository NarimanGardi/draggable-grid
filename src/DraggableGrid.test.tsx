import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DraggableGrid } from './DraggableGrid';

const items = ['/a.jpg', '/b.jpg', '/c.jpg'];

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('reduce') ? matches : false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => stubReducedMotion(false));
afterEach(() => vi.unstubAllGlobals());

describe('DraggableGrid', () => {
  it('renders the items with the default image renderer', () => {
    render(<DraggableGrid items={items} style={{ height: 400 }} />);
    // defaultRenderItem emits decorative <img alt=""> — the accessible label
    // lives on the wrapping <button>, so the image exposes role="presentation",
    // not "img". Querying that role still asserts the images landed in the DOM.
    expect(screen.getAllByRole('presentation').length).toBeGreaterThanOrEqual(items.length);
  });

  it('renders a static grid under reduced motion (no interactive layer)', () => {
    stubReducedMotion(true);
    render(<DraggableGrid items={items} style={{ height: 400 }} />);
    const region = screen.getByTestId('draggable-grid');
    expect(region).toHaveAttribute('data-mode', 'static');
  });

  it('fires onSelect when a cell is activated', async () => {
    const onSelect = vi.fn();
    render(<DraggableGrid items={items} onSelect={onSelect} style={{ height: 400 }} />);
    const cells = screen.getAllByRole('button');
    await userEvent.click(cells[0]!);
    expect(onSelect).toHaveBeenCalledWith('/a.jpg', 0);
  });

  it('renders a custom fallback function under reduced motion', () => {
    stubReducedMotion(true);
    render(
      <DraggableGrid
        items={items}
        fallback={() => <p>reduced</p>}
        style={{ height: 400 }}
      />
    );
    expect(screen.getByText('reduced')).toBeInTheDocument();
  });
});
