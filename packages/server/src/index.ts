import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { registerHandlers } from './socket/handlers.js';
import type { ClientToServerEvents, ServerToClientEvents } from '@bohnanza/shared';

const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);

// In production (same-origin), CORS is not needed.
// In dev, allow Vite dev server origins.
const isProduction = process.env.NODE_ENV === 'production';

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: isProduction
    ? undefined
    : {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
      },
  pingInterval: 25000,  // ping every 25s
  pingTimeout: 120000,  // allow 2 minutes before declaring dead (tolerates brief network drops)
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  registerHandlers(io as unknown as Server, socket);
});

httpServer.listen(PORT, () => {
  console.log(`Bohnanza server running on port ${PORT}`);
});
