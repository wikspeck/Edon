import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'
import './music/music.css'
import './styles/refinement.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
