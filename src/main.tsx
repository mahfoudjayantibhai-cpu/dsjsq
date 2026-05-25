import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GlobalSettingsProvider } from './context/GlobalSettings'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalSettingsProvider>
      <App />
    </GlobalSettingsProvider>
  </StrictMode>,
)
