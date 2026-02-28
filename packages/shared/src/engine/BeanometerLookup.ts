import type { BeanType } from '../types/beans.js';
import { BEAN_VARIETIES } from '../constants/beans.js';

export function calculateGoldEarned(beanType: BeanType, cardCount: number): number {
  const variety = BEAN_VARIETIES[beanType];
  let gold = 0;
  for (const tier of variety.beanometer) {
    if (cardCount >= tier.cardCount) {
      gold = tier.goldCoins;
    } else {
      break;
    }
  }
  return gold;
}
