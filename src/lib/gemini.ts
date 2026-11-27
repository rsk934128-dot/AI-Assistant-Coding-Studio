import { ApiConnectionState, ApiStatusInfo } from '../types';
import { resolveApiUrl } from './apiBase';

export interface ApiKeyValidationResult {
  valid: boolean;
  state: ApiConnectionState;
  statusInfo: ApiStatusInfo;
  latencyMs?: number;
  activeKeySource?: string | null;
  keyStatus?: string;
  error?: string;
  cached?: boolean;
}

export interface ApiKeyValidatorOptions {
  /** Bypass cached result and force a live ping to the server health check endpoint */
  force?: boolean;
  /** Request timeout in milliseconds (default: 10000ms) */
  timeoutMs?: number;
}

const HEALTHY_CACHE_TTL_MS = 60_000;
const AUTH_ERROR_CACHE_TTL_MS = 30_000;
const DEGRADED_CACHE_TTL_MS = 15_000;

let cachedResult: ApiKeyValidationResult | null = null;
let cachedAt = 0;
let inFlightValidation: Promise<ApiKeyValidationResult> | null = null;

/**
 * Classifies an error string or status payload into a normalized ApiConnectionState.
 */
export function classifyApiErrorState(errorText: string): ApiConnectionState {
  const lower = (errorText || '').toLowerCase();
  if (
    lower.includes('leaked') ||
    lower.includes('reported as leaked') ||
    lower.includes('revoked_or_leaked') ||
    lower.includes('missing_key') ||
    lower.includes('permission_denied') ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('api key পাওয়া যায়নি') ||
    lower.includes('বাতিলকৃত') ||
    lower.includes('403') ||
    lower.includes('401')
  ) {
    return 'auth_error';
  }
  return 'degraded';
}

function getCacheTtlForState(state: ApiConnectionState): number {
  if (state === 'healthy') return HEALTHY_CACHE_TTL_MS;
  if (state === 'auth_error') return AUTH_ERROR_CACHE_TTL_MS;
  return DEGRADED_CACHE_TTL_MS;
}

export function getCachedApiKeyValidation(): ApiKeyValidationResult | null {
  if (!cachedResult) return null;
  const ttl = getCacheTtlForState(cachedResult.state);
  if (Date.now() - cachedAt > ttl) {
    return null;
  }
  return { ...cachedResult, cached: true };
}

export function invalidateApiKeyValidationCache(): void {
  cachedResult = null;
  cachedAt = 0;
}

export function markApiKeyValidationHealthy(latencyMs?: number): ApiStatusInfo {
  const statusInfo: ApiStatusInfo = {
    state: 'healthy',
    latencyMs,
    checkedAt: Date.now(),
  };
  cachedResult = {
    valid: true,
    state: 'healthy',
    statusInfo,
    latencyMs,
  };
  cachedAt = Date.now();
  return statusInfo;
}

export function markApiKeyValidationError(errorMessage: string): ApiStatusInfo {
  const state = classifyApiErrorState(errorMessage);
  const statusInfo: ApiStatusInfo = {
    state,
    message: errorMessage,
    checkedAt: Date.now(),
  };
  cachedResult = {
    valid: false,
    state,
    statusInfo,
    error: errorMessage,
  };
  cachedAt = Date.now();
  return statusInfo;
}

/**
 * ApiKeyValidator
 *
 * Performs a lightweight, deduplicated, TTL-cached ping to the backend `/api/health/test`
 * endpoint before enabling or dispatching Gemini chat calls. Prevents redundant API calls
 * when an API key is missing, revoked, or returning 403 PERMISSION_DENIED errors.
 */
export async function ApiKeyValidator(
  options: ApiKeyValidatorOptions = {}
): Promise<ApiKeyValidationResult> {
  const { force = false, timeoutMs = 10_000 } = options;

  if (!force) {
    const fresh = getCachedApiKeyValidation();
    if (fresh) {
      return fresh;
    }
  } else {
    invalidateApiKeyValidationCache();
  }

  if (inFlightValidation) {
    return inFlightValidation;
  }

  inFlightValidation = (async (): Promise<ApiKeyValidationResult> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(resolveApiUrl(`/api/health/test?lightweight=1&_t=${Date.now()}`), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type') || '';
      const responseUrl = res.url || '';
      if (
        responseUrl.includes('aistudio.google.com/applet-auth-bridge') ||
        responseUrl.includes('__cookie_check.html') ||
        contentType.includes('text/html')
      ) {
        const authBridgeMsg =
          'AI Studio Preview URL (ais-pre/ais-dev) সরাসরি মোবাইল APK-তে API অ্যাক্সেস দেয় না (Auth Bridge 302)। ডিপ্লয় করা পাবলিক Cloud Run/Render URL ব্যবহার করুন।';
        const statusInfo: ApiStatusInfo = {
          state: 'auth_error',
          message: authBridgeMsg,
          checkedAt: Date.now(),
        };
        const result: ApiKeyValidationResult = {
          valid: false,
          state: 'auth_error',
          statusInfo,
          error: authBridgeMsg,
          cached: false,
        };
        cachedResult = result;
        cachedAt = Date.now();
        return result;
      }

      const data = await res.json().catch(() => null);

      if (res.ok && data && (data.success || data.status === 'ok' || data.reply)) {
        const statusInfo: ApiStatusInfo = {
          state: 'healthy',
          latencyMs: data.latencyMs,
          checkedAt: Date.now(),
        };
        const result: ApiKeyValidationResult = {
          valid: true,
          state: 'healthy',
          statusInfo,
          latencyMs: data.latencyMs,
          activeKeySource: data.activeKeySource ?? null,
          cached: false,
        };
        cachedResult = result;
        cachedAt = Date.now();
        return result;
      }

      const errText = String(data?.error || data?.rawMessage || `HTTP ${res.status}`);
      const isAuthError =
        data?.keyStatus === 'revoked_or_leaked' ||
        data?.status === 'missing_key' ||
        classifyApiErrorState(errText) === 'auth_error';
      const state: ApiConnectionState = isAuthError ? 'auth_error' : 'degraded';

      const statusInfo: ApiStatusInfo = {
        state,
        latencyMs: data?.latencyMs,
        message: errText,
        checkedAt: Date.now(),
      };
      const result: ApiKeyValidationResult = {
        valid: false,
        state,
        statusInfo,
        latencyMs: data?.latencyMs,
        keyStatus: data?.keyStatus,
        error: errText,
        cached: false,
      };
      cachedResult = result;
      cachedAt = Date.now();
      return result;
    } catch {
      // Fallback check to /api/health to verify if server is up & key is configured
      try {
        const healthRes = await fetch(resolveApiUrl(`/api/health?_t=${Date.now()}`), { cache: 'no-store' });
        const healthData = await healthRes.json().catch(() => null);
        if (healthRes.ok && healthData && healthData.hasApiKey === false) {
          const message = 'Gemini API Key কনফিগার করা নেই (Settings > Secrets চেক করুন)';
          const statusInfo: ApiStatusInfo = {
            state: 'auth_error',
            message,
            checkedAt: Date.now(),
          };
          const result: ApiKeyValidationResult = {
            valid: false,
            state: 'auth_error',
            statusInfo,
            keyStatus: 'missing_key',
            error: message,
            cached: false,
          };
          cachedResult = result;
          cachedAt = Date.now();
          return result;
        }
      } catch {
        // Ignore secondary check failure
      }

      const message = 'Gemini API সংযোগ যাচাই করা যায়নি';
      const statusInfo: ApiStatusInfo = {
        state: 'degraded',
        message,
        checkedAt: Date.now(),
      };
      const result: ApiKeyValidationResult = {
        valid: false,
        state: 'degraded',
        statusInfo,
        error: message,
        cached: false,
      };
      cachedResult = result;
      cachedAt = Date.now();
      return result;
    } finally {
      clearTimeout(timeoutId);
      inFlightValidation = null;
    }
  })();

  return inFlightValidation;
}
