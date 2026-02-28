import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@bohnanza/shared';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// In production (same origin), use '' so Socket.IO connects to the page's own host.
// In dev, set VITE_SERVER_URL=http://localhost:3001 in packages/client/.env
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || '';

export const socket: TypedSocket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});
