import type { GameState } from '../types/game.js';
import type { GameError } from '../types/game.js';
import { isGameError } from '../types/game.js';
import type { TradeOffer } from '../types/trade.js';
import { TradeOfferStatus, TradeOfferType } from '../types/trade.js';
import { HandManager } from './HandManager.js';
import { validateTrade } from './validators.js';

export class TradeManager {
  static proposeTrade(state: GameState, offer: TradeOffer): GameState | GameError {
    const error = validateTrade(state, offer);
    if (error) return { code: 'INVALID_TRADE', message: error };

    return {
      ...state,
      turn: {
        ...state.turn,
        activeTradeOffers: [...state.turn.activeTradeOffers, offer],
      },
    };
  }

  static acceptTrade(
    state: GameState,
    tradeId: string,
    acceptingPlayerId: string
  ): GameState | GameError {
    const offer = state.turn.activeTradeOffers.find((o) => o.id === tradeId);
    if (!offer) return { code: 'TRADE_NOT_FOUND', message: 'Trade offer not found' };
    if (offer.status !== TradeOfferStatus.Pending) {
      return { code: 'TRADE_NOT_PENDING', message: 'Trade is no longer pending' };
    }

    // All trades are open — anyone (except the proposer) can accept
    if (offer.fromPlayerId === acceptingPlayerId) {
      return { code: 'SELF_ACCEPT', message: 'You cannot accept your own trade' };
    }

    const fromPlayer = state.players.find((p) => p.id === offer.fromPlayerId)!;
    const toPlayer = state.players.find((p) => p.id === acceptingPlayerId)!;

    // Move cards from offering player
    let fromHand = [...fromPlayer.hand];
    const cardsForTo: typeof fromPlayer.hand = [];

    for (const beanType of offer.offering.fromHand) {
      const result = HandManager.removeByType(fromHand, beanType);
      if (!result) return { code: 'CARD_MISSING', message: 'Offering player no longer has the card' };
      fromHand = result.hand;
      cardsForTo.push(result.card);
    }

    // Move face-up cards from offering player (keep them visible but mark as claimed)
    const tradedFaceUpIds: string[] = [];
    for (const cardId of offer.offering.fromFaceUp) {
      const card = state.turn.drawnFaceUpCards.find((c) => c.id === cardId);
      if (!card) return { code: 'CARD_MISSING', message: 'Face-up card no longer available' };
      if (state.turn.keptFaceUpCardIds.includes(cardId)) {
        return { code: 'CARD_MISSING', message: 'Face-up card already claimed' };
      }
      cardsForTo.push(card);
      tradedFaceUpIds.push(cardId);
    }

    // Move cards from accepting player (for trades, not donations)
    let toHand = [...toPlayer.hand];
    const cardsForFrom: typeof toPlayer.hand = [];

    if (offer.type === TradeOfferType.Trade) {
      for (const beanType of offer.requesting.fromHand) {
        const result = HandManager.removeByType(toHand, beanType);
        if (!result) return { code: 'CARD_MISSING', message: 'Accepting player no longer has the card' };
        toHand = result.hand;
        cardsForFrom.push(result.card);
      }

      // Handle requested face-up cards (non-active player requesting active player's face-up cards)
      for (const cardId of offer.requesting.fromFaceUp) {
        const card = state.turn.drawnFaceUpCards.find((c) => c.id === cardId);
        if (!card) return { code: 'CARD_MISSING', message: 'Requested face-up card no longer available' };
        if (state.turn.keptFaceUpCardIds.includes(cardId)) {
          return { code: 'CARD_MISSING', message: 'Requested face-up card already claimed' };
        }
        cardsForFrom.push(card);
        tradedFaceUpIds.push(cardId);
      }
    }

    // Update players
    const newPlayers = state.players.map((p) => {
      if (p.id === offer.fromPlayerId) {
        return {
          ...p,
          hand: fromHand,
          pendingPlanting: [...p.pendingPlanting, ...cardsForFrom],
        };
      }
      if (p.id === acceptingPlayerId) {
        return {
          ...p,
          hand: toHand,
          pendingPlanting: [...p.pendingPlanting, ...cardsForTo],
        };
      }
      return p;
    });

    // Update trade status
    const newOffers = state.turn.activeTradeOffers.map((o) =>
      o.id === tradeId ? { ...o, status: TradeOfferStatus.Accepted } : o
    );

    return {
      ...state,
      players: newPlayers,
      turn: {
        ...state.turn,
        keptFaceUpCardIds: [...state.turn.keptFaceUpCardIds, ...tradedFaceUpIds],
        activeTradeOffers: newOffers,
      },
    };
  }

  static rejectTrade(
    state: GameState,
    tradeId: string,
    rejectingPlayerId: string
  ): GameState | GameError {
    const offer = state.turn.activeTradeOffers.find((o) => o.id === tradeId);
    if (!offer) return { code: 'TRADE_NOT_FOUND', message: 'Trade offer not found' };
    if (offer.status !== TradeOfferStatus.Pending) {
      return { code: 'TRADE_NOT_PENDING', message: 'Trade is no longer pending' };
    }

    // All trades are open — per-player rejection; offer stays pending for others
    if (offer.rejectedByPlayerIds.includes(rejectingPlayerId)) {
      return { code: 'ALREADY_REJECTED', message: 'You already rejected this trade' };
    }

    const newRejected = [...offer.rejectedByPlayerIds, rejectingPlayerId];
    // If every non-proposer has rejected, mark the whole offer as rejected
    const otherPlayerIds = state.players
      .filter((p) => p.id !== offer.fromPlayerId)
      .map((p) => p.id);
    const allRejected = otherPlayerIds.every((id) => newRejected.includes(id));

    const newOffers = state.turn.activeTradeOffers.map((o) =>
      o.id === tradeId
        ? {
            ...o,
            rejectedByPlayerIds: newRejected,
            status: allRejected ? TradeOfferStatus.Rejected : TradeOfferStatus.Pending,
          }
        : o
    );

    return {
      ...state,
      turn: { ...state.turn, activeTradeOffers: newOffers },
    };
  }

  static withdrawTrade(state: GameState, tradeId: string): GameState | GameError {
    const offer = state.turn.activeTradeOffers.find((o) => o.id === tradeId);
    if (!offer) return { code: 'TRADE_NOT_FOUND', message: 'Trade offer not found' };

    const newOffers = state.turn.activeTradeOffers.map((o) =>
      o.id === tradeId ? { ...o, status: TradeOfferStatus.Withdrawn } : o
    );

    return {
      ...state,
      turn: { ...state.turn, activeTradeOffers: newOffers },
    };
  }

  static expireAllTrades(state: GameState): GameState {
    const newOffers = state.turn.activeTradeOffers.map((o) =>
      o.status === TradeOfferStatus.Pending ? { ...o, status: TradeOfferStatus.Expired } : o
    );

    return {
      ...state,
      turn: { ...state.turn, activeTradeOffers: newOffers },
    };
  }
}
