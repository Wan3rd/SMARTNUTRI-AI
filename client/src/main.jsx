import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Detect software rendering (Hardware Acceleration OFF) or low-spec devices
// so expensive backdrop-filter blurs and heavy shadows degrade gracefully to 60fps solid layers.
;(() => {
  try {
    let isLowSpec =
      (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4) ||
      (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4)

    if (!isLowSpec) {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) {
        isLowSpec = true
      } else {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info')
        const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : ''
        if (/swiftshader|software|llvmpipe|basic render|microsoft basic|gdi generic/i.test(renderer)) {
          isLowSpec = true
        }
      }
    }

    if (isLowSpec) {
      document.documentElement.classList.add('low-spec')
    }
  } catch {
    // Ignore detection errors
  }
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
