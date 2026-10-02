// API & WebSocket Configuration for Web and Capacitor Android APK

export const CLOUD_BACKEND_URL = 'https://ais-dev-mxfsjmfa6ilx6ehelzi7c4-500444226681.asia-southeast1.run.app';

export function isCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window.location.hostname === 'localhost' && !window.location.port) ||
    Boolean((window as any).Capacitor)
  );
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const custom = localStorage.getItem('matladuko_backend_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/$/, '');
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

  return fetch(url, {
    ...options,
    headers,
  });
}
