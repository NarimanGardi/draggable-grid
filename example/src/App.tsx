import { useRef, useState } from 'react';
import { DraggableGrid, type DraggableGridHandle } from '@narimangardi/draggable-grid';

const posters = Array.from({ length: 24 }, (_, i) => ({
  src: `https://picsum.photos/seed/dg${i}/300/450`,
  alt: `Sample ${i + 1}`,
}));

export function App() {
  const ref = useRef<DraggableGridHandle>(null);
  const [lens, setLens] = useState(true);
  const [drift, setDrift] = useState(true);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0b0b0d',
        fontFamily: 'system-ui',
        color: '#eee',
      }}
    >
      <DraggableGrid
        ref={ref}
        items={posters}
        columns={6}
        lens={lens ? { distortion: 0.6, vignette: 0.28 } : false}
        drift={drift ? { enabled: true, speed: 0.004, angle: 160, delay: 1200 } : false}
        onSelect={(item, i) => console.log('select', i, item)}
        style={{ width: '100%', height: '100%' }}
      />
      <header
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <strong style={{ marginRight: 4 }}>draggable-grid</strong>
        <button onClick={() => setLens((v) => !v)}>lens: {lens ? 'on' : 'off'}</button>
        <button onClick={() => setDrift((v) => !v)}>drift: {drift ? 'on' : 'off'}</button>
        <button onClick={() => ref.current?.recenter()}>recenter</button>
      </header>
    </div>
  );
}
