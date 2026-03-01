import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@bohnanza/shared';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// In production (same origin), use '' so Socket.IO connects to the page's own host.
// In dev, set VITE_SERVER_URL=http://localhost:3001 in packages/client/.env
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || '';

export const socket: TypedSocket = io(SERVER_URL, {
  autoConnect: false, // We connect manually after registering listeners
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

// ---- Persistent player token ----
// Use sessionStorage so each browser tab gets its own identity.
// This allows multiple players on the same machine (different tabs).
// A single tab still reconnects correctly on refresh within the same session.
const TOKEN_KEY = 'bohnanza_player_token';

function generateToken(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getPlayerToken(): string {
  let token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = generateToken();
    sessionStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}
