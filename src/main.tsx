import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { AuthProvider } from './context/AuthContext';

// In development, automatically unregister any stale service workers to ensure API requests reach Express
if (import.meta.env.DEV) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key.includes('workbox') || key.includes('pwa')) {
            caches.delete(key);
          }
        });
      });
    }
  }
} else {
  // Register PWA Service Worker in production only
  try {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      registerSW({
        immediate: true,
      });
    }
  } catch (e) {
    // Service workers may be disabled in some sandboxed iframes
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);


