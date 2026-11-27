import { getApp, getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

export const FCM_VAPID_KEY = (
  import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  'BPUnBB2NoBuV1-9ViAsXmFXNjOGHie38p452_o12TwlX9N0wqtFV2DMO20SVZ1leRRfWZzgtb498dYRxTX3jMAc'
).trim();

const FCM_TOKEN_STORAGE_KEY = 'ai_studio_fcm_push_token';

export interface EnablePushResult {
  success: boolean;
  token?: string;
  permission?: NotificationPermission;
  error?: string;
}

export function getStoredFcmToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveStoredFcmToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage errors
  }
}

export async function isFcmPushSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return false;
  }
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration> {
  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey || '',
    authDomain: firebaseConfig.authDomain || '',
    projectId: firebaseConfig.projectId || '',
    storageBucket: firebaseConfig.storageBucket || '',
    messagingSenderId: firebaseConfig.messagingSenderId || '',
    appId: firebaseConfig.appId || '',
  });

  // Scope under /firebase-cloud-messaging-push-scope so it never collides with VitePWA's root /sw.js
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`, {
    scope: '/firebase-cloud-messaging-push-scope',
  });
}

export async function enableFcmPushNotifications(): Promise<EnablePushResult> {
  const supported = await isFcmPushSupported();
  if (!supported) {
    return {
      success: false,
      error: 'এই ব্রাউজার বা ওয়েবভিউতে Firebase Web Push নোটিফিকেশন সমর্থিত নয়।',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        permission,
        error:
          permission === 'denied'
            ? 'নোটিফিকেশন পারমিশন ব্লক করা আছে। ব্রাউজার সেটিংস থেকে Allow করুন।'
            : 'নোটিফিকেশন পারমিশন অনুমোদিত হয়নি।',
      };
    }

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const messaging = getMessaging(app);
    const serviceWorkerRegistration = await registerMessagingServiceWorker();

    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration,
    });

    if (!token) {
      return {
        success: false,
        permission,
        error: 'FCM রেজিস্ট্রেশন টোকেন পাওয়া যায়নি। Firebase Cloud Messaging চালু আছে কিনা যাচাই করুন।',
      };
    }

    saveStoredFcmToken(token);
    return {
      success: true,
      token,
      permission,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Push নোটিফিকেশন সেটআপ করা যায়নি।',
    };
  }
}

export async function subscribeForegroundFcmMessages(
  onPayload: (payload: MessagePayload) => void
): Promise<(() => void) | null> {
  const supported = await isFcmPushSupported();
  if (!supported) return null;

  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      onPayload(payload);
    });
  } catch {
    return null;
  }
}
