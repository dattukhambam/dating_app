// API & WebSocket Configuration for Web and Capacitor Android APK

export const CLOUD_BACKEND_URL = 'https://ais-dev-bdimk74tfela66lapwpqiu-103507214601.asia-southeast1.run.app';
export const PREVIEW_BACKEND_URL = 'https://ais-pre-bdimk74tfela66lapwpqiu-103507214601.asia-southeast1.run.app';

export function isCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    Boolean((window as any).Capacitor?.isPluginAvailable?.('App'))
  );
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const custom = localStorage.getItem('matladuko_backend_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/$/, '');
  }
  // When running on native Capacitor app (APK), use canonical cloud backend
  if (isCapacitorApp()) {
    return CLOUD_BACKEND_URL;
  }
  // When running directly in mobile browser or PWA installed on phone
  if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')) {
    return window.location.origin;
  }
  // Local development fallback
  return '';
}

export function getSignalingUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !isCapacitorApp()) {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${window.location.host}/ws/signaling`;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws/signaling`;
    }
  }
  // Connect all mobile devices, emulators, and web previews to canonical Cloud signaling hub
  const base = getApiBaseUrl() || CLOUD_BACKEND_URL;
  const wsProto = base.startsWith('https') ? 'wss:' : 'ws:';
  const host = base.replace(/^https?:\/\//, '');
  return `${wsProto}//${host}/ws/signaling`;
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
