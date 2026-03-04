import { socket, getPlayerToken } from './socketClient.js';
import { useLobbyStore } from '../stores/useLobbyStore.js';
import { useGameStore } from '../stores/useGameStore.js';
import { useTradeStore } from '../stores/useTradeStore.js';
import { useChatStore } from '../stores/useChatStore.js';

export function registerSocketListeners(): void {
  const lobbyStore = useLobbyStore;
  const gameStore = useGameStore;
  const tradeStore = useTradeStore;

  // On every (re)connect, send the persistent token to identify ourselves
  socket.on('connect', () => {
    const token = getPlayerToken();
    const playerName = lobbyStore.getState().playerName || '';
    socket.emit('lobby:reconnect', { token, playerName });
  });

  // Server acknowledges our identity
  socket.on('lobby:welcome', (_data) => {
    // Token confirmed; nothing else to do
  });

  // Server tells us what state we should be in
  socket.on('lobby:reconnected', (data) => {
    if (data.inGame && data.state) {
      // Rejoin active game
      gameStore.getState().setGameState(data.state);
      if (data.roomId) {
        lobbyStore.getState().setRoomId(data.roomId);
      }
      if (data.hostId) {
        lobbyStore.getState().setHostId(data.hostId);
      }
    } else if (data.roomId && data.roomPlayers) {
      // Rejoin waiting room
      lobbyStore.getState().setRoomId(data.roomId);
      lobbyStore.getState().setRoomPlayers(
        data.roomPlayers,
        data.maxPlayers!,
        data.hostId!,
      );
    }
    // If roomId is null, player is in lobby — no action needed
  });

  // Lobby
  socket.on('lobby:room-created', (data) => {
    lobbyStore.getState().setRoomId(data.roomId);
  });

  socket.on('lobby:room-updated', (data) => {
    lobbyStore.getState().setRoomPlayers(data.players, data.maxPlayers, data.hostId);
  });

  socket.on('lobby:room-list', (data) => {
    lobbyStore.getState().setRooms(data.rooms);
  });

  socket.on('lobby:room-deleted', () => {
    lobbyStore.getState().reset();
  });

  socket.on('lobby:error', (data) => {
    lobbyStore.getState().setError(data.message);
  });

  // Game
  socket.on('game:started', (data) => {
    gameStore.getState().setGameState(data.state);
    tradeStore.getState().clearOffers();
  });

  socket.on('game:state-update', (data) => {
    gameStore.getState().setGameState(data.state);
  });

  socket.on('game:action-error', (data) => {
    gameStore.getState().setActionError(data.message);
    setTimeout(() => gameStore.getState().setActionError(null), 3000);
  });

  socket.on('game:over', (data) => {
    gameStore.getState().setGameOver(data.finalScores, data.winnerId);
  });

  // Host ended the game — go back to room lobby
  socket.on('game:ended', (_data) => {
    gameStore.getState().clearGameState();
    tradeStore.getState().clearOffers();
  });

  // Trade
  socket.on('trade:new-offer', (data) => {
    tradeStore.getState().addOffer(data.offer);
  });

  socket.on('trade:offer-accepted', (data) => {
    tradeStore.getState().updateOfferStatus(data.tradeId, 'accepted' as any);
  });

  socket.on('trade:offer-rejected', (data) => {
    tradeStore.getState().updateOfferStatus(data.tradeId, 'rejected' as any);
  });

  socket.on('trade:offer-withdrawn', (data) => {
    tradeStore.getState().updateOfferStatus(data.tradeId, 'withdrawn' as any);
  });

  socket.on('trade:all-expired', () => {
    tradeStore.getState().clearOffers();
  });

  // Chat
  socket.on('chat:message', (data) => {
    useChatStore.getState().addMessage(data);
  });
}
