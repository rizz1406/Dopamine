// push.js — streak reminder subscriptions. Architecture-ready:
// the 🔔 button appears only when the server has VAPID keys configured.
import { track } from './analytics.js';

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function pushAvailable() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false;
  try {
    const res = await fetch('/api/push/key');
    if (!res.ok) return false;
    const j = await res.json();
    return !!j.key;
  } catch { return false; }
}

export async function subscribeReminders() {
  const perm = await Notification.requestPermission();
  track('push_permission', { result: perm });
  if (perm !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const keyRes = await fetch('/api/push/key');
  const { key } = await keyRes.json();
  if (!key) return false;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key)
  });
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub })
  });
  track('push_subscribed', { ok: res.ok });
  return res.ok;
}

export async function unsubscribeReminders() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove: true, endpoint: sub.endpoint })
      });
    } catch {}
  }
  track('push_unsubscribed', {});
  return true;
}

export async function isSubscribed() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch { return false; }
}
