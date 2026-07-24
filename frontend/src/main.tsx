import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App'
import { GlobalErrorProvider } from './contexts/GlobalErrorContext'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "1000000000000-placeholderid.apps.googleusercontent.com";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorProvider>
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    </GlobalErrorProvider>
  </StrictMode>,
)
