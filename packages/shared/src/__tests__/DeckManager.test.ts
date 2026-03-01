import { describe, it, expect } from 'vitest';
import { DeckManager } from '../engine/DeckManager.js';
import { BEAN_VARIETIES } from '../constants/beans.js';
import { BeanType } from '../types/beans.js';
import type { GameState } from '../types/game.js';
import { GamePhase } from '../types/game.js';

function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    roomId: 'test',
    players: [],
    turn: {
      activePlayerId: 'p1',
      phase: GamePhase.PlantFromHand,
      beansPlantedThisTurn: 0,
      mustPlantFirst: true,
      drawnFaceUpCards: [],
      keptFaceUpCardIds: [],
      activeTradeOffers: [],
    },
    deck: [],
    discardPile: [],
    deckExhaustionCount: 0,
    turnNumber: 1,
    gameLog: [],
    ...overrides,
  };
}

describe('DeckManager', () => {
  describe('createDeck', () => {
    it('should create a deck with 104 cards', () => {
      const deck = DeckManager.createDeck();
      expect(deck).toHaveLength(104);
    });

    it('should have correct number of each bean type', () => {
      const deck = DeckManager.createDeck();
      for (const variety of Object.values(BEAN_VARIETIES)) {
        const count = deck.filter((c) => c.type === variety.type).length;
        expect(count).toBe(variety.totalCards);
      }
    });

    it('should have 20 Blue Beans', () => {
      const deck = DeckManager.createDeck();
      expect(deck.filter((c) => c.type === BeanType.Blue)).toHaveLength(20);
    });

    it('should have 6 Garden Beans', () => {
      const deck = DeckManager.createDeck();
      expect(deck.filter((c) => c.type === BeanType.Garden)).toHaveLength(6);
    });

    it('should assign unique IDs to all cards', () => {
      const deck = DeckManager.createDeck();
      const ids = new Set(deck.map((c) => c.id));
      expect(ids.size).toBe(104);
    });
  });

  describe('shuffle', () => {
    it('should return a deck with the same cards', () => {
      const deck = DeckManager.createDeck();
      const shuffled = DeckManager.shuffle(deck);
      expect(shuffled).toHaveLength(104);
      expect(new Set(shuffled.map((c) => c.id))).toEqual(
        new Set(deck.map((c) => c.id))
      );
    });

    it('should not mutate the original deck', () => {
      const deck = DeckManager.createDeck();
      const original = [...deck];
      DeckManager.shuffle(deck);
      expect(deck).toEqual(original);
    });
  });

  describe('drawCards', () => {
    it('should draw the specified number of cards from the top', () => {
      const deck = DeckManager.createDeck();
      const state = makeMinimalState({ deck });
      const { state: newState, cards } = DeckManager.drawCards(state, 3);
      expect(cards).toHaveLength(3);
      expect(cards[0].id).toBe(deck[0].id);
      expect(cards[1].id).toBe(deck[1].id);
      expect(cards[2].id).toBe(deck[2].id);
      expect(newState.deck).toHaveLength(101);
    });

    it('should reshuffle discard pile when deck is empty', () => {
      const discardPile = DeckManager.createDeck().slice(0, 10);
      const state = makeMinimalState({ deck: [], discardPile });
      const { state: newState, cards } = DeckManager.drawCards(state, 2);
      expect(cards).toHaveLength(2);
      expect(newState.deckExhaustionCount).toBe(1);
      expect(newState.discardPile).toHaveLength(0);
    });

    it('should increment exhaustion count each time deck runs out', () => {
      const state = makeMinimalState({
        deck: [],
        discardPile: DeckManager.createDeck().slice(0, 5),
        deckExhaustionCount: 1,
      });
      const { state: newState } = DeckManager.drawCards(state, 2);
      expect(newState.deckExhaustionCount).toBe(2);
    });

    it('should stop drawing when deck exhausted for 3rd time', () => {
      const state = makeMinimalState({
        deck: [],
        discardPile: [],
        deckExhaustionCount: 2,
      });
      const { state: newState, cards } = DeckManager.drawCards(state, 3);
      expect(newState.deckExhaustionCount).toBe(3);
      expect(cards).toHaveLength(0);
    });

    it('should draw partial cards if deck exhausts mid-draw on 3rd time', () => {
      const deck = DeckManager.createDeck().slice(0, 1);
      const state = makeMinimalState({
        deck,
        discardPile: [],
        deckExhaustionCount: 2,
      });
      const { state: newState, cards } = DeckManager.drawCards(state, 3);
      expect(cards).toHaveLength(1);
      expect(newState.deckExhaustionCount).toBe(3);
    });
  });
});
