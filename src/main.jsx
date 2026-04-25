import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Mount the root React application.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
