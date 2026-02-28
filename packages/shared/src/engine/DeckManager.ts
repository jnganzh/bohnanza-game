import { BeanType } from '../types/beans.js';
import type { BeanCard } from '../types/beans.js';
import type { GameState } from '../types/game.js';
import { BEAN_VARIETIES } from '../constants/beans.js';

export class DeckManager {
  static createDeck(): BeanCard[] {
    const deck: BeanCard[] = [];
    let idCounter = 0;

    for (const variety of Object.values(BEAN_VARIETIES)) {
      for (let i = 0; i < variety.totalCards; i++) {
        deck.push({
          id: `${variety.type}-${idCounter++}`,
          type: variety.type,
        });
      }
    }

    return deck;
  }

  static shuffle(cards: BeanCard[]): BeanCard[] {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static drawCards(
    state: GameState,
    count: number
  ): { state: GameState; cards: BeanCard[] } {
    let newState = { ...state, deck: [...state.deck], discardPile: [...state.discardPile] };
    const drawn: BeanCard[] = [];

    for (let i = 0; i < count; i++) {
      if (newState.deck.length === 0) {
        newState = {
          ...newState,
          deckExhaustionCount: newState.deckExhaustionCount + 1,
        };

        if (newState.deckExhaustionCount >= 3) {
          return { state: newState, cards: drawn };
        }

        newState = DeckManager.reshuffleDeck(newState);
      }

      if (newState.deck.length > 0) {
        drawn.push(newState.deck[0]);
        newState = { ...newState, deck: newState.deck.slice(1) };
      }
    }

    return { state: newState, cards: drawn };
  }

  static reshuffleDeck(state: GameState): GameState {
    const newDeck = DeckManager.shuffle([...state.discardPile]);
    return {
      ...state,
      deck: newDeck,
      discardPile: [],
    };
  }
}
