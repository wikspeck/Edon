import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Film, Plus, Download, Trash2 } from 'lucide-react'
import { createId, type EdonDocument, type VideoClip } from '../model/document'
import './video.css'

function asset(id: string, file?: Blob): Promise<Blob | undefined> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open('edon.video.assets', 1)
    opening.onupgradeneeded = () => opening.result.createObjectStore('clips')
    opening.onerror = () => reject(opening.error)
    opening.onsuccess = () => {
      const db = opening.result
      const tx = db.transaction('clips', file ? 'readwrite' : 'readonly')
      const request = file ? tx.objectStore('clips').put(file, id) : tx.objectStore('clips').get(id)
      tx.oncomplete = () => { resolve(file ?? request.result); db.close() }
      tx.onerror = () => { reject(tx.error); db.close() }
    }
  })
}

export function VideoEditor({ document: file, onChange, onBack }: { document: EdonDocument; onChange: (file: EdonDocument) => void; onBack: () => void }) {
  const clips = file.video ?? []
  const [selected, setSelected] = useState(clips[0]?.id ?? '')
  const [source, setSource] = useState({ id: '', url: '' })
  const url = source.id === selected ? source.url : ''
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const player = useRef<HTMLVideoElement>(null)
  const clip = clips.find((item) => item.id === selected)
  const update = (video: VideoClip[]) => onChange({ ...file, video, revision: file.revision + 1, updatedAt: new Date().toISOString() })
  const patch = (change: Partial<VideoClip>) => {
    const next = clip ? { ...clip, ...change } : undefined
    if (next && player.current && (player.current.currentTime < next.start || player.current.currentTime >= next.end)) player.current.currentTime = next.start
    update(clips.map((item) => item.id === selected ? { ...item, ...change } : item))
  }
  useEffect(() => {
    let cancelled = false; let objectUrl = ''
    if (selected) void asset(selected).then((blob) => {
      if (cancelled) return
      if (!blob) { setError('The source clip is missing from this device. Import it again.'); return }
      objectUrl = URL.createObjectURL(blob); setSource({ id: selected, url: objectUrl })
    }).catch((reason: Error) => { if (!cancelled) setError(reason.message) })
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [selected])
  const importFiles = async (files: File[]) => {
    setBusy(true); setError(''); const imported: VideoClip[] = []
    try {
      for (const source of files) {
        if (!source.type.startsWith('video/')) throw new Error('Choose a video file supported by your browser.')
        const sourceUrl = URL.createObjectURL(source)
        const duration = await new Promise<number>((resolve, reject) => {
          const video = document.createElement('video'); video.preload = 'metadata'; video.src = sourceUrl
          video.onloadedmetadata = () => { const value = video.duration; video.removeAttribute('src'); video.load(); if (Number.isFinite(value) && value > 0) resolve(value); else reject(new Error('Cannot read clip duration.')) }
          video.onerror = () => reject(new Error(`Cannot decode ${source.name}`))
        }).finally(() => URL.revokeObjectURL(sourceUrl))
        const id = createId('video'); await asset(id, source)
        imported.push({ id, name: source.name, duration, start: 0, end: duration, muted: false })
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Import failed') }
    finally { if (imported.length) { update([...clips, ...imported]); setSelected(imported[0].id) } setBusy(false) }
  }
  const exportProject = () => {
    const objectUrl = URL.createObjectURL(new Blob([JSON.stringify({ format: 'edon.video.v1', name: file.name, clips }, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = objectUrl; link.download = `${file.name}.edon-video.json`; link.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
  return <main className="video-studio" onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault() }} onDrop={(event) => { event.preventDefault(); if (!busy) void importFiles([...event.dataTransfer.files]) }}>
    <header><button aria-label="Back to files" onClick={onBack}><ArrowLeft size={16} /></button><Film size={16} /><strong>edon / Video</strong><span>{file.name}</span><small>Early workspace · preview & trim</small><button onClick={exportProject} disabled={!clips.length}><Download size={14} /> Save edit list</button></header>
    <aside className="video-media"><p className="eyebrow">Media</p><button disabled={busy} onClick={() => input.current?.click()}><Plus size={14} />{busy ? 'Importing…' : 'Import video'}</button><input hidden ref={input} type="file" accept="video/*" multiple onChange={(event) => { void importFiles([...event.target.files ?? []]); event.target.value = '' }} />{clips.map((item) => <button key={item.id} aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setError('') }}><Film size={14} /><span>{item.name}<small>{(item.end - item.start).toFixed(1)} s</small></span></button>)}</aside>
    <section className="video-preview">{error && <p role="alert">{error}</p>}{clip && url ? <video ref={player} src={url} controls muted={clip.muted} onLoadedMetadata={() => { if (player.current) player.current.currentTime = clip.start }} onTimeUpdate={() => { if (player.current && (player.current.currentTime > clip.end || player.current.currentTime < clip.start)) { player.current.pause(); player.current.currentTime = clip.start } }} /> : <div><Film size={36} /><h1>Give your story a little motion.</h1><p>Drop your footage anywhere to start.</p><button disabled={busy} onClick={() => input.current?.click()}>Import a clip</button></div>}</section>
    <aside className="video-inspector"><p className="eyebrow">Clip settings</p>{clip ? <><h3>{clip.name}</h3><label>In point <input aria-label="Clip in point" type="number" min={0} max={clip.end - .1} step="0.1" value={clip.start} onChange={(event) => patch({ start: Math.max(0, Math.min(clip.end - .1, Number(event.target.value))) })} /></label><label>Out point <input aria-label="Clip out point" type="number" min={clip.start + .1} max={clip.duration} step="0.1" value={clip.end} onChange={(event) => patch({ end: Math.max(clip.start + .1, Math.min(clip.duration, Number(event.target.value))) })} /></label><label><input type="checkbox" checked={clip.muted} onChange={(event) => patch({ muted: event.target.checked })} /> Mute source audio</label><button onClick={() => { update(clips.filter((item) => item.id !== selected)); setSelected('') }}><Trash2 size={13} /> Remove from edit</button></> : <p>Select a clip to adjust it.</p>}<small>Source files and edit points stay on this device. Save edit list exports metadata; rendered video export is not available yet.</small></aside>
    <section className="video-timeline"><div><span className="eyebrow">Sequence</span><span>{clips.reduce((sum, item) => sum + item.end - item.start, 0).toFixed(1)} s</span></div><div>{clips.map((item) => <button key={item.id} aria-pressed={item.id === selected} style={{ flexGrow: Math.max(1, item.end - item.start) }} onClick={() => setSelected(item.id)}><Film size={13} />{item.name}<small>{item.start.toFixed(1)} — {item.end.toFixed(1)}</small></button>)}</div><p>Click a segment to preview and trim. Each clip is previewed separately.</p></section>
  </main>
}
