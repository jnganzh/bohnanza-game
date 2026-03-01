import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@bohnanza/shared';
import { roomManager } from './rooms.js';
import { gameSessionStore } from '../game/GameSessionStore.js';
import { GameSession } from '../game/GameSession.js';
import { nanoid } from 'nanoid';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface SocketData {
  playerId: string;
  playerName: string;
  roomId: string | null;
}

const socketData = new Map<string, SocketData>();

function getSocketData(socket: TypedSocket): SocketData {
  return socketData.get(socket.id) || { playerId: '', playerName: '', roomId: null };
}

export function registerHandlers(io: Server, socket: TypedSocket): void {
  const playerId = nanoid(8);
  socketData.set(socket.id, { playerId, playerName: '', roomId: null });

  // Send current room list to the newly connected socket
  socket.emit('lobby:room-list', { rooms: roomManager.getRoomList() });

  // ---- Lobby ----

  socket.on('lobby:create-room', (data) => {
    const sd = getSocketData(socket);
    sd.playerName = data.playerName;
    sd.playerId = playerId;

    const room = roomManager.createRoom(playerId, data.playerName, socket.id, data.maxPlayers);
    sd.roomId = room.id;
    socket.join(room.id);

    socket.emit('lobby:room-created', { roomId: room.id });
    socket.emit('lobby:room-updated', {
      players: room.players.map((p) => ({ id: p.id, name: p.name })),
      maxPlayers: room.maxPlayers,
      hostId: room.hostPlayerId,
    });
    io.emit('lobby:room-list', { rooms: roomManager.getRoomList() });
  });

  socket.on('lobby:join-room', (data) => {
    const sd = getSocketData(socket);
    sd.playerName = data.playerName;

    const result = roomManager.joinRoom(data.roomId, playerId, data.playerName, socket.id);
    if (typeof result === 'string') {
      socket.emit('lobby:error', { message: result });
      return;
    }

    sd.roomId = result.id;
    socket.join(result.id);

    io.to(result.id).emit('lobby:room-updated', {
      players: result.players.map((p) => ({ id: p.id, name: p.name })),
      maxPlayers: result.maxPlayers,
      hostId: result.hostPlayerId,
    });
    io.emit('lobby:room-list', { rooms: roomManager.getRoomList() });
  });

  socket.on('lobby:leave-room', () => {
    const sd = getSocketData(socket);
    if (!sd.roomId) return;

    const room = roomManager.leaveRoom(sd.roomId, playerId);
    socket.leave(sd.roomId);

    if (room) {
      io.to(room.id).emit('lobby:room-updated', {
        players: room.players.map((p) => ({ id: p.id, name: p.name })),
        maxPlayers: room.maxPlayers,
        hostId: room.hostPlayerId,
      });
    }

    sd.roomId = null;
    io.emit('lobby:room-list', { rooms: roomManager.getRoomList() });
  });

  socket.on('lobby:delete-room', () => {
    const sd = getSocketData(socket);
    if (!sd.roomId) return;

    const roomId = sd.roomId;
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    // Get all player socket ids before deleting
    const playerSocketIds = room.players.map((p) => p.socketId);

    const error = roomManager.deleteRoom(roomId, playerId);
    if (error) {
      socket.emit('lobby:error', { message: error });
      return;
    }

    // Notify all players in the room that it was deleted, and make them leave the socket room
    io.to(roomId).emit('lobby:room-deleted', { roomId });
    // Force all sockets to leave the room
    for (const sid of playerSocketIds) {
      const sdata = socketData.get(sid);
      if (sdata) sdata.roomId = null;
      io.sockets.sockets.get(sid)?.leave(roomId);
    }

    io.emit('lobby:room-list', { rooms: roomManager.getRoomList() });
  });

  socket.on('lobby:change-max-players', (data) => {
    const sd = getSocketData(socket);
    if (!sd.roomId) return;

    const result = roomManager.updateMaxPlayers(sd.roomId, playerId, data.maxPlayers);
    if (typeof result === 'string') {
      socket.emit('lobby:error', { message: result });
      return;
    }

    io.to(result.id).emit('lobby:room-updated', {
      players: result.players.map((p) => ({ id: p.id, name: p.name })),
      maxPlayers: result.maxPlayers,
      hostId: result.hostPlayerId,
    });
    io.emit('lobby:room-list', { rooms: roomManager.getRoomList() });
  });

  socket.on('lobby:start-game', () => {
    const sd = getSocketData(socket);
    if (!sd.roomId) return;

    const room = roomManager.getRoom(sd.roomId);
    if (!room) return;
    if (room.hostPlayerId !== playerId) {
      socket.emit('lobby:error', { message: 'Only the host can start the game' });
      return;
    }
    if (room.players.length < 2) {
      socket.emit('lobby:error', { message: 'Need at least 2 players' });
      return;
    }

    roomManager.setStatus(sd.roomId, 'in-progress');

    const session = new GameSession(io, sd.roomId, room.players);
    gameSessionStore.set(sd.roomId, session);

    // Send initial state to each player
    for (const p of room.players) {
      const clientState = session.getClientState(p.id);
      io.to(p.socketId).emit('game:started', { state: clientState });
    }

    io.emit('lobby:room-list', { rooms: roomManager.getRoomList() });
  });

  // ---- Game Actions ----

  socket.on('game:plant-bean', (data) => {
    const sd = getSocketData(socket);
    const session = sd.roomId ? gameSessionStore.get(sd.roomId) : undefined;
    if (!session) return;
    session.handlePlantBean(playerId, data.fieldIndex);
  });

  socket.on('game:skip-second-plant', () => {
    const sd = getSocketData(socket);
    const session = sd.roomId ? gameSessionStore.get(sd.roomId) : undefined;
    if (!session) return;
    session.handleSkipSecondPlant(playerId);
  });

  socket.on('game:harvest-field', (data) => {
    const sd = getSocketData(socket);
    const session = sd.roomId ? gameSessionStore.get(sd.roomId) : undefined;
    if (!session) return;
    session.handleHarvestField(playerId, data.fieldIndex);
  });

  socket.on('game:keep-face-up-card', (data) => {
    const sd = getSocketData(socket);
    const session = sd.roomId ? gameSessionStore.get(sd.roomId) : undefined;
    if (!session) return;
    session.handleKeepFaceUpCard(playerId, data.cardId);
  });

  socket.on('game:propose-trade', (data) => {
    const sd = getSocketData(socket);
    const session = sd.roomId ? gameSessionStore.get(sd.roomId) : undefined;
    if (!session) return;
    session.handleProposeTrade(playerId, data);
  });

  socket.on('game:propose-donation', (data) => {
    const sd = getSocketData(socket);
    const session = sd.roomId ? gameSessionStore.get(sd.roomId) : undefined;
    if (!session) return;
    session.handleProposeDonation(playerId, data);
  });

  socket.on('game:accept-trade', (data) => {
    const sd = getSocketData(socket);
    const session = sd.roomId ? gameSessionStore.get(sd.roomId) : undefined;
    if (!session) return;
    session.handleAcceptTrade(playerId, data.tradeId);
  });

  socket.on('game:reject-trade', (data) => {
    const sd = getSocketData(socket);
    const session = sd.roomId ? gameSessionStore.get(sd.roomId) : undefined;
    if (!session) return;
    session.handleRejectTrade(playerId, data.tradeId);
  });

  socket.on('game:withdraw-trade', (data) => {
    const sd = getSocketData(socket);
    const session = sd.roomId ? gameSessionStore.get(sd.roomId) : undefined;
    if (!session) return;
    session.handleWithdrawTrade(playerId, data.tradeId);
  });

  socket.on('game:end-trading', () => {
    const sd = getSocketData(socket);
    const session = sd.roomId ? gameSessionStore.get(sd.roomId) : undefined;
    if (!session) return;
    session.handleEndTrading(playerId);
  });

  socket.on('game:plant-pending-bean', (data) => {
    const sd = getSocketData(socket);
    const session = sd.roomId ? gameSessionStore.get(sd.roomId) : undefined;
    if (!session) return;
    session.handlePlantPendingBean(playerId, data.cardId, data.fieldIndex);
  });

  socket.on('game:buy-third-field', () => {
    const sd = getSocketData(socket);
    const session = sd.roomId ? gameSessionStore.get(sd.roomId) : undefined;
    if (!session) return;
    session.handleBuyThirdField(playerId);
  });

  // ---- Chat ----

  socket.on('chat:message', (data) => {
    const sd = getSocketData(socket);
    if (!sd.roomId) return;
    io.to(sd.roomId).emit('chat:message', {
      playerId,
      playerName: sd.playerName,
      text: data.text,
      timestamp: Date.now(),
    });
  });

  // ---- Disconnect ----

  socket.on('disconnect', () => {
    const sd = getSocketData(socket);
    if (sd.roomId) {
      const session = gameSessionStore.get(sd.roomId);
      if (session) {
        session.markDisconnected(playerId);
        io.to(sd.roomId).emit('player:disconnected', { playerId });
        session.broadcastState();
      }
    }
    socketData.delete(socket.id);
  });
}
