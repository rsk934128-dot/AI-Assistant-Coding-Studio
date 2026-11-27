/**
 * Mobile APK (Capacitor) & Web API Base URL Resolver
 *
 * On web deployments (Cloud Run, custom domains, localhost:3000 dev server),
 * requests use relative same-origin `/api/...` paths.
 *
 * Inside an installed Android APK (Capacitor WebView serving bundled static assets
 * from `https://localhost` or `capacitor://localhost`), relative `/api/...` paths
 * would resolve to the phone's local WebView instead of the live backend server.
 * This utility automatically routes native APK requests to the live backend URL.
 */

export const DEFAULT_PRODUCTION_API_URL =
  'https://ais-pre-wmv5jd5dv5657d66jacbci-622126518866.asia-east1.run.app';

const CUSTOM_API_BASE_STORAGE_KEY = 'ai_studio_api_base_url';

export function isNativeMobileApp(): boolean {
  if (typeof window === 'undefined') return false;

  const cap = (window as any).Capacitor;
  if (cap) {
    try {
      if (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
        return true;
      }
      if (typeof cap.getPlatform === 'function') {
        const platform = cap.getPlatform();
        if (platform === 'android' || platform === 'ios') return true;
      }
    } catch {
      // Ignore Capacitor probe errors
    }
  }

  const protocol = window.location?.protocol || '';
  if (protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'file:') {
    return true;
  }

  // Capacitor Android WebView with `androidScheme: "https"` runs at `https://localhost` (empty port)
  const hostname = (window.location?.hostname || '').toLowerCase();
  const port = window.location?.port || '';
  if (hostname === 'localhost' && !port) {
    return true;
  }

  return false;
}

export function getApiBaseUrl(): string {
  if (!isNativeMobileApp()) {
    return '';
  }

  try {
    const custom = (localStorage.getItem(CUSTOM_API_BASE_STORAGE_KEY) || '').trim();
    if (custom && /^https?:\/\//i.test(custom)) {
      return custom.replace(/\/+$/, '');
    }
  } catch {
    // Ignore storage access errors
  }

  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/+$/, '');
  }

  return DEFAULT_PRODUCTION_API_URL;
}

export function resolveApiUrl(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}
