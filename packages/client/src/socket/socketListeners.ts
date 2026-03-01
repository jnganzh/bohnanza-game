import { socket } from './socketClient.js';
import { useLobbyStore } from '../stores/useLobbyStore.js';
import { useGameStore } from '../stores/useGameStore.js';
import { useTradeStore } from '../stores/useTradeStore.js';

export function registerSocketListeners(): void {
  const lobbyStore = useLobbyStore;
  const gameStore = useGameStore;
  const tradeStore = useTradeStore;

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
}
