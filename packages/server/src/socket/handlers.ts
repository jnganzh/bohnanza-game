import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@bohnanza/shared';
import { roomManager } from './rooms.js';
import { gameSessionStore } from '../game/GameSessionStore.js';
import { GameSession } from '../game/GameSession.js';
import { nanoid } from 'nanoid';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// ---- Persistent player identity ----
// Maps token -> PlayerRecord so players can reconnect after refresh / disconnect
interface PlayerRecord {
  playerId: string;
  playerName: string;
  roomId: string | null;
  socketId: string | null;
}

const playersByToken = new Map<string, PlayerRecord>();
const playersBySocketId = new Map<string, PlayerRecord>();

export function registerHandlers(io: Server, socket: TypedSocket): void {
  let record: PlayerRecord | null = null;

  // Send current room list immediately
  socket.emit('lobby:room-list', { rooms: roomManager.getRoomList() });

  // ---- Reconnect / Identity ----

  socket.on('lobby:reconnect', (data) => {
    const { token, playerName } = data;

    const existing = playersByToken.get(token);
    if (existing) {
      // Returning player — rebind socket
      if (existing.socketId && existing.socketId !== socket.id) {
        playersBySocketId.delete(existing.socketId);
      }
      existing.socketId = socket.id;
      existing.playerName = playerName;
      record = existing;
      playersBySocketId.set(socket.id, record);

      // Rejoin socket room if they were in one
      if (record.roomId) {
        socket.join(record.roomId);

        const session = gameSessionStore.get(record.roomId);
        if (session) {
          // Reconnect into active game
          session.updateSocketId(record.playerId, socket.id);
          const clientState = session.getClientState(record.playerId);
          io.to(record.roomId).emit('player:reconnected', { playerId: record.playerId });
          session.broadcastState();
          socket.emit('lobby:reconnected', {
            roomId: record.roomId,
            inGame: true,
            state: clientState,
          });
        } else {
          // Reconnect into waiting room
          const room = roomManager.getRoom(record.roomId);
          if (room) {
            roomManager.updateSocketId(record.roomId, record.playerId, socket.id);
            socket.emit('lobby:reconnected', {
              roomId: record.roomId,
              inGame: false,
              roomPlayers: room.players.map((p) => ({ id: p.id, name: p.name })),
              maxPlayers: room.maxPlayers,
              hostId: room.hostPlayerId,
            });
          } else {
            // Room is gone
            record.roomId = null;
            socket.emit('lobby:reconnected', { roomId: null, inGame: false });
          }
        }
      } else {
        socket.emit('lobby:reconnected', { roomId: null, inGame: false });
      }

      socket.emit('lobby:welcome', { token, playerId: record.playerId });
    } else {
      // Brand new player
      const playerId = nanoid(8);
      record = { playerId, playerName, roomId: null, socketId: socket.id };
      playersByToken.set(token, record);
      playersBySocketId.set(socket.id, record);
      socket.emit('lobby:welcome', { token, playerId });
      socket.emit('lobby:reconnected', { roomId: null, inGame: false });
    }
  });

  // ---- Lobby ----

  socket.on('lobby:create-room', (data) => {
    if (!record) return;
    if (record.roomId) {
      socket.emit('lobby:error', { message: 'You are already in a room. Leave it first.' });
      return;
    }

    record.playerName = data.playerName;
    const room = roomManager.createRoom(record.playerId, data.playerName, socket.id, data.maxPlayers);
    record.roomId = room.id;
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
    if (!record) return;
    if (record.roomId) {
      socket.emit('lobby:error', { message: 'You are already in a room. Leave it first.' });
      return;
    }

    record.playerName = data.playerName;
    const result = roomManager.joinRoom(data.roomId, record.playerId, data.playerName, socket.id);
    if (typeof result === 'string') {
      socket.emit('lobby:error', { message: result });
      return;
    }

    record.roomId = result.id;
    socket.join(result.id);

    // Tell the joining player which room they joined (so client sets roomId)
    socket.emit('lobby:room-created', { roomId: result.id });

    io.to(result.id).emit('lobby:room-updated', {
      players: result.players.map((p) => ({ id: p.id, name: p.name })),
      maxPlayers: result.maxPlayers,
      hostId: result.hostPlayerId,
    });
    io.emit('lobby:room-list', { rooms: roomManager.getRoomList() });
  });

  socket.on('lobby:leave-room', () => {
    if (!record || !record.roomId) return;

    // Cannot leave via lobby if game is in progress
    const session = gameSessionStore.get(record.roomId);
    if (session) {
      socket.emit('lobby:error', { message: 'Cannot leave during an active game.' });
      return;
    }

    const room = roomManager.leaveRoom(record.roomId, record.playerId);
    socket.leave(record.roomId);
    record.roomId = null;

    if (room) {
      io.to(room.id).emit('lobby:room-updated', {
        players: room.players.map((p) => ({ id: p.id, name: p.name })),
        maxPlayers: room.maxPlayers,
        hostId: room.hostPlayerId,
      });
    }

    io.emit('lobby:room-list', { rooms: roomManager.getRoomList() });
  });

  socket.on('lobby:delete-room', () => {
    if (!record || !record.roomId) return;

    const roomId = record.roomId;
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const playerSocketIds = room.players.map((p) => p.socketId);

    const error = roomManager.deleteRoom(roomId, record.playerId);
    if (error) {
      socket.emit('lobby:error', { message: error });
      return;
    }

    io.to(roomId).emit('lobby:room-deleted', { roomId });
    for (const sid of playerSocketIds) {
      const pr = playersBySocketId.get(sid);
      if (pr) pr.roomId = null;
      io.sockets.sockets.get(sid)?.leave(roomId);
    }

    io.emit('lobby:room-list', { rooms: roomManager.getRoomList() });
  });

  socket.on('lobby:change-max-players', (data) => {
    if (!record || !record.roomId) return;

    const result = roomManager.updateMaxPlayers(record.roomId, record.playerId, data.maxPlayers);
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
    if (!record || !record.roomId) return;

    const room = roomManager.getRoom(record.roomId);
    if (!room) return;
    if (room.hostPlayerId !== record.playerId) {
      socket.emit('lobby:error', { message: 'Only the host can start the game' });
      return;
    }
    if (room.players.length < 2) {
      socket.emit('lobby:error', { message: 'Need at least 2 players' });
      return;
    }

    roomManager.setStatus(record.roomId, 'in-progress');

    const session = new GameSession(io, record.roomId, room.players);
    gameSessionStore.set(record.roomId, session);

    for (const p of room.players) {
      const clientState = session.getClientState(p.id);
      io.to(p.socketId).emit('game:started', { state: clientState });
    }

    io.emit('lobby:room-list', { rooms: roomManager.getRoomList() });
  });

  // ---- Game Actions ----

  socket.on('game:plant-bean', (data) => {
    if (!record?.roomId) return;
    const session = gameSessionStore.get(record.roomId);
    if (!session) return;
    session.handlePlantBean(record.playerId, data.fieldIndex);
  });

  socket.on('game:skip-second-plant', () => {
    if (!record?.roomId) return;
    const session = gameSessionStore.get(record.roomId);
    if (!session) return;
    session.handleSkipSecondPlant(record.playerId);
  });

  socket.on('game:harvest-field', (data) => {
    if (!record?.roomId) return;
    const session = gameSessionStore.get(record.roomId);
    if (!session) return;
    session.handleHarvestField(record.playerId, data.fieldIndex);
  });

  socket.on('game:keep-face-up-card', (data) => {
    if (!record?.roomId) return;
    const session = gameSessionStore.get(record.roomId);
    if (!session) return;
    session.handleKeepFaceUpCard(record.playerId, data.cardId);
  });

  socket.on('game:propose-trade', (data) => {
    if (!record?.roomId) return;
    const session = gameSessionStore.get(record.roomId);
    if (!session) return;
    session.handleProposeTrade(record.playerId, data);
  });

  socket.on('game:propose-donation', (data) => {
    if (!record?.roomId) return;
    const session = gameSessionStore.get(record.roomId);
    if (!session) return;
    session.handleProposeDonation(record.playerId, data);
  });

  socket.on('game:accept-trade', (data) => {
    if (!record?.roomId) return;
    const session = gameSessionStore.get(record.roomId);
    if (!session) return;
    session.handleAcceptTrade(record.playerId, data.tradeId);
  });

  socket.on('game:reject-trade', (data) => {
    if (!record?.roomId) return;
    const session = gameSessionStore.get(record.roomId);
    if (!session) return;
    session.handleRejectTrade(record.playerId, data.tradeId);
  });

  socket.on('game:withdraw-trade', (data) => {
    if (!record?.roomId) return;
    const session = gameSessionStore.get(record.roomId);
    if (!session) return;
    session.handleWithdrawTrade(record.playerId, data.tradeId);
  });

  socket.on('game:end-trading', () => {
    if (!record?.roomId) return;
    const session = gameSessionStore.get(record.roomId);
    if (!session) return;
    session.handleEndTrading(record.playerId);
  });

  socket.on('game:plant-pending-bean', (data) => {
    if (!record?.roomId) return;
    const session = gameSessionStore.get(record.roomId);
    if (!session) return;
    session.handlePlantPendingBean(record.playerId, data.cardId, data.fieldIndex);
  });

  socket.on('game:buy-third-field', () => {
    if (!record?.roomId) return;
    const session = gameSessionStore.get(record.roomId);
    if (!session) return;
    session.handleBuyThirdField(record.playerId);
  });

  // ---- Chat ----

  socket.on('chat:message', (data) => {
    if (!record?.roomId) return;
    io.to(record.roomId).emit('chat:message', {
      playerId: record.playerId,
      playerName: record.playerName,
      text: data.text,
      timestamp: Date.now(),
    });
  });

  // ---- Disconnect ----

  socket.on('disconnect', () => {
    if (!record) return;
    if (record.roomId) {
      const session = gameSessionStore.get(record.roomId);
      if (session) {
        session.markDisconnected(record.playerId);
        io.to(record.roomId).emit('player:disconnected', { playerId: record.playerId });
        session.broadcastState();
      }
    }
    // Keep PlayerRecord in playersByToken for reconnection.
    // Just unbind the socket.
    record.socketId = null;
    playersBySocketId.delete(socket.id);
  });
}
