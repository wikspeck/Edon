import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LinkedControls } from '../src/music/LinkedControls'
import { useHeldDJKeys } from '../src/music/useHeldDJKeys'
import { Control } from '../src/music/Deck'
export function Test() {
  const [filter, setFilter] = useState(0); const [volume, setVolume] = useState(.5)
  const held = useRef({ crossfade: 0, nudge: 0 }); const [result, setResult] = useState('Not run')
  useHeldDJKeys({ focused: 0, onMove: (delta) => { held.current.crossfade += delta }, onNudge: (_slot, direction) => { held.current.nudge = direction } })
  const runHeldTests = async () => {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)); const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message) }
    const send = (type: string, key: string, code = key, target: HTMLElement = document.body) => target.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true }))
    try {
      held.current.crossfade = 0; send('keydown', 'ArrowRight'); await wait(300); send('keyup', 'ArrowRight'); const normal = held.current.crossfade; await wait(80); assert(normal > .05 && normal < .2 && held.current.crossfade === normal, 'Normal movement or key release failed')
      held.current.crossfade = 0; send('keydown','ArrowUp'); send('keydown','ArrowRight'); await wait(300); send('keyup','ArrowRight'); send('keyup','ArrowUp'); const fast = held.current.crossfade; assert(fast > normal * 2, 'Fast modifier failed')
      held.current.crossfade = 0; send('keydown','ArrowDown'); send('keydown','ArrowLeft'); await wait(300); send('keyup','ArrowLeft'); send('keyup','ArrowDown'); const slow = held.current.crossfade; assert(slow < 0 && Math.abs(slow) < normal * .6, 'Slow left movement failed')
      held.current.crossfade = 0; send('keydown','ArrowRight'); send('keydown','ArrowLeft'); await wait(80); send('keyup','ArrowLeft'); send('keyup','ArrowRight'); assert(held.current.crossfade === 0, 'Opposite keys did not cancel')
      send('keydown','v','KeyV'); assert(held.current.nudge === 1,'Nudge up failed'); send('keyup','v','KeyV'); assert(held.current.nudge === 0,'Nudge release failed')
      send('keydown','ArrowRight'); window.dispatchEvent(new Event('blur')); const stopped = held.current.crossfade; await wait(80); assert(held.current.crossfade === stopped,'Blur left a stuck key')
      const input = document.querySelector<HTMLInputElement>('[aria-label="Typing guard"]')!; input.focus(); held.current.crossfade = 0; send('keydown','ArrowRight','ArrowRight',input); await wait(80); send('keyup','ArrowRight','ArrowRight',input); assert(held.current.crossfade === 0,'Typing changed crossfader')
      setResult(`PASS: held crossfader, speed modifiers, opposite keys, release, blur, typing guard and temporary nudge. normal=${normal.toFixed(3)} fast=${fast.toFixed(3)} slow=${slow.toFixed(3)}`)
    } catch (error) { setResult(`FAIL: ${error instanceof Error ? error.message : error}`) } finally { for (const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']) send('keyup',key); send('keyup','v','KeyV') }
  }
  return <LinkedControls><h1>Linked controls: select with Shift-click, use Home/End to move</h1><Control label="Test Filter" value={filter} min={-1} max={1} step={.02} onChange={setFilter} /><Control label="Test Level" value={volume} min={0} max={1} step={.01} onChange={setVolume} /><button onClick={() => document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', key: '1', bubbles: true }))}>Hold inverse</button><button onClick={() => document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit1', key: '1', bubbles: true }))}>Release inverse</button><button onClick={() => void runHeldTests()}>Run held key checks</button><input aria-label="Typing guard" /><p role="status">{result}</p><output aria-label="Linked values">{JSON.stringify({ filter, volume })}</output></LinkedControls>
}
createRoot(document.getElementById('root')!).render(<Test />)
