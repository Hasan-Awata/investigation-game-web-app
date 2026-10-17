const rawBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '') : 'http://localhost:8000')
).replace(/\/+$/, '');

export const ENV = {
  API_BASE_URL: rawBaseUrl,
  API_URL: `${rawBaseUrl}/api`,
  PUSHER_APP_KEY: import.meta.env.VITE_PUSHER_APP_KEY || '',
  PUSHER_APP_CLUSTER: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
  REVERB_APP_KEY: import.meta.env.VITE_REVERB_APP_KEY || 'my-app-key',
  REVERB_HOST: import.meta.env.VITE_REVERB_HOST || 'localhost',
  REVERB_PORT: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
  REVERB_SCHEME: (import.meta.env.VITE_REVERB_SCHEME || 'http') as 'http' | 'https',
} as const;
