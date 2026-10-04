import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LinkedControls } from '../src/music/LinkedControls'
import { Control } from '../src/music/Deck'
export function Test() {
  const [filter, setFilter] = useState(0); const [volume, setVolume] = useState(.5)
  return <LinkedControls><h1>Linked controls: select with Shift-click, use arrow keys to move</h1><Control label="Test Filter" value={filter} min={-1} max={1} step={.02} onChange={setFilter} /><Control label="Test Level" value={volume} min={0} max={1} step={.01} onChange={setVolume} /><button onClick={() => document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', key: '1', bubbles: true }))}>Hold inverse</button><button onClick={() => document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit1', key: '1', bubbles: true }))}>Release inverse</button><output aria-label="Linked values">{JSON.stringify({ filter, volume })}</output></LinkedControls>
}
createRoot(document.getElementById('root')!).render(<Test />)
