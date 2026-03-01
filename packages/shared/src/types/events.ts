import type { BeanCard, BeanType } from './beans.js';
import type { ClientGameState, GamePhase } from './game.js';
import type { TradeOffer } from './trade.js';

export interface ClientToServerEvents {
  'lobby:create-room': (data: { playerName: string; maxPlayers: number }) => void;
  'lobby:join-room': (data: { roomId: string; playerName: string }) => void;
  'lobby:leave-room': () => void;
  'lobby:delete-room': () => void;
  'lobby:change-max-players': (data: { maxPlayers: number }) => void;
  'lobby:start-game': () => void;

  'game:plant-bean': (data: { fieldIndex: number }) => void;
  'game:skip-second-plant': () => void;

  'game:harvest-field': (data: { fieldIndex: number }) => void;

  'game:keep-face-up-card': (data: { cardId: string }) => void;
  'game:propose-trade': (data: {
    toPlayerId: string | null;
    offering: { fromHand: BeanType[]; fromFaceUp: string[] };
    requesting: { fromHand: BeanType[] };
  }) => void;
  'game:propose-donation': (data: {
    toPlayerId: string;
    cards: { fromHand: BeanType[]; fromFaceUp: string[] };
  }) => void;
  'game:accept-trade': (data: { tradeId: string }) => void;
  'game:reject-trade': (data: { tradeId: string }) => void;
  'game:withdraw-trade': (data: { tradeId: string }) => void;
  'game:end-trading': () => void;

  'game:plant-pending-bean': (data: { cardId: string; fieldIndex: number }) => void;

  'game:buy-third-field': () => void;

  'chat:message': (data: { text: string }) => void;
}

export interface ServerToClientEvents {
  'lobby:room-created': (data: { roomId: string }) => void;
  'lobby:room-updated': (data: {
    players: { id: string; name: string }[];
    maxPlayers: number;
    hostId: string;
  }) => void;
  'lobby:room-list': (data: {
    rooms: { id: string; playerCount: number; maxPlayers: number; hostName: string }[];
  }) => void;
  'lobby:room-deleted': (data: { roomId: string }) => void;
  'lobby:error': (data: { message: string }) => void;

  'game:started': (data: { state: ClientGameState }) => void;
  'game:state-update': (data: { state: ClientGameState }) => void;
  'game:action-error': (data: { message: string; code: string }) => void;
  'game:phase-changed': (data: { phase: GamePhase; activePlayerId: string }) => void;

  'trade:new-offer': (data: { offer: TradeOffer }) => void;
  'trade:offer-accepted': (data: { tradeId: string; acceptedBy: string }) => void;
  'trade:offer-rejected': (data: { tradeId: string; rejectedBy: string }) => void;
  'trade:offer-withdrawn': (data: { tradeId: string }) => void;
  'trade:all-expired': () => void;

  'game:face-up-drawn': (data: { cards: BeanCard[] }) => void;

  'game:over': (data: {
    finalScores: { playerId: string; name: string; gold: number; cardsInHand: number }[];
    winnerId: string;
  }) => void;

  'chat:message': (data: {
    playerId: string;
    playerName: string;
    text: string;
    timestamp: number;
  }) => void;

  'player:disconnected': (data: { playerId: string }) => void;
  'player:reconnected': (data: { playerId: string }) => void;
}
