import { useRef, useState } from 'react';
import { DraggableGrid, type DraggableGridHandle } from '@narimangardi/draggable-grid';

const posters = Array.from({ length: 24 }, (_, i) => ({
  src: `https://picsum.photos/seed/dg${i}/300/450`,
  alt: `Sample ${i + 1}`,
}));

export function App() {
  const ref = useRef<DraggableGridHandle>(null);
  const [lensOn, setLensOn] = useState(true);
  const [drift, setDrift] = useState(true);

  return (
    <div style={{ fontFamily: 'system-ui', color: '#eee', background: '#0b0b0d', minHeight: '100vh' }}>
      <header style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <strong>draggable-grid</strong>
        <button onClick={() => setLensOn((v) => !v)}>lens: {lensOn ? 'on' : 'off'}</button>
        <button onClick={() => setDrift((v) => !v)}>drift: {drift ? 'on' : 'off'}</button>
        <button onClick={() => ref.current?.recenter()}>recenter</button>
        <button onClick={() => ref.current?.scrollToItem(12)}>scrollToItem(12)</button>
      </header>
      <DraggableGrid
        ref={ref}
        items={posters}
        columns={6}
        lens={lensOn ? { strength: 0.14, radius: 0.8 } : false}
        idleDrift={drift ? { enabled: true, speed: 0.02, delay: 2000 } : false}
        onSelect={(item, i) => console.log('select', i, item)}
        style={{ height: '80vh' }}
      />
    </div>
  );
}
