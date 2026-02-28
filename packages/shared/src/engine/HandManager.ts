import type { BeanCard, BeanType } from '../types/beans.js';

export class HandManager {
  static removeFromFront(hand: BeanCard[]): { card: BeanCard; hand: BeanCard[] } | null {
    if (hand.length === 0) return null;
    return { card: hand[0], hand: hand.slice(1) };
  }

  static appendToBack(hand: BeanCard[], cards: BeanCard[]): BeanCard[] {
    return [...hand, ...cards];
  }

  static removeByType(hand: BeanCard[], beanType: BeanType): { card: BeanCard; hand: BeanCard[] } | null {
    const index = hand.findIndex((c) => c.type === beanType);
    if (index === -1) return null;
    const card = hand[index];
    const newHand = [...hand.slice(0, index), ...hand.slice(index + 1)];
    return { card, hand: newHand };
  }

  static removeById(hand: BeanCard[], cardId: string): { card: BeanCard; hand: BeanCard[] } | null {
    const index = hand.findIndex((c) => c.id === cardId);
    if (index === -1) return null;
    const card = hand[index];
    const newHand = [...hand.slice(0, index), ...hand.slice(index + 1)];
    return { card, hand: newHand };
  }

  static hasType(hand: BeanCard[], beanType: BeanType): boolean {
    return hand.some((c) => c.type === beanType);
  }

  static countType(hand: BeanCard[], beanType: BeanType): number {
    return hand.filter((c) => c.type === beanType).length;
  }
}
