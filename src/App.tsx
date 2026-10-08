import { lazy, Suspense } from 'react'
import { Marketing } from './marketing/Marketing'

const Workspace = lazy(() => import('./Workspace'))

export default function App() {
  const isDesktop = Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  if (location.pathname === '/' && !isDesktop && !/[?&](code|error)=/.test(location.search)) return <Marketing />
  return <Suspense fallback={<div className="workspace-loading" role="status">Opening Edon…</div>}><Workspace /></Suspense>
}
