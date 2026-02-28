import { BeanType } from '../types/beans.js';
import type { BeanVariety } from '../types/beans.js';

export const BEAN_VARIETIES: Record<BeanType, BeanVariety> = {
  [BeanType.Blue]: {
    type: BeanType.Blue,
    totalCards: 20,
    displayName: 'Blue Bean',
    color: '#4A90D9',
    beanometer: [
      { cardCount: 4, goldCoins: 1 },
      { cardCount: 6, goldCoins: 2 },
      { cardCount: 8, goldCoins: 3 },
      { cardCount: 10, goldCoins: 4 },
    ],
  },
  [BeanType.Chili]: {
    type: BeanType.Chili,
    totalCards: 18,
    displayName: 'Chili Bean',
    color: '#E74C3C',
    beanometer: [
      { cardCount: 3, goldCoins: 1 },
      { cardCount: 6, goldCoins: 2 },
      { cardCount: 8, goldCoins: 3 },
      { cardCount: 9, goldCoins: 4 },
    ],
  },
  [BeanType.Stink]: {
    type: BeanType.Stink,
    totalCards: 16,
    displayName: 'Stink Bean',
    color: '#8B6914',
    beanometer: [
      { cardCount: 3, goldCoins: 1 },
      { cardCount: 5, goldCoins: 2 },
      { cardCount: 7, goldCoins: 3 },
      { cardCount: 8, goldCoins: 4 },
    ],
  },
  [BeanType.Green]: {
    type: BeanType.Green,
    totalCards: 14,
    displayName: 'Green Bean',
    color: '#27AE60',
    beanometer: [
      { cardCount: 3, goldCoins: 1 },
      { cardCount: 5, goldCoins: 2 },
      { cardCount: 6, goldCoins: 3 },
      { cardCount: 7, goldCoins: 4 },
    ],
  },
  [BeanType.Soy]: {
    type: BeanType.Soy,
    totalCards: 12,
    displayName: 'Soy Bean',
    color: '#F1C40F',
    beanometer: [
      { cardCount: 2, goldCoins: 1 },
      { cardCount: 4, goldCoins: 2 },
      { cardCount: 6, goldCoins: 3 },
      { cardCount: 7, goldCoins: 4 },
    ],
  },
  [BeanType.BlackEyed]: {
    type: BeanType.BlackEyed,
    totalCards: 10,
    displayName: 'Black-eyed Bean',
    color: '#2C3E50',
    beanometer: [
      { cardCount: 2, goldCoins: 1 },
      { cardCount: 4, goldCoins: 2 },
      { cardCount: 5, goldCoins: 3 },
      { cardCount: 6, goldCoins: 4 },
    ],
  },
  [BeanType.Red]: {
    type: BeanType.Red,
    totalCards: 8,
    displayName: 'Red Bean',
    color: '#C0392B',
    beanometer: [
      { cardCount: 2, goldCoins: 1 },
      { cardCount: 3, goldCoins: 2 },
      { cardCount: 4, goldCoins: 3 },
      { cardCount: 5, goldCoins: 4 },
    ],
  },
  [BeanType.Garden]: {
    type: BeanType.Garden,
    totalCards: 6,
    displayName: 'Garden Bean',
    color: '#9B59B6',
    beanometer: [
      { cardCount: 2, goldCoins: 2 },
      { cardCount: 3, goldCoins: 3 },
    ],
  },
};
