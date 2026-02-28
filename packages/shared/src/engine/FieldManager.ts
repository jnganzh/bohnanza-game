import type { BeanCard, BeanType } from '../types/beans.js';
import type { PlayerState, BeanField } from '../types/player.js';
import { calculateGoldEarned } from './BeanometerLookup.js';

export class FieldManager {
  static plantBean(player: PlayerState, card: BeanCard, fieldIndex: number): PlayerState | string {
    const fields = player.fields.map((f) => ({ ...f, cards: [...f.cards] }));
    const field = fields[fieldIndex];

    if (!field) {
      return 'Invalid field index';
    }

    if (field.beanType !== null && field.beanType !== card.type) {
      return 'Field already has a different bean type';
    }

    field.beanType = card.type;
    field.cards.push(card);

    return { ...player, fields };
  }

  static harvestField(
    player: PlayerState,
    fieldIndex: number
  ): { player: PlayerState; discarded: BeanCard[] } | string {
    const field = player.fields[fieldIndex];
    if (!field) {
      return 'Invalid field index';
    }
    if (field.cards.length === 0) {
      return 'Field is empty';
    }

    if (field.cards.length === 1) {
      const nonEmptyFields = player.fields.filter((f) => f.cards.length > 0);
      const allSingles = nonEmptyFields.every((f) => f.cards.length === 1);
      if (!allSingles) {
        return 'Cannot harvest a single-card field unless all fields have only 1 card';
      }
    }

    const cardCount = field.cards.length;
    const beanType = field.beanType!;
    const goldEarned = calculateGoldEarned(beanType, cardCount);

    const cardsToConvert = field.cards.slice(0, goldEarned);
    const cardsToDiscard = field.cards.slice(goldEarned);

    const newFields = player.fields.map((f, i) => {
      if (i === fieldIndex) {
        return { beanType: null, cards: [] };
      }
      return { ...f, cards: [...f.cards] };
    });

    const newPlayer: PlayerState = {
      ...player,
      fields: newFields,
      goldCoins: player.goldCoins + goldEarned,
      goldCoinCards: [...player.goldCoinCards, ...cardsToConvert],
    };

    return { player: newPlayer, discarded: cardsToDiscard };
  }

  static canPlantInField(field: BeanField, beanType: BeanType): boolean {
    return field.beanType === null || field.beanType === beanType;
  }

  static hasValidFieldForBean(player: PlayerState, beanType: BeanType): boolean {
    return player.fields.some((f) => FieldManager.canPlantInField(f, beanType));
  }
}
