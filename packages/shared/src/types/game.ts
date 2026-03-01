import type { BeanCard, BeanType } from './beans.js';
import type { PlayerState, PublicPlayerState, BeanField } from './player.js';
import type { TradeOffer } from './trade.js';

export enum GamePhase {
  WaitingForPlayers = 'waiting',
  PlantFromHand = 'plant-from-hand',
  DrawAndTrade = 'draw-and-trade',
  PlantTradedBeans = 'plant-traded-beans',
  DrawNewCards = 'draw-new-cards',
  GameOver = 'game-over',
}

export interface TurnState {
  activePlayerId: string;
  phase: GamePhase;
  beansPlantedThisTurn: number;
  mustPlantFirst: boolean;
  drawnFaceUpCards: BeanCard[];
  keptFaceUpCardIds: string[];
  activeTradeOffers: TradeOffer[];
}

export interface GameLogEntry {
  timestamp: number;
  playerId: string;
  action: string;
  details: Record<string, unknown>;
}

export interface GameState {
  roomId: string;
  players: PlayerState[];
  turn: TurnState;
  deck: BeanCard[];
  discardPile: BeanCard[];
  deckExhaustionCount: number;
  turnNumber: number;
  gameLog: GameLogEntry[];
}

export interface ClientGameState {
  roomId: string;
  myId: string;
  myHand: BeanCard[];
  myFields: BeanField[];
  myGoldCoins: number;
  myPendingPlanting: BeanCard[];
  myHasThirdField: boolean;
  opponents: PublicPlayerState[];
  turn: TurnState;
  deckCount: number;
  discardPileCount: number;
  discardPileTopCard: BeanCard | null;
  deckExhaustionCount: number;
  gameLog: GameLogEntry[];
}

export interface GameError {
  code: string;
  message: string;
}

export type GameResult = GameState | GameError;

export function isGameError(result: GameResult): result is GameError {
  return 'code' in result && 'message' in result && !('players' in result);
}
