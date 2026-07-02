import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { defaultRenderItem } from './defaultRenderItem';

describe('defaultRenderItem', () => {
  it('renders a string as an <img> src', () => {
    const { container } = render(<>{defaultRenderItem('/poster.jpg')}</>);
    // A decorative image (empty alt) is presentational, so it has no `img`
    // role — query the element directly rather than by role.
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/poster.jpg');
  });

  it('renders an object with a src as an <img> with alt', () => {
    render(<>{defaultRenderItem({ src: '/a.jpg', alt: 'A film' })}</>);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/a.jpg');
    expect(img).toHaveAttribute('alt', 'A film');
  });

  it('passes a React element through unchanged', () => {
    render(<>{defaultRenderItem(<span>hi</span>)}</>);
    expect(screen.getByText('hi')).toBeInTheDocument();
  });
});
