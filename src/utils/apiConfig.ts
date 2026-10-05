// API & WebSocket Configuration for Web and Capacitor Android APK

export const CLOUD_BACKEND_URL = 'https://ais-dev-mxfsjmfa6ilx6ehelzi7c4-500444226681.asia-southeast1.run.app';
export const PREVIEW_BACKEND_URL = 'https://ais-pre-mxfsjmfa6ilx6ehelzi7c4-500444226681.asia-southeast1.run.app';

export function isCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window.location.hostname === 'localhost' && !window.location.port) ||
    Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    Boolean((window as any).Capacitor)
  );
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const custom = localStorage.getItem('matladuko_backend_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/$/, '');
  }
  // When running directly on the web app on Cloud Run or Vite dev server
  if (typeof window !== 'undefined' && (window.location.hostname.includes('run.app') || window.location.port === '3000')) {
    return '';
  }
  if (isCapacitorApp()) {
    return CLOUD_BACKEND_URL;
  }
  return '';
}

export function getSignalingUrl(): string {
  const base = getApiBaseUrl();
  if (base) {
    const wsProto = base.startsWith('https') ? 'wss:' : 'ws:';
    const host = base.replace(/^https?:\/\//, '');
    return `${wsProto}//${host}/ws/signaling`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/signaling`;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const base = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach authenticated user ID header if present in storage
  if (!headers.has('x-user-id') && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('matladuko_user_profile') || sessionStorage.getItem('matladuko_user_profile');
      if (stored) {
        const u = JSON.parse(stored);
        if (u && u.id) {
          headers.set('x-user-id', u.id);
        }
      }
    } catch {}
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    return response;
  } catch (err) {
    // If CLOUD_BACKEND_URL failed in Capacitor, try PREVIEW_BACKEND_URL as fallback
    if (isCapacitorApp() && base === CLOUD_BACKEND_URL) {
      const fallbackUrl = `${PREVIEW_BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      try {
        return await fetch(fallbackUrl, {
          ...options,
          headers,
        });
      } catch (secErr) {
        throw err;
      }
    }
    throw err;
  }
}
