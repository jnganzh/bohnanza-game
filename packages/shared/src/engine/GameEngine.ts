import type { BeanCard } from '../types/beans.js';
import type { PlayerState, BeanField } from '../types/player.js';
import type { GameState, GameError, GameResult, GameLogEntry } from '../types/game.js';
import { GamePhase, isGameError } from '../types/game.js';
import { DeckManager } from './DeckManager.js';
import { FieldManager } from './FieldManager.js';
import { HandManager } from './HandManager.js';
import { TradeManager } from './TradeManager.js';
import {
  validatePlant,
  validateHarvest,
  validateBuyThirdField,
  validatePlantPending,
} from './validators.js';

function createEmptyField(): BeanField {
  return { beanType: null, cards: [] };
}

function addLog(
  state: GameState,
  playerId: string,
  action: string,
  details: Record<string, unknown> = {}
): GameState {
  const entry: GameLogEntry = {
    timestamp: Date.now(),
    playerId,
    action,
    details,
  };
  return { ...state, gameLog: [...state.gameLog, entry] };
}

export class GameEngine {
  static createGame(
    players: { id: string; name: string }[],
    roomId: string
  ): GameState {
    if (players.length < 2 || players.length > 5) {
      throw new Error('Bohnanza requires 2-5 players');
    }

    let deck = DeckManager.shuffle(DeckManager.createDeck());

    const gamePlayers: PlayerState[] = players.map((p) => ({
      id: p.id,
      name: p.name,
      hand: [],
      fields: [createEmptyField(), createEmptyField()],
      goldCoins: 0,
      goldCoinCards: [],
      hasThirdField: false,
      pendingPlanting: [],
      connected: true,
    }));

    // Deal 5 cards to each player
    for (let i = 0; i < 5; i++) {
      for (const player of gamePlayers) {
        if (deck.length > 0) {
          player.hand.push(deck[0]);
          deck = deck.slice(1);
        }
      }
    }

    const state: GameState = {
      roomId,
      players: gamePlayers,
      turn: {
        activePlayerId: gamePlayers[0].id,
        phase: GamePhase.PlantFromHand,
        beansPlantedThisTurn: 0,
        mustPlantFirst: true,
        drawnFaceUpCards: [],
        keptFaceUpCardIds: [],
        activeTradeOffers: [],
      },
      deck,
      discardPile: [],
      deckExhaustionCount: 0,
      turnNumber: 1,
      gameLog: [],
    };

    // If first player has no cards, skip to phase 2
    if (gamePlayers[0].hand.length === 0) {
      return GameEngine.advanceToPhase2(state);
    }

    return state;
  }

  // Phase 1: Plant from hand
  static plantFromHand(
    state: GameState,
    playerId: string,
    fieldIndex: number
  ): GameResult {
    const error = validatePlant(state, playerId, fieldIndex);
    if (error) return { code: 'INVALID_PLANT', message: error };

    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    const player = state.players[playerIndex];

    const removed = HandManager.removeFromFront(player.hand);
    if (!removed) return { code: 'EMPTY_HAND', message: 'No cards in hand' };

    const plantResult = FieldManager.plantBean(
      { ...player, hand: removed.hand },
      removed.card,
      fieldIndex
    );

    if (typeof plantResult === 'string') {
      return { code: 'PLANT_FAILED', message: plantResult };
    }

    const newPlayers = state.players.map((p, i) =>
      i === playerIndex ? plantResult : p
    );

    let newState: GameState = {
      ...state,
      players: newPlayers,
      turn: {
        ...state.turn,
        beansPlantedThisTurn: state.turn.beansPlantedThisTurn + 1,
        mustPlantFirst: false,
      },
    };

    newState = addLog(newState, playerId, 'plant', {
      beanType: removed.card.type,
      fieldIndex,
    });

    // If planted 2 or no more cards, auto-advance to Phase 2
    if (newState.turn.beansPlantedThisTurn >= 2 || plantResult.hand.length === 0) {
      newState = GameEngine.advanceToPhase2(newState);
    }

    return newState;
  }

  static skipSecondPlant(state: GameState, playerId: string): GameResult {
    if (state.turn.phase !== GamePhase.PlantFromHand) {
      return { code: 'WRONG_PHASE', message: 'Not in plant phase' };
    }
    if (state.turn.activePlayerId !== playerId) {
      return { code: 'NOT_YOUR_TURN', message: 'Not your turn' };
    }
    if (state.turn.mustPlantFirst) {
      return { code: 'MUST_PLANT', message: 'Must plant at least one bean first' };
    }

    return GameEngine.advanceToPhase2(state);
  }

  // Phase 2: Draw face-up cards
  private static advanceToPhase2(state: GameState): GameState {
    const { state: newState, cards } = DeckManager.drawCards(state, 2);

    if (newState.deckExhaustionCount >= 3) {
      return GameEngine.endGame(newState);
    }

    return {
      ...newState,
      turn: {
        ...newState.turn,
        phase: GamePhase.DrawAndTrade,
        drawnFaceUpCards: cards,
        keptFaceUpCardIds: [],
        activeTradeOffers: [],
      },
    };
  }

  // Active player keeps a face-up card (moves to pending planting)
  static keepFaceUpCard(
    state: GameState,
    playerId: string,
    cardId: string
  ): GameResult {
    if (state.turn.phase !== GamePhase.DrawAndTrade) {
      return { code: 'WRONG_PHASE', message: 'Not in trade phase' };
    }
    if (state.turn.activePlayerId !== playerId) {
      return { code: 'NOT_YOUR_TURN', message: 'Only active player can keep face-up cards' };
    }

    const card = state.turn.drawnFaceUpCards.find((c) => c.id === cardId);
    if (!card) {
      return { code: 'CARD_NOT_FOUND', message: 'Face-up card not found' };
    }

    // Don't allow keeping a card that's already kept
    if (state.turn.keptFaceUpCardIds.includes(cardId)) {
      return { code: 'ALREADY_KEPT', message: 'Card already kept' };
    }

    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    const newPlayers = state.players.map((p, i) =>
      i === playerIndex
        ? { ...p, pendingPlanting: [...p.pendingPlanting, card] }
        : p
    );

    return {
      ...state,
      players: newPlayers,
      turn: {
        ...state.turn,
        keptFaceUpCardIds: [...state.turn.keptFaceUpCardIds, cardId],
      },
    };
  }

  // End trading phase
  static endTrading(state: GameState, playerId: string): GameResult {
    if (state.turn.phase !== GamePhase.DrawAndTrade) {
      return { code: 'WRONG_PHASE', message: 'Not in trade phase' };
    }
    if (state.turn.activePlayerId !== playerId) {
      return { code: 'NOT_YOUR_TURN', message: 'Only active player can end trading' };
    }

    // Remaining (un-kept) face-up cards go to active player's pending planting
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    const remainingFaceUp = state.turn.drawnFaceUpCards.filter(
      (c) => !state.turn.keptFaceUpCardIds.includes(c.id)
    );

    const newPlayers = state.players.map((p, i) =>
      i === playerIndex
        ? { ...p, pendingPlanting: [...p.pendingPlanting, ...remainingFaceUp] }
        : p
    );

    let newState = TradeManager.expireAllTrades({
      ...state,
      players: newPlayers,
    });

    newState = {
      ...newState,
      turn: {
        ...newState.turn,
        phase: GamePhase.PlantTradedBeans,
        drawnFaceUpCards: [],
      },
    };

    // If nobody has pending beans, skip to Phase 4
    const anyPending = newState.players.some((p) => p.pendingPlanting.length > 0);
    if (!anyPending) {
      return GameEngine.advanceToPhase4(newState);
    }

    return newState;
  }

  // Phase 3: Plant pending (traded/donated) beans
  static plantPendingBean(
    state: GameState,
    playerId: string,
    cardId: string,
    fieldIndex: number
  ): GameResult {
    const error = validatePlantPending(state, playerId, cardId, fieldIndex);
    if (error) return { code: 'INVALID_PLANT_PENDING', message: error };

    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    const player = state.players[playerIndex];

    const cardIdx = player.pendingPlanting.findIndex((c) => c.id === cardId);
    const card = player.pendingPlanting[cardIdx];
    const newPending = [
      ...player.pendingPlanting.slice(0, cardIdx),
      ...player.pendingPlanting.slice(cardIdx + 1),
    ];

    const plantResult = FieldManager.plantBean(
      { ...player, pendingPlanting: newPending },
      card,
      fieldIndex
    );

    if (typeof plantResult === 'string') {
      return { code: 'PLANT_FAILED', message: plantResult };
    }

    const newPlayers = state.players.map((p, i) =>
      i === playerIndex ? plantResult : p
    );

    let newState: GameState = {
      ...state,
      players: newPlayers,
    };

    newState = addLog(newState, playerId, 'plant-pending', {
      beanType: card.type,
      fieldIndex,
    });

    // Check if all players have planted all pending beans
    const allDone = newState.players.every((p) => p.pendingPlanting.length === 0);
    if (allDone) {
      return GameEngine.advanceToPhase4(newState);
    }

    return newState;
  }

  // Phase 4: Draw 3 new cards
  private static advanceToPhase4(state: GameState): GameState {
    const activeId = state.turn.activePlayerId;
    const playerIndex = state.players.findIndex((p) => p.id === activeId);

    const { state: newState, cards } = DeckManager.drawCards(state, 3);

    if (newState.deckExhaustionCount >= 3) {
      return GameEngine.endGame(newState);
    }

    const newPlayers = newState.players.map((p, i) =>
      i === playerIndex
        ? { ...p, hand: HandManager.appendToBack(p.hand, cards) }
        : p
    );

    const nextState = GameEngine.advanceToNextTurn({
      ...newState,
      players: newPlayers,
    });

    return nextState;
  }

  private static advanceToNextTurn(state: GameState): GameState {
    const currentIndex = state.players.findIndex(
      (p) => p.id === state.turn.activePlayerId
    );
    const nextIndex = (currentIndex + 1) % state.players.length;
    const nextPlayer = state.players[nextIndex];

    const newState: GameState = {
      ...state,
      turnNumber: state.turnNumber + 1,
      turn: {
        activePlayerId: nextPlayer.id,
        phase: GamePhase.PlantFromHand,
        beansPlantedThisTurn: 0,
        mustPlantFirst: true,
        drawnFaceUpCards: [],
        keptFaceUpCardIds: [],
        activeTradeOffers: [],
      },
    };

    // If next player has no cards, skip Phase 1
    if (nextPlayer.hand.length === 0) {
      return GameEngine.advanceToPhase2(newState);
    }

    return newState;
  }

  // Harvest (any time, any player)
  static harvestField(
    state: GameState,
    playerId: string,
    fieldIndex: number
  ): GameResult {
    const error = validateHarvest(state, playerId, fieldIndex);
    if (error) return { code: 'INVALID_HARVEST', message: error };

    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    const player = state.players[playerIndex];

    const result = FieldManager.harvestField(player, fieldIndex);
    if (typeof result === 'string') {
      return { code: 'HARVEST_FAILED', message: result };
    }

    const newPlayers = state.players.map((p, i) =>
      i === playerIndex ? result.player : p
    );

    let newState: GameState = {
      ...state,
      players: newPlayers,
      discardPile: [...state.discardPile, ...result.discarded],
    };

    newState = addLog(newState, playerId, 'harvest', {
      fieldIndex,
      beanType: player.fields[fieldIndex].beanType,
      cardCount: player.fields[fieldIndex].cards.length,
      goldEarned: result.player.goldCoins - player.goldCoins,
    });

    return newState;
  }

  // Buy 3rd field (any time)
  static buyThirdField(state: GameState, playerId: string): GameResult {
    const error = validateBuyThirdField(state, playerId);
    if (error) return { code: 'CANNOT_BUY', message: error };

    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    const player = state.players[playerIndex];

    // Take 3 gold coins and put them on the discard pile
    const coinsToReturn = player.goldCoinCards.slice(0, 3);
    const remainingCoins = player.goldCoinCards.slice(3);

    const newPlayers = state.players.map((p, i) =>
      i === playerIndex
        ? {
            ...p,
            goldCoins: p.goldCoins - 3,
            goldCoinCards: remainingCoins,
            hasThirdField: true,
            fields: [...p.fields, createEmptyField()],
          }
        : p
    );

    let newState: GameState = {
      ...state,
      players: newPlayers,
      discardPile: [...state.discardPile, ...coinsToReturn],
    };

    newState = addLog(newState, playerId, 'buy-third-field', {});

    return newState;
  }

  // Game end
  static endGame(state: GameState): GameState {
    // Harvest all remaining fields
    let finalState = { ...state };

    for (let pi = 0; pi < finalState.players.length; pi++) {
      const player = finalState.players[pi];
      for (let fi = 0; fi < player.fields.length; fi++) {
        if (player.fields[fi].cards.length > 0) {
          const result = FieldManager.harvestField(
            finalState.players[pi],
            fi
          );
          if (typeof result !== 'string') {
            finalState = {
              ...finalState,
              players: finalState.players.map((p, i) =>
                i === pi ? result.player : p
              ),
              discardPile: [...finalState.discardPile, ...result.discarded],
            };
          }
        }
      }
    }

    return {
      ...finalState,
      turn: {
        ...finalState.turn,
        phase: GamePhase.GameOver,
      },
    };
  }

  static checkGameEnd(state: GameState): boolean {
    return state.turn.phase === GamePhase.GameOver;
  }

  static getWinner(state: GameState): { playerId: string; name: string; gold: number; cardsInHand: number } | null {
    if (state.turn.phase !== GamePhase.GameOver) return null;

    const scores = state.players.map((p) => ({
      playerId: p.id,
      name: p.name,
      gold: p.goldCoins,
      cardsInHand: p.hand.length,
    }));

    scores.sort((a, b) => {
      if (b.gold !== a.gold) return b.gold - a.gold;
      return b.cardsInHand - a.cardsInHand;
    });

    return scores[0];
  }

  static getFinalScores(state: GameState): { playerId: string; name: string; gold: number; cardsInHand: number }[] {
    return state.players
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        gold: p.goldCoins,
        cardsInHand: p.hand.length,
      }))
      .sort((a, b) => {
        if (b.gold !== a.gold) return b.gold - a.gold;
        return b.cardsInHand - a.cardsInHand;
      });
  }
}
