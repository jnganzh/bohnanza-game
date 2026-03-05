import type { GameState, PlayerState, BeanField, BeanCard, BeanType } from '@bohnanza/shared';
import { GamePhase, calculateGoldEarned, BEAN_VARIETIES } from '@bohnanza/shared';

export interface PlantDecision {
  action: 'plant';
  fieldIndex: number;
}

export interface SkipDecision {
  action: 'skip-second-plant';
}

export interface HarvestDecision {
  action: 'harvest';
  fieldIndex: number;
}

export interface KeepCardDecision {
  action: 'keep-face-up-card';
  cardId: string;
}

export interface EndTradingDecision {
  action: 'end-trading';
}

export interface PlantPendingDecision {
  action: 'plant-pending';
  cardId: string;
  fieldIndex: number;
}

export interface BuyThirdFieldDecision {
  action: 'buy-third-field';
}

export interface DonateFaceUpDecision {
  action: 'donate-face-up';
  cardIds: string[];
}

export type BotDecision =
  | PlantDecision
  | SkipDecision
  | HarvestDecision
  | KeepCardDecision
  | EndTradingDecision
  | PlantPendingDecision
  | BuyThirdFieldDecision
  | DonateFaceUpDecision;

export class BotStrategy {
  /**
   * Returns a sequence of decisions for the bot to execute in order.
   */
  static decide(state: GameState, botId: string): BotDecision[] {
    const player = state.players.find((p) => p.id === botId);
    if (!player) return [];

    const phase = state.turn.phase;
    const isActive = state.turn.activePlayerId === botId;

    switch (phase) {
      case GamePhase.PlantFromHand:
        if (isActive) return BotStrategy.decidePlantFromHand(state, player);
        return [];

      case GamePhase.DrawAndTrade:
        if (isActive) return BotStrategy.decideDrawAndTradeActive(state, player);
        return [];

      case GamePhase.PlantTradedBeans:
        return BotStrategy.decidePlantPending(state, player);

      default:
        return [];
    }
  }

  private static decidePlantFromHand(state: GameState, player: PlayerState): BotDecision[] {
    const decisions: BotDecision[] = [];

    if (player.hand.length === 0) return [];

    // Must plant first card
    const firstCard = player.hand[0];
    const fieldIdx = BotStrategy.bestFieldForBean(player, firstCard.type);

    if (fieldIdx === -1) {
      // Need to harvest first
      const harvestIdx = BotStrategy.leastValuableField(player);
      if (harvestIdx !== -1) {
        decisions.push({ action: 'harvest', fieldIndex: harvestIdx });
      }
      // After harvest, pick newly empty field
      decisions.push({ action: 'plant', fieldIndex: BotStrategy.bestFieldForBeanAfterHarvest(player, firstCard.type, harvestIdx) });
    } else {
      decisions.push({ action: 'plant', fieldIndex: fieldIdx });
    }

    // Consider second card
    if (player.hand.length >= 2) {
      const secondCard = player.hand[1];
      // Only plant second if it matches a field (after first plant)
      const matchesField = player.fields.some(
        (f) => f.beanType === secondCard.type
      );
      const hasEmpty = player.fields.some((f) => f.beanType === null);

      if (matchesField) {
        const idx = player.fields.findIndex((f) => f.beanType === secondCard.type);
        decisions.push({ action: 'plant', fieldIndex: idx });
      } else if (hasEmpty) {
        // Plant on empty if we have room
        const emptyIdx = player.fields.findIndex((f) => f.beanType === null);
        decisions.push({ action: 'plant', fieldIndex: emptyIdx });
      } else {
        decisions.push({ action: 'skip-second-plant' });
      }
    }

    // If we only added the first plant and hand had exactly 1 card, engine auto-advances
    // If we added first plant but not second, add skip
    if (decisions.filter(d => d.action === 'plant').length === 1 && player.hand.length >= 2) {
      // Check if we already have a skip or second plant
      const hasSecondAction = decisions.length > 1 || decisions.some(d => d.action === 'skip-second-plant');
      if (!hasSecondAction) {
        decisions.push({ action: 'skip-second-plant' });
      }
    }

    return decisions;
  }

  private static decideDrawAndTradeActive(state: GameState, player: PlayerState): BotDecision[] {
    const decisions: BotDecision[] = [];

    // Consider buying third field
    if (!player.hasThirdField && player.goldCoins >= 3 && player.fields.every(f => f.beanType !== null)) {
      decisions.push({ action: 'buy-third-field' });
    }

    // Keep face-up cards that match our fields
    const faceUpCards = state.turn.drawnFaceUpCards;
    const keptIds = new Set(state.turn.keptFaceUpCardIds);

    for (const card of faceUpCards) {
      if (keptIds.has(card.id)) continue;
      const matchesField = player.fields.some((f) => f.beanType === card.type);
      const hasEmpty = player.fields.some((f) => f.beanType === null);
      if (matchesField || hasEmpty) {
        decisions.push({ action: 'keep-face-up-card', cardId: card.id });
      }
    }

    // Donate face-up cards we don't want
    const unkeptCards = faceUpCards.filter(c => !keptIds.has(c.id) && !decisions.some(d => d.action === 'keep-face-up-card' && (d as KeepCardDecision).cardId === c.id));
    if (unkeptCards.length > 0) {
      decisions.push({ action: 'donate-face-up', cardIds: unkeptCards.map(c => c.id) });
    }

    // End trading
    decisions.push({ action: 'end-trading' });

    return decisions;
  }

  private static decidePlantPending(state: GameState, player: PlayerState): BotDecision[] {
    const decisions: BotDecision[] = [];

    if (player.pendingPlanting.length === 0) return [];

    // Consider buying third field before planting
    if (!player.hasThirdField && player.goldCoins >= 3 && player.fields.every(f => f.beanType !== null)) {
      decisions.push({ action: 'buy-third-field' });
    }

    // Build a simulated fields state to make good sequential decisions
    const simFields = player.fields.map(f => ({ beanType: f.beanType, count: f.cards.length }));

    for (const card of player.pendingPlanting) {
      // Find matching field
      let fieldIdx = simFields.findIndex(f => f.beanType === card.type);
      if (fieldIdx === -1) {
        // Find empty field
        fieldIdx = simFields.findIndex(f => f.beanType === null);
      }
      if (fieldIdx === -1) {
        // Must harvest — pick least valuable
        const harvestIdx = BotStrategy.leastValuableFieldSim(simFields, player.fields);
        if (harvestIdx !== -1) {
          decisions.push({ action: 'harvest', fieldIndex: harvestIdx });
          simFields[harvestIdx] = { beanType: null, count: 0 };
          fieldIdx = harvestIdx;
        } else {
          fieldIdx = 0; // fallback
          decisions.push({ action: 'harvest', fieldIndex: 0 });
          simFields[0] = { beanType: null, count: 0 };
        }
      }

      decisions.push({ action: 'plant-pending', cardId: card.id, fieldIndex: fieldIdx });
      simFields[fieldIdx] = { beanType: card.type, count: simFields[fieldIdx].count + 1 };
    }

    return decisions;
  }

  static bestFieldForBean(player: PlayerState, beanType: BeanType): number {
    // Prefer matching field
    const matchIdx = player.fields.findIndex((f) => f.beanType === beanType);
    if (matchIdx !== -1) return matchIdx;

    // Then empty field
    const emptyIdx = player.fields.findIndex((f) => f.beanType === null);
    if (emptyIdx !== -1) return emptyIdx;

    return -1; // No valid field
  }

  private static bestFieldForBeanAfterHarvest(player: PlayerState, beanType: BeanType, harvestedIdx: number): number {
    // After harvesting, that field is empty
    const matchIdx = player.fields.findIndex((f, i) => i !== harvestedIdx && f.beanType === beanType);
    if (matchIdx !== -1) return matchIdx;
    return harvestedIdx;
  }

  static leastValuableField(player: PlayerState): number {
    let bestIdx = -1;
    let bestScore = Infinity;

    for (let i = 0; i < player.fields.length; i++) {
      const field = player.fields[i];
      if (field.cards.length === 0) continue;

      const gold = calculateGoldEarned(field.beanType!, field.cards.length);
      // Score: gold earned now + potential. Lower = less valuable = better to harvest
      const score = gold * 10 + field.cards.length;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestIdx;
  }

  private static leastValuableFieldSim(
    simFields: { beanType: BeanType | null; count: number }[],
    realFields: BeanField[]
  ): number {
    let bestIdx = -1;
    let bestScore = Infinity;

    for (let i = 0; i < simFields.length; i++) {
      const sf = simFields[i];
      if (sf.beanType === null || sf.count === 0) continue;

      // Check single-card harvest rule: can only harvest 1-card field if all are 1-card
      if (sf.count === 1) {
        const nonEmpty = simFields.filter(f => f.count > 0);
        const allSingles = nonEmpty.every(f => f.count === 1);
        if (!allSingles) continue;
      }

      const gold = calculateGoldEarned(sf.beanType, sf.count);
      const score = gold * 10 + sf.count;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestIdx;
  }
}
