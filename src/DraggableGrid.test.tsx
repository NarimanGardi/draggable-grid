import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('fires onSelect when a cell is activated', () => {
    const onSelect = vi.fn();
    render(<DraggableGrid items={items} onSelect={onSelect} style={{ height: 400 }} />);
    const cells = screen.getAllByRole('button');
    // A genuine click (which use-gesture's filterTaps lets through as a tap).
    // fireEvent.click matches the click a real tap produces; userEvent's full
    // pointer sequence isn't fully driven by use-gesture's state machine under
    // jsdom, so tap-vs-drag is exercised in the browser in Task 9.
    fireEvent.click(cells[0]!);
    expect(onSelect).toHaveBeenCalledWith('/a.jpg', 0);
  });

  it('gives selectable cells an accessible name', () => {
    render(<DraggableGrid items={items} onSelect={() => {}} style={{ height: 400 }} />);
    const cells = screen.getAllByRole('button');
    expect(cells.length).toBeGreaterThanOrEqual(items.length);
    for (const cell of cells) {
      expect(cell).toHaveAccessibleName(/\S/);
    }
  });

  it('renders no buttons when onSelect is absent', () => {
    render(<DraggableGrid items={items} style={{ height: 400 }} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('renders a custom fallback function under reduced motion', () => {
    stubReducedMotion(true);
    render(<DraggableGrid items={items} fallback={() => <p>reduced</p>} style={{ height: 400 }} />);
    expect(screen.getByText('reduced')).toBeInTheDocument();
  });
});
