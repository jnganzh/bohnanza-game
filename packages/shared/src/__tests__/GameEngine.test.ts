import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine.js';
import { GamePhase, isGameError } from '../types/game.js';
import type { GameState, GameResult } from '../types/game.js';
import { BeanType } from '../types/beans.js';
import type { BeanCard } from '../types/beans.js';
import { DeckManager } from '../engine/DeckManager.js';
import { TradeManager } from '../engine/TradeManager.js';
import { TradeOfferStatus, TradeOfferType } from '../types/trade.js';
import type { TradeOffer } from '../types/trade.js';

const players3 = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Charlie' },
];

function assertNotError(result: GameResult): GameState {
  if (isGameError(result)) {
    throw new Error(`Expected success but got error: ${result.message}`);
  }
  return result;
}

function assertError(result: GameResult, expectedCode?: string): void {
  expect(isGameError(result)).toBe(true);
  if (expectedCode && isGameError(result)) {
    expect(result.code).toBe(expectedCode);
  }
}

describe('GameEngine', () => {
  describe('createGame', () => {
    it('should create a game with 3 players', () => {
      const state = GameEngine.createGame(players3, 'room1');
      expect(state.players).toHaveLength(3);
      expect(state.turn.phase).toBe(GamePhase.PlantFromHand);
      expect(state.turn.activePlayerId).toBe('p1');
    });

    it('should deal 5 cards to each player', () => {
      const state = GameEngine.createGame(players3, 'room1');
      for (const player of state.players) {
        expect(player.hand).toHaveLength(5);
      }
    });

    it('should set up deck with remaining cards', () => {
      const state = GameEngine.createGame(players3, 'room1');
      // 104 total - 15 dealt = 89
      expect(state.deck).toHaveLength(89);
    });

    it('should give each player 2 empty fields', () => {
      const state = GameEngine.createGame(players3, 'room1');
      for (const player of state.players) {
        expect(player.fields).toHaveLength(2);
        expect(player.fields[0].beanType).toBeNull();
        expect(player.fields[1].beanType).toBeNull();
      }
    });

    it('should throw for fewer than 2 players', () => {
      expect(() =>
        GameEngine.createGame([{ id: 'p1', name: 'A' }], 'room1')
      ).toThrow('2-5 players');
    });

    it('should allow 2 player games', () => {
      const state = GameEngine.createGame(
        [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }],
        'room1'
      );
      expect(state.players).toHaveLength(2);
      expect(state.players[0].hand).toHaveLength(5);
      expect(state.players[1].hand).toHaveLength(5);
      expect(state.deck).toHaveLength(94); // 104 - 10
    });

    it('should throw for more than 5 players', () => {
      const sixPlayers = Array.from({ length: 6 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
      }));
      expect(() => GameEngine.createGame(sixPlayers, 'room1')).toThrow('2-5 players');
    });

    it('should start with deckExhaustionCount 0', () => {
      const state = GameEngine.createGame(players3, 'room1');
      expect(state.deckExhaustionCount).toBe(0);
    });

    it('should start with empty discard pile', () => {
      const state = GameEngine.createGame(players3, 'room1');
      expect(state.discardPile).toHaveLength(0);
    });

    it('should start with mustPlantFirst true', () => {
      const state = GameEngine.createGame(players3, 'room1');
      expect(state.turn.mustPlantFirst).toBe(true);
    });
  });

  describe('Phase 1: Plant from hand', () => {
    it('should plant the first card from hand into a field', () => {
      const state = GameEngine.createGame(players3, 'room1');
      const firstCard = state.players[0].hand[0];
      const result = assertNotError(
        GameEngine.plantFromHand(state, 'p1', 0)
      );
      expect(result.players[0].fields[0].beanType).toBe(firstCard.type);
      expect(result.players[0].fields[0].cards).toHaveLength(1);
      expect(result.players[0].hand).toHaveLength(4);
    });

    it('should not allow non-active player to plant', () => {
      const state = GameEngine.createGame(players3, 'room1');
      assertError(GameEngine.plantFromHand(state, 'p2', 0), 'INVALID_PLANT');
    });

    it('should allow planting second card and then auto-advance to Phase 2', () => {
      let state = GameEngine.createGame(players3, 'room1');
      state = assertNotError(GameEngine.plantFromHand(state, 'p1', 0));

      // The second card is now the first in hand
      const secondCard = state.players[0].hand[0];
      state = assertNotError(GameEngine.plantFromHand(state, 'p1', 1));

      // Should auto-advance to Phase 2 after 2 plants
      expect(state.turn.phase).toBe(GamePhase.DrawAndTrade);
    });

    it('should not allow planting a third card', () => {
      let state = GameEngine.createGame(players3, 'room1');
      state = assertNotError(GameEngine.plantFromHand(state, 'p1', 0));
      state = assertNotError(GameEngine.plantFromHand(state, 'p1', 1));
      // Now in Phase 2, cannot plant from hand
      assertError(GameEngine.plantFromHand(state, 'p1', 0));
    });

    it('should reject planting in a field with a different bean type', () => {
      let state = GameEngine.createGame(players3, 'room1');
      // Plant first card in field 0
      state = assertNotError(GameEngine.plantFromHand(state, 'p1', 0));

      // If the second card is a different type, planting in field 0 should fail
      const secondCard = state.players[0].hand[0];
      const firstFieldType = state.players[0].fields[0].beanType;

      if (secondCard.type !== firstFieldType) {
        assertError(GameEngine.plantFromHand(state, 'p1', 0), 'INVALID_PLANT');
      }
    });
  });

  describe('Phase 1: Skip second plant', () => {
    it('should allow skipping second plant after first', () => {
      let state = GameEngine.createGame(players3, 'room1');
      state = assertNotError(GameEngine.plantFromHand(state, 'p1', 0));

      state = assertNotError(GameEngine.skipSecondPlant(state, 'p1'));
      expect(state.turn.phase).toBe(GamePhase.DrawAndTrade);
    });

    it('should not allow skipping before planting first card', () => {
      const state = GameEngine.createGame(players3, 'room1');
      assertError(GameEngine.skipSecondPlant(state, 'p1'), 'MUST_PLANT');
    });

    it('should not allow non-active player to skip', () => {
      let state = GameEngine.createGame(players3, 'room1');
      state = assertNotError(GameEngine.plantFromHand(state, 'p1', 0));
      assertError(GameEngine.skipSecondPlant(state, 'p2'), 'NOT_YOUR_TURN');
    });
  });

  describe('Phase 2: Draw and trade', () => {
    function getToPhase2(): GameState {
      let state = GameEngine.createGame(players3, 'room1');
      state = assertNotError(GameEngine.plantFromHand(state, 'p1', 0));
      state = assertNotError(GameEngine.skipSecondPlant(state, 'p1'));
      return state;
    }

    it('should draw 2 face-up cards when entering Phase 2', () => {
      const state = getToPhase2();
      expect(state.turn.drawnFaceUpCards).toHaveLength(2);
    });

    it('should allow active player to keep a face-up card', () => {
      const state = getToPhase2();
      const cardToKeep = state.turn.drawnFaceUpCards[0];

      const result = assertNotError(
        GameEngine.keepFaceUpCard(state, 'p1', cardToKeep.id)
      );
      // Card stays in drawnFaceUpCards but is marked as kept
      expect(result.turn.drawnFaceUpCards).toHaveLength(2);
      expect(result.turn.keptFaceUpCardIds).toContain(cardToKeep.id);
      expect(result.players[0].pendingPlanting).toHaveLength(1);
      expect(result.players[0].pendingPlanting[0].id).toBe(cardToKeep.id);
    });

    it('should not allow non-active player to keep face-up cards', () => {
      const state = getToPhase2();
      const card = state.turn.drawnFaceUpCards[0];
      assertError(GameEngine.keepFaceUpCard(state, 'p2', card.id));
    });

    it('should end trading and move remaining face-up to active player pending', () => {
      const state = getToPhase2();
      const faceUpCount = state.turn.drawnFaceUpCards.length;

      const result = assertNotError(GameEngine.endTrading(state, 'p1'));

      // If no other players had pending, goes straight to Phase 4 or next turn
      // But active player should have the face-up cards in pending
      // The endTrading moves to PlantTradedBeans if there are pending beans
      if (faceUpCount > 0) {
        expect(
          result.turn.phase === GamePhase.PlantTradedBeans ||
            result.turn.phase === GamePhase.PlantFromHand
        ).toBe(true);
      }
    });

    it('should not allow non-active player to end trading', () => {
      const state = getToPhase2();
      assertError(GameEngine.endTrading(state, 'p2'));
    });
  });

  describe('Phase 3: Plant pending beans', () => {
    function getToPhase3(): GameState {
      let state = GameEngine.createGame(players3, 'room1');
      state = assertNotError(GameEngine.plantFromHand(state, 'p1', 0));
      state = assertNotError(GameEngine.skipSecondPlant(state, 'p1'));
      // End trading: face-up cards go to active player's pending
      state = assertNotError(GameEngine.endTrading(state, 'p1'));
      return state;
    }

    it('should be in Phase 3 after ending trading with pending beans', () => {
      const state = getToPhase3();
      expect(state.turn.phase).toBe(GamePhase.PlantTradedBeans);
    });

    it('should allow planting pending beans', () => {
      const state = getToPhase3();
      const player = state.players[0];
      if (player.pendingPlanting.length > 0) {
        const card = player.pendingPlanting[0];
        // Find a valid field (empty or matching)
        let fieldIdx = player.fields.findIndex(
          (f) => f.beanType === null || f.beanType === card.type
        );
        if (fieldIdx === -1) fieldIdx = 0; // Will need to harvest first

        const result = GameEngine.plantPendingBean(state, 'p1', card.id, fieldIdx);
        if (!isGameError(result)) {
          expect(result.players[0].pendingPlanting.length).toBe(
            player.pendingPlanting.length - 1
          );
        }
      }
    });

    it('should advance to next turn when all pending beans are planted', () => {
      let state = getToPhase3();
      const player = state.players[0];

      // Plant all pending beans
      for (const card of player.pendingPlanting) {
        if (state.turn.phase !== GamePhase.PlantTradedBeans) break;
        const p = state.players[0];
        let fieldIdx = p.fields.findIndex(
          (f) => f.beanType === null || f.beanType === card.type
        );
        if (fieldIdx === -1) {
          // Harvest the field with the most cards
          const maxIdx = p.fields.reduce(
            (best, f, i) => (f.cards.length > p.fields[best].cards.length ? i : best),
            0
          );
          const harvestResult = GameEngine.harvestField(state, 'p1', maxIdx);
          if (!isGameError(harvestResult)) {
            state = harvestResult;
          }
          fieldIdx = p.fields.findIndex((f) => f.beanType === null || f.beanType === card.type);
          if (fieldIdx === -1) fieldIdx = 0;
        }
        const result = GameEngine.plantPendingBean(state, 'p1', card.id, fieldIdx);
        if (!isGameError(result)) {
          state = result;
        }
      }

      // After all pending are planted, should advance past Phase 3
      expect(state.turn.phase).not.toBe(GamePhase.PlantTradedBeans);
    });
  });

  describe('Harvesting', () => {
    it('should allow harvesting a field with 2+ cards', () => {
      let state = GameEngine.createGame(players3, 'room1');

      // Manually set up a field with multiple cards
      const blueCards: BeanCard[] = [
        { id: 'b1', type: BeanType.Blue },
        { id: 'b2', type: BeanType.Blue },
        { id: 'b3', type: BeanType.Blue },
        { id: 'b4', type: BeanType.Blue },
      ];
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0
            ? {
                ...p,
                fields: [
                  { beanType: BeanType.Blue, cards: blueCards },
                  p.fields[1],
                ],
              }
            : p
        ),
      };

      const result = assertNotError(GameEngine.harvestField(state, 'p1', 0));
      expect(result.players[0].fields[0].beanType).toBeNull();
      expect(result.players[0].fields[0].cards).toHaveLength(0);
      expect(result.players[0].goldCoins).toBe(1); // 4 Blue beans = 1 gold
    });

    it('should not allow harvesting a single-card field when other field has 2+', () => {
      let state = GameEngine.createGame(players3, 'room1');
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0
            ? {
                ...p,
                fields: [
                  { beanType: BeanType.Red, cards: [{ id: 'r1', type: BeanType.Red }] },
                  {
                    beanType: BeanType.Blue,
                    cards: [
                      { id: 'b1', type: BeanType.Blue },
                      { id: 'b2', type: BeanType.Blue },
                    ],
                  },
                ],
              }
            : p
        ),
      };

      assertError(GameEngine.harvestField(state, 'p1', 0), 'INVALID_HARVEST');
    });

    it('should allow harvesting a single-card field when all fields are singles', () => {
      let state = GameEngine.createGame(players3, 'room1');
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0
            ? {
                ...p,
                fields: [
                  { beanType: BeanType.Red, cards: [{ id: 'r1', type: BeanType.Red }] },
                  { beanType: BeanType.Blue, cards: [{ id: 'b1', type: BeanType.Blue }] },
                ],
              }
            : p
        ),
      };

      const result = assertNotError(GameEngine.harvestField(state, 'p1', 0));
      expect(result.players[0].fields[0].cards).toHaveLength(0);
    });

    it('should correctly calculate gold and discard remaining cards', () => {
      let state = GameEngine.createGame(players3, 'room1');
      const chiliBeans: BeanCard[] = Array.from({ length: 3 }, (_, i) => ({
        id: `c${i}`,
        type: BeanType.Chili,
      }));

      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0
            ? {
                ...p,
                fields: [
                  { beanType: BeanType.Chili, cards: chiliBeans },
                  p.fields[1],
                ],
              }
            : p
        ),
      };

      const result = assertNotError(GameEngine.harvestField(state, 'p1', 0));
      // 3 Chili beans = 1 gold coin
      expect(result.players[0].goldCoins).toBe(1);
      expect(result.players[0].goldCoinCards).toHaveLength(1);
      // Remaining 2 go to discard
      expect(result.discardPile.length).toBe(state.discardPile.length + 2);
    });

    it('should yield 0 gold for insufficient cards', () => {
      let state = GameEngine.createGame(players3, 'room1');
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0
            ? {
                ...p,
                fields: [
                  {
                    beanType: BeanType.Chili,
                    cards: [
                      { id: 'c1', type: BeanType.Chili },
                      { id: 'c2', type: BeanType.Chili },
                    ],
                  },
                  { beanType: BeanType.Blue, cards: [{ id: 'b1', type: BeanType.Blue }] },
                ],
              }
            : p
        ),
      };

      // 2 Chili beans = 0 gold
      const result = assertNotError(GameEngine.harvestField(state, 'p1', 0));
      expect(result.players[0].goldCoins).toBe(0);
      expect(result.discardPile.length).toBe(state.discardPile.length + 2);
    });

    it('should not allow harvesting an empty field', () => {
      const state = GameEngine.createGame(players3, 'room1');
      assertError(GameEngine.harvestField(state, 'p1', 0), 'INVALID_HARVEST');
    });

    it('should allow any player to harvest at any time', () => {
      let state = GameEngine.createGame(players3, 'room1');
      // Give p2 some cards in a field
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 1
            ? {
                ...p,
                fields: [
                  {
                    beanType: BeanType.Soy,
                    cards: [
                      { id: 's1', type: BeanType.Soy },
                      { id: 's2', type: BeanType.Soy },
                    ],
                  },
                  p.fields[1],
                ],
              }
            : p
        ),
      };

      // p2 is not the active player, but can still harvest
      const result = assertNotError(GameEngine.harvestField(state, 'p2', 0));
      expect(result.players[1].goldCoins).toBe(1); // 2 Soy = 1 gold
    });
  });

  describe('Hand order', () => {
    it('should always plant from the front of the hand', () => {
      const state = GameEngine.createGame(players3, 'room1');
      const firstCard = state.players[0].hand[0];
      const secondCard = state.players[0].hand[1];

      const result = assertNotError(GameEngine.plantFromHand(state, 'p1', 0));
      // The new first card should be what was the second card
      expect(result.players[0].hand[0].id).toBe(secondCard.id);
    });
  });

  describe('Buy third field', () => {
    it('should allow buying third field with 3+ gold', () => {
      let state = GameEngine.createGame(players3, 'room1');
      // Give player 3 gold
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0
            ? {
                ...p,
                goldCoins: 3,
                goldCoinCards: [
                  { id: 'g1', type: BeanType.Red },
                  { id: 'g2', type: BeanType.Red },
                  { id: 'g3', type: BeanType.Red },
                ],
              }
            : p
        ),
      };

      const result = assertNotError(GameEngine.buyThirdField(state, 'p1'));
      expect(result.players[0].hasThirdField).toBe(true);
      expect(result.players[0].fields).toHaveLength(3);
      expect(result.players[0].goldCoins).toBe(0);
      expect(result.players[0].goldCoinCards).toHaveLength(0);
      // 3 coin cards returned to discard
      expect(result.discardPile.length).toBe(state.discardPile.length + 3);
    });

    it('should not allow buying with insufficient gold', () => {
      let state = GameEngine.createGame(players3, 'room1');
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0 ? { ...p, goldCoins: 2, goldCoinCards: [{ id: 'g1', type: BeanType.Red }, { id: 'g2', type: BeanType.Red }] } : p
        ),
      };

      assertError(GameEngine.buyThirdField(state, 'p1'), 'CANNOT_BUY');
    });

    it('should not allow buying twice', () => {
      let state = GameEngine.createGame(players3, 'room1');
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0
            ? {
                ...p,
                goldCoins: 6,
                goldCoinCards: Array.from({ length: 6 }, (_, j) => ({
                  id: `g${j}`,
                  type: BeanType.Red,
                })),
              }
            : p
        ),
      };

      state = assertNotError(GameEngine.buyThirdField(state, 'p1'));
      assertError(GameEngine.buyThirdField(state, 'p1'), 'CANNOT_BUY');
    });
  });

  describe('Trading', () => {
    function getToPhase2WithSetup(): GameState {
      let state = GameEngine.createGame(players3, 'room1');
      state = assertNotError(GameEngine.plantFromHand(state, 'p1', 0));
      state = assertNotError(GameEngine.skipSecondPlant(state, 'p1'));
      return state;
    }

    it('should allow active player to propose a trade', () => {
      const state = getToPhase2WithSetup();
      const p1Hand = state.players[0].hand;

      if (p1Hand.length > 0) {
        const offer: TradeOffer = {
          id: 'trade1',
          type: TradeOfferType.Trade,
          fromPlayerId: 'p1',
          toPlayerId: null,
          offering: { fromHand: [p1Hand[0].type], fromFaceUp: [] },
          requesting: { fromHand: [state.players[1].hand[0].type], fromFaceUp: [] },
          status: TradeOfferStatus.Pending,
          rejectedByPlayerIds: [],
          timestamp: Date.now(),
        };

        const result = assertNotError(TradeManager.proposeTrade(state, offer));
        expect(result.turn.activeTradeOffers).toHaveLength(1);
      }
    });

    it('should reject trade between two non-active players', () => {
      const state = getToPhase2WithSetup();

      const offer: TradeOffer = {
        id: 'trade1',
        type: TradeOfferType.Trade,
        fromPlayerId: 'p2',
        toPlayerId: null,
        offering: { fromHand: [state.players[1].hand[0].type], fromFaceUp: [] },
        requesting: { fromHand: [state.players[2].hand[0].type], fromFaceUp: [] },
        status: TradeOfferStatus.Pending,
        rejectedByPlayerIds: [],
        timestamp: Date.now(),
      };

      const result = TradeManager.proposeTrade(state, offer);
      expect(isGameError(result)).toBe(true);
    });

    it('should reject non-active player offering face-up cards', () => {
      const state = getToPhase2WithSetup();

      if (state.turn.drawnFaceUpCards.length > 0) {
        const offer: TradeOffer = {
          id: 'trade1',
          type: TradeOfferType.Trade,
          fromPlayerId: 'p2',
          toPlayerId: null,
          offering: { fromHand: [], fromFaceUp: [state.turn.drawnFaceUpCards[0].id] },
          requesting: { fromHand: [], fromFaceUp: [] },
          status: TradeOfferStatus.Pending,
          rejectedByPlayerIds: [],
          timestamp: Date.now(),
        };

        const result = TradeManager.proposeTrade(state, offer);
        expect(isGameError(result)).toBe(true);
      }
    });

    it('should move traded cards to pendingPlanting on acceptance', () => {
      const state = getToPhase2WithSetup();
      const p1Hand = state.players[0].hand;
      const p2Hand = state.players[1].hand;

      if (p1Hand.length > 0 && p2Hand.length > 0) {
        const offer: TradeOffer = {
          id: 'trade1',
          type: TradeOfferType.Trade,
          fromPlayerId: 'p1',
          toPlayerId: null,
          offering: { fromHand: [p1Hand[0].type], fromFaceUp: [] },
          requesting: { fromHand: [p2Hand[0].type], fromFaceUp: [] },
          status: TradeOfferStatus.Pending,
          rejectedByPlayerIds: [],
          timestamp: Date.now(),
        };

        let tradeState = assertNotError(TradeManager.proposeTrade(state, offer));
        tradeState = assertNotError(
          TradeManager.acceptTrade(tradeState, 'trade1', 'p2')
        );

        // p1 should have p2's card in pending
        expect(tradeState.players[0].pendingPlanting.length).toBeGreaterThan(0);
        // p2 should have p1's card in pending
        expect(tradeState.players[1].pendingPlanting.length).toBeGreaterThan(0);
      }
    });

    it('should handle donations correctly', () => {
      const state = getToPhase2WithSetup();
      const faceUp = state.turn.drawnFaceUpCards;

      if (faceUp.length > 0) {
        const offer: TradeOffer = {
          id: 'donate1',
          type: TradeOfferType.Donation,
          fromPlayerId: 'p1',
          toPlayerId: null,
          offering: { fromHand: [], fromFaceUp: [faceUp[0].id] },
          requesting: { fromHand: [], fromFaceUp: [] },
          status: TradeOfferStatus.Pending,
          rejectedByPlayerIds: [],
          timestamp: Date.now(),
        };

        let donateState = assertNotError(TradeManager.proposeTrade(state, offer));
        donateState = assertNotError(
          TradeManager.acceptTrade(donateState, 'donate1', 'p2')
        );

        // p2 should have the donated card
        expect(donateState.players[1].pendingPlanting).toHaveLength(1);
        // Card stays in drawnFaceUpCards but is marked as claimed
        expect(donateState.turn.drawnFaceUpCards).toHaveLength(faceUp.length);
        expect(donateState.turn.keptFaceUpCardIds).toContain(faceUp[0].id);
      }
    });
  });

  describe('Phase flow', () => {
    it('should go through all 4 phases and advance to next player', () => {
      let state = GameEngine.createGame(players3, 'room1');
      expect(state.turn.phase).toBe(GamePhase.PlantFromHand);
      expect(state.turn.activePlayerId).toBe('p1');

      // Phase 1
      state = assertNotError(GameEngine.plantFromHand(state, 'p1', 0));
      state = assertNotError(GameEngine.skipSecondPlant(state, 'p1'));
      expect(state.turn.phase).toBe(GamePhase.DrawAndTrade);

      // Phase 2
      state = assertNotError(GameEngine.endTrading(state, 'p1'));

      // Phase 3 (if pending) -> Phase 4 -> Next turn
      // Plant all pending beans
      while (state.turn.phase === GamePhase.PlantTradedBeans) {
        const player = state.players.find(
          (p) => p.pendingPlanting.length > 0
        );
        if (!player) break;
        const card = player.pendingPlanting[0];
        let fieldIdx = player.fields.findIndex(
          (f) => f.beanType === null || f.beanType === card.type
        );
        if (fieldIdx === -1) {
          // Harvest to make room
          const harvestIdx = player.fields.findIndex((f) => f.cards.length > 0);
          if (harvestIdx !== -1) {
            const hResult = GameEngine.harvestField(state, player.id, harvestIdx);
            if (!isGameError(hResult)) state = hResult;
          }
          fieldIdx = player.fields.findIndex((f) => f.beanType === null);
          if (fieldIdx === -1) fieldIdx = 0;
        }
        const result = GameEngine.plantPendingBean(state, player.id, card.id, fieldIdx);
        if (!isGameError(result)) {
          state = result;
        } else {
          break;
        }
      }

      // Should now be p2's turn
      expect(state.turn.activePlayerId).toBe('p2');
      expect(state.turn.phase).toBe(GamePhase.PlantFromHand);
    });
  });

  describe('Game end', () => {
    it('should end the game and harvest all fields', () => {
      let state = GameEngine.createGame(players3, 'room1');
      // Manually set up for game end
      state = {
        ...state,
        players: state.players.map((p, i) =>
          i === 0
            ? {
                ...p,
                fields: [
                  {
                    beanType: BeanType.Red,
                    cards: [
                      { id: 'r1', type: BeanType.Red },
                      { id: 'r2', type: BeanType.Red },
                    ],
                  },
                  p.fields[1],
                ],
              }
            : p
        ),
      };

      const endState = GameEngine.endGame(state);
      expect(endState.turn.phase).toBe(GamePhase.GameOver);
      // All fields should be empty after final harvest
      for (const player of endState.players) {
        for (const field of player.fields) {
          expect(field.cards).toHaveLength(0);
        }
      }
    });

    it('should correctly determine winner by gold', () => {
      let state = GameEngine.createGame(players3, 'room1');
      state = {
        ...state,
        turn: { ...state.turn, phase: GamePhase.GameOver },
        players: state.players.map((p, i) => ({
          ...p,
          goldCoins: [5, 3, 7][i],
          fields: [
            { beanType: null, cards: [] },
            { beanType: null, cards: [] },
          ],
        })),
      };

      const winner = GameEngine.getWinner(state);
      expect(winner).not.toBeNull();
      expect(winner!.playerId).toBe('p3');
      expect(winner!.gold).toBe(7);
    });

    it('should break ties by cards in hand', () => {
      let state = GameEngine.createGame(players3, 'room1');
      state = {
        ...state,
        turn: { ...state.turn, phase: GamePhase.GameOver },
        players: state.players.map((p, i) => ({
          ...p,
          goldCoins: 5,
          hand: i === 1
            ? [{ id: 'x1', type: BeanType.Red }, { id: 'x2', type: BeanType.Red }, { id: 'x3', type: BeanType.Red }]
            : [{ id: `y${i}`, type: BeanType.Blue }],
          fields: [
            { beanType: null, cards: [] },
            { beanType: null, cards: [] },
          ],
        })),
      };

      const winner = GameEngine.getWinner(state);
      expect(winner).not.toBeNull();
      expect(winner!.playerId).toBe('p2'); // p2 has most cards in hand
    });

    it('getFinalScores should return sorted scores', () => {
      let state = GameEngine.createGame(players3, 'room1');
      state = {
        ...state,
        turn: { ...state.turn, phase: GamePhase.GameOver },
        players: state.players.map((p, i) => ({
          ...p,
          goldCoins: [3, 7, 5][i],
          fields: [
            { beanType: null, cards: [] },
            { beanType: null, cards: [] },
          ],
        })),
      };

      const scores = GameEngine.getFinalScores(state);
      expect(scores[0].gold).toBe(7);
      expect(scores[1].gold).toBe(5);
      expect(scores[2].gold).toBe(3);
    });
  });

  describe('Full game simulation', () => {
    it('should be able to play through a complete game with random moves', () => {
      let state = GameEngine.createGame(players3, 'room1');
      let iterations = 0;
      const maxIterations = 5000;

      while (state.turn.phase !== GamePhase.GameOver && iterations < maxIterations) {
        iterations++;
        const activeId = state.turn.activePlayerId;
        const activePlayer = state.players.find((p) => p.id === activeId)!;

        switch (state.turn.phase) {
          case GamePhase.PlantFromHand: {
            if (activePlayer.hand.length === 0) break;

            // Find a valid field
            const card = activePlayer.hand[0];
            let fieldIdx = activePlayer.fields.findIndex(
              (f) => f.beanType === null || f.beanType === card.type
            );

            if (fieldIdx === -1) {
              // Must harvest first
              const harvestIdx = activePlayer.fields.reduce(
                (best, f, i) =>
                  f.cards.length > activePlayer.fields[best].cards.length ? i : best,
                0
              );
              const hr = GameEngine.harvestField(state, activeId, harvestIdx);
              if (!isGameError(hr)) state = hr;
              fieldIdx = state.players
                .find((p) => p.id === activeId)!
                .fields.findIndex((f) => f.beanType === null);
              if (fieldIdx === -1) fieldIdx = 0;
            }

            const plantResult = GameEngine.plantFromHand(state, activeId, fieldIdx);
            if (!isGameError(plantResult)) {
              state = plantResult;
            }

            // Skip second plant half the time
            if (
              state.turn.phase === GamePhase.PlantFromHand &&
              !state.turn.mustPlantFirst
            ) {
              const skip = Math.random() > 0.5;
              if (skip) {
                const sr = GameEngine.skipSecondPlant(state, activeId);
                if (!isGameError(sr)) state = sr;
              } else {
                // Plant second
                const p = state.players.find((pp) => pp.id === activeId)!;
                if (p.hand.length > 0) {
                  const c2 = p.hand[0];
                  let fi2 = p.fields.findIndex(
                    (f) => f.beanType === null || f.beanType === c2.type
                  );
                  if (fi2 === -1) {
                    const hi = p.fields.reduce(
                      (best, f, i) =>
                        f.cards.length > p.fields[best].cards.length ? i : best,
                      0
                    );
                    const hr2 = GameEngine.harvestField(state, activeId, hi);
                    if (!isGameError(hr2)) state = hr2;
                    fi2 = state.players
                      .find((pp) => pp.id === activeId)!
                      .fields.findIndex((f) => f.beanType === null);
                    if (fi2 === -1) fi2 = 0;
                  }
                  const pr2 = GameEngine.plantFromHand(state, activeId, fi2);
                  if (!isGameError(pr2)) state = pr2;
                }
              }
            }
            break;
          }

          case GamePhase.DrawAndTrade: {
            // Skip trading, just end it
            const er = GameEngine.endTrading(state, activeId);
            if (!isGameError(er)) state = er;
            break;
          }

          case GamePhase.PlantTradedBeans: {
            // Plant all pending beans for all players
            let planted = true;
            while (planted) {
              planted = false;
              for (const player of state.players) {
                if (player.pendingPlanting.length > 0) {
                  const card = player.pendingPlanting[0];
                  let fi = player.fields.findIndex(
                    (f) => f.beanType === null || f.beanType === card.type
                  );
                  if (fi === -1) {
                    // Harvest
                    const hi = player.fields.reduce(
                      (best, f, i) =>
                        f.cards.length > player.fields[best].cards.length ? i : best,
                      0
                    );
                    const hr = GameEngine.harvestField(state, player.id, hi);
                    if (!isGameError(hr)) {
                      state = hr;
                      fi = state.players
                        .find((p) => p.id === player.id)!
                        .fields.findIndex((f) => f.beanType === null);
                      if (fi === -1) fi = 0;
                    } else {
                      fi = 0;
                    }
                  }
                  const pr = GameEngine.plantPendingBean(
                    state,
                    player.id,
                    card.id,
                    fi
                  );
                  if (!isGameError(pr)) {
                    state = pr;
                    planted = true;
                  }
                }
              }
            }
            break;
          }

          default:
            break;
        }
      }

      expect(state.turn.phase).toBe(GamePhase.GameOver);
      const winner = GameEngine.getWinner(state);
      expect(winner).not.toBeNull();
      expect(winner!.gold).toBeGreaterThanOrEqual(0);

      const scores = GameEngine.getFinalScores(state);
      expect(scores).toHaveLength(3);
    });
  });
});
