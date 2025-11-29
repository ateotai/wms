import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// En desarrollo, desregistrar cualquier Service Worker previamente instalado para evitar caché
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  }).catch(() => {});
}

// En producción, si el SW está deshabilitado explícitamente, forzar su desinstalación y limpiar caches
if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_SW !== 'true' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  }).catch(() => {});
  if (typeof caches !== 'undefined') {
    caches.keys().then((keys) => {
      keys.forEach((k) => caches.delete(k));
    }).catch(() => {});
  }
}

// Registrar Service Worker solo en producción y con flag explícita
if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_SW === 'true' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registrado:', reg.scope);
      })
      .catch((err) => {
        console.warn('No se pudo registrar el Service Worker:', err);
      });
  });
}

// Auto-suscribir Push si ya hay permiso concedido (solo en producción y si SW está habilitado)
if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_SW === 'true') {
  (function autoSubscribePush() {
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
    function urlBase64ToUint8Array(base64String: string) {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }

    if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          let publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
          if (!publicKey && AUTH_BACKEND_URL) {
            try {
              const resp = await fetch(`${AUTH_BACKEND_URL}/push/vapidPublicKey`);
              if (resp.ok) {
                const json = await resp.json();
                publicKey = json?.publicKey || '';
              }
            } catch {
              // ignore
            }
          }
          if (!publicKey) return;
          let subscription = await reg.pushManager.getSubscription();
          if (!subscription) {
            subscription = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
          }
          if (AUTH_BACKEND_URL && subscription) {
            await fetch(`${AUTH_BACKEND_URL}/push/subscribe`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscription }),
            });
          }
        } catch (e) {
          console.warn('Auto-suscripción push falló:', e);
        }
      });
    }
  })();
}
