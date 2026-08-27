import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App'
import { GlobalErrorProvider } from './contexts/GlobalErrorContext'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "1000000000000-placeholderid.apps.googleusercontent.com";

// --- GLOBAL FETCH INTERCEPTOR FOR SESSION TIMEOUT ---
// Intercepts all fetch requests to gracefully handle 401 Unauthorized errors 
// when the JWT cookie expires, preventing "dead buttons" and silent failures.
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  const token = localStorage.getItem('token');
  const url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : '');
  
  if (token && url.includes('/api/')) {
    config = config || {};
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    };
    args = [resource, config];
  }

  const response = await originalFetch(...args);
  
  if (response.status === 401) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');
    // If our API returns 401 (and it's not the login/signup endpoints themselves)
    if (url.includes('/api/') && !url.includes('/login') && !url.includes('/signup')) {
      
      // Check if this 401 is actually a third-party token expiration (e.g. Instagram)
      try {
        const cloned = response.clone();
        const data = await cloned.json();
        if (data && data.requiresReconnect) {
          // Let the specific component handle the reconnect UI
          return response;
        }
      } catch (e) {
        // Ignore json parse errors
      }

      console.warn('Session expired. Redirecting to login...');
      localStorage.removeItem('syncsocio_profile');
      
      // Only redirect if we aren't already on a public/auth route
      const publicRoutes = ['/login', '/signup', '/onboarding', '/'];
      if (!publicRoutes.includes(window.location.pathname)) {
        window.location.href = '/login?expired=true';
      }
    }
  }
  return response;
};
// ---------------------------------------------------

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorProvider>
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    </GlobalErrorProvider>
  </StrictMode>,
)
