import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css'
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// 1. Import your token helper
import { getToken } from '@/services/auth';

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo<any>;
  }
}

window.Pusher = Pusher;

const isProduction = Boolean(import.meta.env.VITE_PUSHER_APP_KEY);
// 2. Define the Laravel backend URL
const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

window.Echo = new Echo(
  isProduction
    ? {
        broadcaster: 'pusher',
        key: import.meta.env.VITE_PUSHER_APP_KEY,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
        forceTLS: true,
        // 3. Explicitly point to the Laravel auth endpoint and attach the token
        authEndpoint: `${backendUrl}/api/broadcasting/auth`,
        authorizer: (channel, options) => {
          return {
            authorize: (socketId, callback) => {
              fetch(options.authEndpoint, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                  socket_id: socketId,
                  channel_name: channel.name
                })
              })
              .then(response => {
                if (!response.ok) {
                  if (response.status === 401) {
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                  }
                  throw new Error(`Broadcast Auth Failed with status ${response.status}`);
                }
                return response.json();
              })
              .then(data => callback(null, data)) 
              .catch(error => callback(error as Error, null)); 
            }
          };
        }
      }
    : {
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
        wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
        forceTLS: false,
        enabledTransports: ['ws', 'wss'],
        // 3. Explicitly point to the Laravel auth endpoint and attach the token
        authEndpoint: `${backendUrl}/api/broadcasting/auth`,
        authorizer: (channel, options) => {
          return {
            authorize: (socketId, callback) => {
              fetch(options.authEndpoint, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                  socket_id: socketId,
                  channel_name: channel.name
                })
              })
              .then(response => {
                if (!response.ok) {
                  if (response.status === 401) {
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                  }
                  throw new Error(`Broadcast Auth Failed with status ${response.status}`);
                }
                return response.json();
              })
              .then(data => callback(null, data)) 
              .catch(error => callback(error as Error, null)); 
            }
          };
        }
      }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);