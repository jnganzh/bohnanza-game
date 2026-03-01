import type { GameState } from '../types/game.js';
import { GamePhase } from '../types/game.js';
import type { TradeOffer } from '../types/trade.js';
import { TradeOfferType } from '../types/trade.js';
import { FieldManager } from './FieldManager.js';
import { HandManager } from './HandManager.js';

export function validatePlant(
  state: GameState,
  playerId: string,
  fieldIndex: number
): string | null {
  if (state.turn.phase !== GamePhase.PlantFromHand) {
    return 'Can only plant from hand during Phase 1';
  }
  if (state.turn.activePlayerId !== playerId) {
    return 'Not your turn';
  }
  if (state.turn.beansPlantedThisTurn >= 2) {
    return 'Already planted maximum beans this turn';
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 'Player not found';
  if (player.hand.length === 0) return 'No cards in hand';

  const cardToPlant = player.hand[0];
  const field = player.fields[fieldIndex];
  if (!field) return 'Invalid field index';

  if (!FieldManager.canPlantInField(field, cardToPlant.type)) {
    return 'Cannot plant this bean type in this field';
  }

  return null;
}

export function validateHarvest(
  state: GameState,
  playerId: string,
  fieldIndex: number
): string | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 'Player not found';

  const field = player.fields[fieldIndex];
  if (!field) return 'Invalid field index';
  if (field.cards.length === 0) return 'Field is empty';

  if (field.cards.length === 1) {
    const nonEmptyFields = player.fields.filter((f) => f.cards.length > 0);
    const allSingles = nonEmptyFields.every((f) => f.cards.length === 1);
    if (!allSingles) {
      return 'Cannot harvest a single-card field unless all fields have only 1 card';
    }
  }

  return null;
}

export function validateTrade(state: GameState, offer: TradeOffer): string | null {
  if (state.turn.phase !== GamePhase.DrawAndTrade) {
    return 'Trading only during Phase 2';
  }

  const activeId = state.turn.activePlayerId;
  if (offer.fromPlayerId !== activeId && offer.toPlayerId !== activeId) {
    return 'All trades must involve the active player';
  }

  if (offer.fromPlayerId !== activeId && offer.offering.fromFaceUp.length > 0) {
    return 'Non-active players cannot offer face-up cards';
  }

  const fromPlayer = state.players.find((p) => p.id === offer.fromPlayerId);
  if (!fromPlayer) return 'Offering player not found';

  // Verify offering player has the hand cards
  const handCopy = [...fromPlayer.hand];
  for (const beanType of offer.offering.fromHand) {
    const idx = handCopy.findIndex((c) => c.type === beanType);
    if (idx === -1) return 'Offering player does not have the offered hand cards';
    handCopy.splice(idx, 1);
  }

  // Verify face-up cards exist and are not already kept
  for (const cardId of offer.offering.fromFaceUp) {
    const exists = state.turn.drawnFaceUpCards.some((c) => c.id === cardId);
    if (!exists) return 'Face-up card not found';
    if (state.turn.keptFaceUpCardIds.includes(cardId)) {
      return 'Face-up card has already been kept';
    }
  }

  // For trades (not donations), verify the target has the requested cards
  if (offer.type === TradeOfferType.Trade && offer.toPlayerId) {
    const toPlayer = state.players.find((p) => p.id === offer.toPlayerId);
    if (!toPlayer) return 'Target player not found';

    const toHandCopy = [...toPlayer.hand];
    for (const beanType of offer.requesting.fromHand) {
      const idx = toHandCopy.findIndex((c) => c.type === beanType);
      if (idx === -1) return 'Target player does not have the requested cards';
      toHandCopy.splice(idx, 1);
    }
  }

  return null;
}

export function validateBuyThirdField(
  state: GameState,
  playerId: string
): string | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 'Player not found';
  if (player.hasThirdField) return 'Already has a third field';
  if (player.goldCoins < 3) return 'Not enough gold coins (need 3)';
  return null;
}

export function validatePlantPending(
  state: GameState,
  playerId: string,
  cardId: string,
  fieldIndex: number
): string | null {
  if (state.turn.phase !== GamePhase.PlantTradedBeans) {
    return 'Can only plant pending beans during Phase 3';
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 'Player not found';

  const card = player.pendingPlanting.find((c) => c.id === cardId);
  if (!card) return 'Card not found in pending planting';

  const field = player.fields[fieldIndex];
  if (!field) return 'Invalid field index';

  if (!FieldManager.canPlantInField(field, card.type)) {
    return 'Cannot plant this bean type in this field';
  }

  return null;
}
